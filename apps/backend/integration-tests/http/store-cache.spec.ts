import { dirname, join } from "path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { BRAND_MODULE } from "../../src/modules/brand"
import type BrandModuleService from "../../src/modules/brand/service"
import { invalidateStoreCache } from "../../src/lib/store-cache"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"

// Same Super Admin setup as admin-access.spec.ts (the test database does not run migration scripts).
const medusaDist = dirname(require.resolve("@medusajs/medusa"))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createSuperAdminRole = require(join(medusaDist, "migration-scripts", "create-super-admin-role")).default

jest.setTimeout(240 * 1000)

// Tests use Medusa's in-memory cache (redis-config.ts is off under NODE_ENV=test);
// the middleware talks to the cache module the same way for either backend.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("cached store reads", () => {
      let store: { headers: Record<string, string>, validateStatus: () => boolean }
      let admin: { headers: { authorization: string }, validateStatus: () => boolean }

      beforeEach(async () => {
        const container = getContainer()
        // The database is reset between tests but the in-memory cache is not.
        await invalidateStoreCache(container)
        await setupEgyptStore(container)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        store = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }

        const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email: "admin@test.dev" }] } })
        const auth = container.resolve(Modules.AUTH)
        const { authIdentity } = await auth.register("emailpass", { body: { email: "admin@test.dev", password: "test-password-123" } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        await createSuperAdminRole({ container })
        const { data } = await api.post("/auth/user/emailpass", { email: "admin@test.dev", password: "test-password-123" })
        admin = { headers: { authorization: `Bearer ${data.token}` }, validateStatus: () => true }
      })

      it("serves the stored answer until an admin write clears it", async () => {
        expect((await api.get("/store/brands", store)).data.brands).toEqual([])

        // Written behind the cache's back, so only the stored answer can explain an empty list.
        await getContainer().resolve<BrandModuleService>(BRAND_MODULE)
          .createBrands([{ name: "Hidden", slug: "hidden" }])
        expect((await api.get("/store/brands", store)).data.brands).toEqual([])

        const created = await api.post("/admin/brands", { name: "Optimum", slug: "optimum" }, admin)
        expect(created.status).toBe(201)
        // The cache is cleared when the response finishes, which can be just after the client has it.
        await new Promise((resolve) => setTimeout(resolve, 200))
        const names = (await api.get("/store/brands", store)).data.brands.map((brand: { name: string }) => brand.name)
        expect(names).toEqual(expect.arrayContaining(["Hidden", "Optimum"]))
      })

      it("does not clear the cache when the admin write is refused", async () => {
        expect((await api.get("/store/brands", store)).data.brands).toEqual([])
        await getContainer().resolve<BrandModuleService>(BRAND_MODULE)
          .createBrands([{ name: "Hidden", slug: "hidden" }])
        const refused = await api.post("/admin/brands", { slug: "no-name" }, admin)
        expect(refused.status).toBe(400)
        await new Promise((resolve) => setTimeout(resolve, 200))
        expect((await api.get("/store/brands", store)).data.brands).toEqual([])
      })
    })
  },
})
