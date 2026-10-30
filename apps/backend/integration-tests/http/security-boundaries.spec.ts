import { dirname, join } from "node:path"
import FormData from "form-data"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow, createUsersWorkflow, generateResetPasswordTokenWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { bindSecuritySession } from "../../src/lib/security-session"

const createSuperAdminRole = require(join(dirname(require.resolve("@medusajs/medusa")), "migration-scripts/create-super-admin-role")).default
const password = "security-boundary-password"
const anyStatus = { validateStatus: () => true }
jest.setTimeout(240000)

medusaIntegrationTestRunner({ testSuite: ({ api, getContainer }) => {
  describe("security: native account and resource boundaries", () => {
    let key: string, token: string, customer: { id: string, email: string }
    const bearer = (value: string) => ({ headers: { authorization: `Bearer ${value}` }, ...anyStatus })
    const store = (value?: string) => ({ headers: { "x-publishable-api-key": key, ...(value ? { authorization: `Bearer ${value}` } : {}) }, ...anyStatus })
    const register = (email: string) => api.post("/store/auth/register", { email, password, first_name: "Dummy", last_name: "Buyer" }, store())
    beforeEach(async () => {
      const container = getContainer()
      await setupEgyptStore(container)
      for (const purpose of ["registration-attempts", "login-attempts", "reset-requests"]) await container.resolve(Modules.CACHE).invalidate(`${purpose}:*`)
      const { data: [publishable] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
      key = publishable.token as string
      const result = await register("boundary-buyer@example.test")
      expect(result.status).toBe(201)
      token = result.data.token; customer = result.data.customer
    })
    async function admin() {
      const container = getContainer()
      const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email: "boundary-admin@example.test" }] } })
      const auth = container.resolve(Modules.AUTH), registered = await auth.register("emailpass", { body: { email: user.email, password } })
      await auth.updateAuthIdentities({ id: registered.authIdentity!.id, app_metadata: { user_id: user.id } })
      await createSuperAdminRole({ container })
      const result = await api.post("/auth/user/emailpass", { email: user.email, password }, anyStatus)
      expect(result.status).toBe(200)
      return result.data.token as string
    }

    it("blocks alternate login actors/encoding and parallel customer-creation doors", async () => {
      for (let i = 0; i < 5; i++) expect((await api.post("/auth/customer/emailpass", { email: customer.email, password: "wrong" }, anyStatus)).status).toBe(401)
      expect((await api.post("/auth/customer/emailpass", { email: customer.email, password }, anyStatus)).status).toBe(429)
      for (const actor of ["probe", "%63ustomer"]) expect((await api.post(`/auth/${actor}/emailpass`, { email: customer.email, password }, anyStatus)).status).toBe(400)
      expect((await api.post("/auth/customer/emailpass/register", { email: "blocked@example.test", password }, anyStatus)).status).toBe(400)
      const container = getContainer(), registered = await container.resolve(Modules.AUTH).register("emailpass", { body: { email: "unbound@example.test", password } })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const unbound = generateJwtToken({ actor_id: "", actor_type: "customer", auth_identity_id: registered.authIdentity!.id, auth_provider: "emailpass", app_metadata: registered.authIdentity!.app_metadata }, { secret: http.jwtSecret, expiresIn: "1h" })
      const blocked = await api.post("/store/customers", { email: "different@example.test" }, store(await bindSecuritySession(container, unbound)))
      expect(blocked.status).toBe(400)
      expect(blocked.data.message).toContain("/store/auth/register")
      expect(await getContainer().resolve(Modules.CUSTOMER).listCustomers({ email: "different@example.test" })).toHaveLength(0)
    })

    it("revokes one device and rejects all old tokens/refreshes after native password reset", async () => {
      const other = await api.post("/auth/customer/emailpass", { email: customer.email, password }, anyStatus)
      expect(other.status).toBe(200)
      const refreshed = await api.post("/auth/token/refresh", {}, bearer(token))
      expect(refreshed.status).toBe(200)
      expect((await api.post("/auth/logout", {}, bearer(token))).status).toBe(200)
      expect((await api.get("/store/customers/me", store(token))).status).toBe(401)
      expect((await api.get("/store/customers/me", store(refreshed.data.token))).status).toBe(401)
      expect((await api.post("/auth/token/refresh", {}, bearer(token))).status).toBe(401)
      expect((await api.get("/store/customers/me", store(other.data.token))).status).toBe(200)
      const container = getContainer(), { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const notifications = jest.spyOn(container.resolve(Modules.NOTIFICATION), "createNotifications")
      let emailToken: string
      try {
        expect((await api.post("/store/customers/me/email", { email: "replacement@example.test", password }, store(other.data.token))).status).toBe(200)
        const sent = notifications.mock.calls[0][0] as unknown as { template: string, content: { text: string } }[]
        emailToken = decodeURIComponent(/token=(\S+)/.exec(sent.find(message => message.template === "email-change-confirm")!.content.text)![1])
      } finally { notifications.mockRestore() }
      const { result: reset } = await generateResetPasswordTokenWorkflow(container).run({ input: { entityId: customer.email, actorType: "customer", provider: "emailpass", secret: http.jwtSecret as string } })
      expect((await api.post("/auth/customer/emailpass/update", { password: "replacement-security-password" }, bearer(reset))).status).toBe(200)
      expect((await api.get("/store/customers/me", store(other.data.token))).status).toBe(401)
      expect((await api.post("/auth/token/refresh", {}, bearer(other.data.token))).status).toBe(401)
      expect((await api.post("/store/email-change/confirm", { token: emailToken }, store())).status).toBe(400)
      const fresh = await api.post("/auth/customer/emailpass", { email: customer.email, password: "replacement-security-password" }, anyStatus)
      expect(fresh.status).toBe(200)
      expect((await api.post("/store/customers/me/password", { current_password: "replacement-security-password", new_password: "next-security-password" }, store(fresh.data.token))).status).toBe(200)
      expect((await api.get("/store/customers/me", store(fresh.data.token))).status).toBe(401)
      expect((await api.post("/auth/token/refresh", {}, bearer(fresh.data.token))).status).toBe(401)
    })

    it("rotates a planted session on staff login and rejects forged cookie mutations", async () => {
      const first = await api.post("/auth/session", {}, bearer(token))
      expect(first.status).toBe(200)
      const cookie = first.headers["set-cookie"][0].split(";")[0]
      const staff = await admin()
      const second = await api.post("/auth/session", {}, { headers: { authorization: `Bearer ${staff}`, cookie }, ...anyStatus })
      expect(second.status).toBe(200)
      const current = second.headers["set-cookie"][0].split(";")[0]
      expect(current).not.toBe(cookie)
      expect((await api.get("/admin/users/me", { headers: { cookie }, ...anyStatus })).status).toBe(401)
      expect((await api.get("/admin/users/me", { headers: { cookie: current }, ...anyStatus })).status).toBe(200)
      const mutation = (origin: string) => api.post("/admin/brands", "name=Dummy&slug=dummy", { headers: { cookie: current, origin, "content-type": "application/x-www-form-urlencoded" }, ...anyStatus })
      expect((await mutation("https://untrusted.example")).status).toBe(403)
      expect((await mutation(new URL(api.defaults.baseURL!).origin)).status).toBe(201)
    })

    it("rejects active uploads/presigned bypass and serves sniffed raster content", async () => {
      const staff = await admin()
      const upload = (content: Buffer, name: string, type: string) => {
        const data = new FormData(); data.append("files", content, { filename: name, contentType: type })
        return api.post("/admin/uploads", data, { headers: { ...data.getHeaders(), authorization: `Bearer ${staff}` }, ...anyStatus })
      }
      const active = await upload(Buffer.from("<html><script>dummy</script></html>"), "probe.html", "text/html")
      expect(active.status).toBe(400)
      expect(active.data.message).toContain("PNG")
      const presigned = await api.post("/admin/uploads/presigned-urls", { originalname: "probe.html", mime_type: "text/html", size: 32 }, bearer(staff))
      expect(presigned.status).toBe(400)
      expect(presigned.data.message).toContain("content validation")
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6K2AAAAAASUVORK5CYII=", "base64")
      const result = await upload(png, "misleading.html", "text/html")
      expect(result.status).toBe(200)
      expect(result.data.files[0].url).toMatch(/\.png$/)
      const file = await api.get(new URL(result.data.files[0].url).pathname, anyStatus)
      expect(file.status).toBe(200)
      expect(file.headers["content-type"]).toContain("image/png")
    })

    it("enforces cart ownership on case variants and projects public receipts", async () => {
      const container = getContainer(), query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [settings] } = await query.graph({ entity: "store", fields: ["default_region_id"] })
      const cart = await api.post("/store/carts", { region_id: settings.default_region_id }, store(token))
      expect(cart.status).toBe(200)
      expect(cart.data.cart.customer_id).toBe(customer.id)
      expect((await api.get(`/store/CARTS/${cart.data.cart.id}`, store())).status).toBe(403)
      expect((await api.get(`/store/carts/%63${cart.data.cart.id.slice(1)}`, store())).status).toBe(400)
      expect((await api.get(`/store/carts/${cart.data.cart.id}`, store(token))).status).toBe(200)
      const { result: order } = await createOrderWorkflow(container).run({ input: { region_id: settings.default_region_id as string, currency_code: "egp", customer_id: customer.id, email: customer.email, shipping_address: { first_name: "Private", last_name: "Buyer", address_1: "Private street", city: "Cairo", country_code: "eg", phone: "01000000000" }, items: [{ title: "Dummy item", quantity: 1, unit_price: 100, metadata: { private: "dummy-private-data" } }] } })
      const receipt = await api.get(`/store/orders/${order.id}?fields=email,*shipping_address,*items`, store())
      expect(receipt.status).toBe(200)
      expect(receipt.data.order.id).toBe(order.id)
      expect(receipt.data.order.email).toBeUndefined()
      expect(receipt.data.order.shipping_address).toBeUndefined()
      expect(receipt.data.order.items[0].metadata).toBeUndefined()
      const returnedItems = [{ id: order.items![0].id, quantity: 1 }]
      const returnBody = { order_id: order.id, items: returnedItems, return_shipping: { option_id: "so_dummy" } }
      expect((await api.post("/store/returns", returnBody, store())).status).toBe(401)
      expect((await api.post("/store/returns", { ...returnBody, receive_now: true }, store(token))).status).toBe(403)
      const other = await register("different-buyer@example.test")
      expect(other.status).toBe(201)
      expect((await api.post("/store/returns", returnBody, store(other.data.token))).status).toBe(403)
    })

    it("deletes the login of a legacy email-changed customer and allows registration again", async () => {
      const auth = getContainer().resolve(Modules.AUTH)
      const [provider] = await auth.listProviderIdentities({ provider: "emailpass", entity_id: customer.email }, { relations: ["auth_identity"] })
      await auth.updateAuthIdentities({ id: provider.auth_identity_id!, app_metadata: { ...provider.auth_identity!.app_metadata, email_changed_at: Date.now() - 1000 } })
      expect((await api.delete(`/admin/customers/${customer.id}`, bearer(await admin()))).status).toBe(200)
      expect(await auth.listProviderIdentities({ provider: "emailpass", entity_id: customer.email })).toHaveLength(0)
      expect((await api.get("/store/customers/me", store(token))).status).toBe(401)
      expect((await register(customer.email)).status).toBe(201)
    })

    it("bounds visitor registration work across custom and native staff routes", async () => {
      for (let i = 0; i < 9; i++) expect((await register(`bounded-${i}@example.test`)).status).toBe(201)
      expect((await register("bounded-over-budget@example.test")).status).toBe(429)
      expect((await api.post("/auth/user/emailpass/register", { email: "staff-over-budget@example.test", password }, anyStatus)).status).toBe(429)
    })
  })
} })
