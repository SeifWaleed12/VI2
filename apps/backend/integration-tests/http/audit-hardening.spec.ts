import { dirname, join } from "node:path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow, createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { customerPoints, recordPoints, takeEarlierRefunds } from "../../src/lib/points"
import { readCatalogState } from "../../src/lib/catalog-ranking"
import { refreshCatalog } from "../../src/lib/catalog-ranking-refresh"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { expirePoints } from "../../src/jobs/expire-points"
import { LOYALTY_MODULE } from "../../src/modules/loyalty"
import type LoyaltyModuleService from "../../src/modules/loyalty/service"

const createSuperAdminRole = require(join(dirname(require.resolve("@medusajs/medusa")), "migration-scripts/create-super-admin-role")).default
jest.setTimeout(240000)
const deferred = () => {
  let release!: () => void
  return { promise: new Promise<void>(resolve => { release = resolve }), release: () => release() }
}

medusaIntegrationTestRunner({
  dbName: "vi2-audit-hardening-20261025", cwd: join(__dirname, "../.."),
  env: { RESEND_API_KEY: "", RESEND_FROM: "", REDIS_URL: "", NODE_ENV: "test" },
  testSuite: ({ getContainer, api }) => {
    beforeAll(async () => {
      for (let i = 0; i < 120; i++) {
        if ((await readCatalogState(getContainer()).catch(() => undefined))?.ready === 1) return
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      throw new Error("Native seed did not settle")
    })

    it("keeps the ledger nonnegative even when the outer lock allows overlapping writers", async () => {
      const container = getContainer()
      const service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
      const locking = container.resolve(Modules.LOCKING)
      const original = locking.execute.bind(locking)
      const spy = jest.spyOn(locking, "execute").mockImplementation((key, work, options) =>
        String(key).startsWith("points:") ? work(new AbortController().signal) : original(key, work, options))
      try {
        await service.createPointsEntries({ customer_id: "cus_race", kind: "earn", source_id: "ord_seed", points: 100 })
        const entered = deferred(), release = deferred()
        const first = recordPoints(container, { customer_id: "cus_race", kind: "refund", source_id: "ord_seed/refund_a" }, async () => { entered.release(); await release.promise; return -80 })
        await entered.promise
        const second = recordPoints(container, { customer_id: "cus_race", kind: "refund", source_id: "ord_seed/refund_b" }, () => -80)
        release.release()
        expect(await Promise.all([first, second])).toEqual([-80, -20])
        expect((await customerPoints(container, "cus_race")).balance).toBe(0)
        expect(await recordPoints(container, { customer_id: "cus_race", kind: "refund", source_id: "ord_seed/refund_b" }, () => -80)).toBe(0)
        expect(await service.listPointsEntries({ customer_id: "cus_race" })).toHaveLength(3)
      } finally { spy.mockRestore() }
    })

    it("rolls back a cancelled holder before a second distinct refund commits", async () => {
      const container = getContainer()
      const service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
      await service.createPointsEntries({ customer_id: "cus_abort", kind: "earn", source_id: "ord_abort", points: 100 })
      const controller = new AbortController(), entered = deferred(), release = deferred()
      const locking = container.resolve(Modules.LOCKING), original = locking.execute.bind(locking)
      let calls = 0
      const spy = jest.spyOn(locking, "execute").mockImplementation((key, work, options) =>
        String(key).startsWith("points:") ? work(++calls === 1 ? controller.signal : new AbortController().signal) : original(key, work, options))
      try {
        const first = recordPoints(container, { customer_id: "cus_abort", kind: "refund", source_id: "ord_abort/a" }, async () => { entered.release(); await release.promise; return -80 }).catch(error => error)
        await entered.promise
        const second = recordPoints(container, { customer_id: "cus_abort", kind: "refund", source_id: "ord_abort/b" }, () => -80)
        controller.abort(new Error("test lease loss"))
        release.release()
        expect(await first).toBeInstanceOf(Error)
        expect(await second).toBe(-80)
        expect((await customerPoints(container, "cus_abort")).balance).toBe(20)
        expect(await service.listPointsEntries({ customer_id: "cus_abort", source_id: "ord_abort/a" })).toHaveLength(0)
      } finally { spy.mockRestore() }
    })

    it("preserves independent admin fields and applies the owner's latest-save policy for one field", async () => {
      const container = getContainer()
      await setupEgyptStore(container)
      const { result: users } = await createUsersWorkflow(container).run({ input: { users: [{ email: "audit-a@example.invalid" }, { email: "audit-b@example.invalid" }] } })
      const auth = container.resolve(Modules.AUTH), options = [] as { headers: { authorization: string } }[]
      for (const user of users) {
        const { authIdentity } = await auth.register("emailpass", { body: { email: user.email, password: "audit-password-123" } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        const { data } = await api.post("/auth/user/emailpass", { email: user.email, password: "audit-password-123" })
        options.push({ headers: { authorization: `Bearer ${data.token}` } })
      }
      await createSuperAdminRole({ container })
      const { result: [product] } = await createProductsWorkflow(container).run({ input: { products: [{ title: "Before", description: "Before description", options: [{ title: "Size", values: ["One"] }], variants: [{ title: "One", options: { Size: "One" }, manage_inventory: false, prices: [{ amount: 100, currency_code: "egp" }] }] }] } })
      await Promise.all(options.map(option => api.get(`/admin/products/${product.id}`, option)))
      await Promise.all([
        api.post(`/admin/products/${product.id}`, { title: "Admin A" }, options[0]),
        api.post(`/admin/products/${product.id}`, { description: "Admin B description" }, options[1]),
      ])
      let result = await api.get(`/admin/products/${product.id}`, options[0])
      expect(result.data.product).toMatchObject({ title: "Admin A", description: "Admin B description" })
      await api.post(`/admin/products/${product.id}`, { title: "Admin B latest" }, options[1])
      result = await api.get(`/admin/products/${product.id}`, options[0])
      expect(result.data.product.title).toBe("Admin B latest")
      // A latest save is the last committed update, not necessarily last click.
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      expect((await query.graph({ entity: "product", fields: ["id", "title"], filters: { id: product.id } })).data[0].title).toBe("Admin B latest")
      await new Promise(resolve => setImmediate(resolve))
      await refreshCatalog(container, [product.id])
    })

    it("retries delivery when a refund marker is newer than its external snapshot", async () => {
      const container = getContainer()
      const service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
      await service.createPointsEntries({ customer_id: "cus_snapshot", kind: "refund", source_id: "order_snapshot/refund_a", points: 0 })
      const source = { customer_id: "cus_snapshot", kind: "earn" as const, source_id: "order_snapshot" }
      await expect(recordPoints(container, source, async context => 100 - await takeEarlierRefunds(container, source.customer_id, source.source_id, [], context))).rejects.toThrow("Refund state changed")
      expect((await customerPoints(container, source.customer_id)).balance).toBe(0)
      expect(await recordPoints(container, source, async context => 100 - await takeEarlierRefunds(container, source.customer_id, source.source_id, [{ id: "refund_a", amount: 80 }], context))).toBe(20)
      expect((await customerPoints(container, source.customer_id)).balance).toBe(20)
    })

    it("returns the full balance with only twenty history entries after more than one thousand changes", async () => {
      const container = getContainer()
      await setupEgyptStore(container)
      const customer = await container.resolve(Modules.CUSTOMER).createCustomers({ email: "history@example.invalid", has_account: true })
      const auth = container.resolve(Modules.AUTH)
      const { authIdentity } = await auth.register("emailpass", { body: { email: customer.email, password: "audit-password-123" } })
      await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { customer_id: customer.id } })
      const { data: login } = await api.post("/auth/customer/emailpass", { email: customer.email, password: "audit-password-123" })
      await container.resolve<LoyaltyModuleService>(LOYALTY_MODULE).createPointsEntries(Array.from({ length: 1001 }, (_, i) => ({ customer_id: customer.id, kind: "earn" as const, source_id: `order_history_${i}`, points: 1 })))
      const { data: [key] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
      const response = await api.get("/store/customers/me/points", { headers: { "x-publishable-api-key": key.token, authorization: `Bearer ${login.token}` } })
      expect(response.data.points.balance).toBe(1001)
      expect(response.data.points.history).toHaveLength(20)
    })

    it("scans expiry candidates in bounded customer pages", async () => {
      const container = getContainer(), service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
      await service.createPointsEntries(Array.from({ length: 501 }, (_, i) => ({ customer_id: `cus_page_${String(i).padStart(4, "0")}`, kind: "earn" as const, source_id: `order_page_${i}`, points: 1 })))
      const first = await service.customerPointPage("")
      expect(first).toHaveLength(500)
      expect(await service.customerPointPage(first[499].customer_id)).toHaveLength(1)
      const pages = jest.spyOn(service, "customerPointPage")
      try {
        expect(await expirePoints(container)).toBe(0)
        expect(pages).toHaveBeenCalledTimes(3)
      } finally { pages.mockRestore() }
    })

    it("completes a forty-read burst with explicit backpressure after creating a two-hundred-variant product", async () => {
      const container = getContainer()
      await setupEgyptStore(container)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [store] } = await query.graph({ entity: "store", fields: ["default_region_id", "default_sales_channel_id"] })
      const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
      const channelId = store.default_sales_channel_id
      if (!channelId) throw new Error("Audit fixture requires the initialized sales channel")
      const { result: [product] } = await createProductsWorkflow(container).run({ input: { products: [{ title: "Audit variant load", status: "published", sales_channels: [{ id: channelId }],
        options: [{ title: "Size", values: Array.from({ length: 200 }, (_, i) => String(i)) }],
        variants: Array.from({ length: 200 }, (_, i) => ({ title: String(i), options: { Size: String(i) }, manage_inventory: false, prices: [{ amount: 100, currency_code: "egp" }] })),
      }] } })
      await container.resolve(Modules.CACHE).invalidate("store-cache:*")
      const started = Date.now()
      const responses = await Promise.all(Array.from({ length: 40 }, () => api.get(`/store/products?limit=24&region_id=${store.default_region_id}`, {
        headers: { "x-publishable-api-key": key.token }, timeout: 15000, validateStatus: () => true,
      }).catch((error: { code?: string }) => ({ status: error.code ?? "error" }))))
      const statuses: Record<string, number> = {}
      for (const response of responses) statuses[String(response.status)] = (statuses[String(response.status)] ?? 0) + 1
      console.info("Audit HTTP burst", { requests: 40, variants: 200, statuses, elapsedMs: Date.now() - started })
      expect(responses.every(response => response.status === 200 || response.status === 503)).toBe(true)
      expect(statuses["200"]).toBeGreaterThan(0)
      await new Promise(resolve => setImmediate(resolve))
      await refreshCatalog(container, [product.id])
    })
  },
})
