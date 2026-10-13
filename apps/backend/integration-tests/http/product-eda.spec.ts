import { dirname, join } from "path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow, createUsersWorkflow, deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import setupCatalogManager from "../../src/scripts/setup-catalog-manager"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { EDA_MODULE } from "../../src/modules/eda"
import type EdaModuleService from "../../src/modules/eda/service"

const medusaDist = dirname(require.resolve("@medusajs/medusa"))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createSuperAdminRole = require(join(medusaDist, "migration-scripts", "create-super-admin-role")).default

jest.setTimeout(240 * 1000)

const password = "test-password-123"
const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` }, validateStatus: () => true })

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("EDA registration on products", () => {
      let admin: ReturnType<typeof bearer>
      let manager: ReturnType<typeof bearer>
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      let productId: string

      async function staff(email: string) {
        const container = getContainer()
        const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email }] } })
        const auth = container.resolve(Modules.AUTH)
        const { authIdentity } = await auth.register("emailpass", { body: { email, password } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        return user
      }
      const login = async (email: string) => bearer((await api.post("/auth/user/emailpass", { email, password })).data.token)

      beforeEach(async () => {
        const container = getContainer()
        await container.resolve(Modules.CACHE).invalidate("login-attempts:*")
        await setupEgyptStore(container)
        const adminUser = await staff("admin@test.dev")
        await createSuperAdminRole({ container })
        await setupCatalogManager({ container, args: [adminUser.id] } as never)
        await (container.resolve(Modules.RBAC) as unknown as { syncRegisteredPolicies(): Promise<void> }).syncRegisteredPolicies()
        const managerUser = await staff("manager@test.dev")
        const [role] = await container.resolve(Modules.RBAC).listRbacRoles({ name: "Catalog Manager" })
        await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.USER]: { user_id: managerUser.id }, [Modules.RBAC]: { rbac_role_id: role.id } })
        admin = await login("admin@test.dev")
        manager = await login("manager@test.dev")

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        storeApi = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
        const { result: [product] } = await createProductsWorkflow(container).run({
          input: { products: [{ title: "Whey", status: "published", sales_channels: [{ id: store.default_sales_channel_id as string }], options: [{ title: "Size", values: ["1kg"] }], variants: [{ title: "1kg", options: { Size: "1kg" }, prices: [{ amount: 1500, currency_code: "egp" }] }] }] },
        })
        productId = product.id
      })

      const eda = (session: ReturnType<typeof bearer>) => ({
        get: () => api.get(`/admin/products/${productId}/eda`, session),
        set: (body: unknown) => api.post(`/admin/products/${productId}/eda`, body, session),
        remove: () => api.delete(`/admin/products/${productId}/eda`, session),
      })
      const storeFields = "fields=id,title,eda_registration.registration_number,eda_registration.is_approved"

      it("starts empty, then saves and updates one registration per product", async () => {
        expect((await eda(admin).get()).data).toEqual({ eda_registration: null })
        const saved = await eda(admin).set({ registration_number: " 12345/2026 ", is_approved: false })
        expect(saved.status).toBe(200)
        expect(saved.data.eda_registration).toEqual(expect.objectContaining({ registration_number: "12345/2026", is_approved: false }))
        const updated = await eda(admin).set({ registration_number: "12345/2026", is_approved: true })
        expect(updated.data.eda_registration).toEqual(expect.objectContaining({ id: saved.data.eda_registration.id, is_approved: true }))
        const registrations = await getContainer().resolve<EdaModuleService>(EDA_MODULE).listEdaRegistrations()
        expect(registrations).toHaveLength(1)
      })

      it("lets a manager set the EDA registration", async () => {
        const response = await eda(manager).set({ registration_number: "777", is_approved: true })
        expect(response.status).toBe(200)
        expect((await eda(manager).get()).data.eda_registration).toEqual(expect.objectContaining({ registration_number: "777", is_approved: true }))
      })

      it.each([
        [{ registration_number: "123" }],
        [{ registration_number: "   ", is_approved: true }],
        [{ registration_number: "123", is_approved: "yes" }],
        [{ registration_number: "x".repeat(101), is_approved: true }],
        [{ registration_number: "123", is_approved: true, product_id: "prod_other" }],
      ])("rejects invalid input %j", async (body) => {
        expect((await eda(admin).set(body)).status).toBe(400)
        expect((await eda(admin).get()).data.eda_registration).toBeNull()
      })

      it("answers 404 for a product that does not exist", async () => {
        expect((await api.post("/admin/products/prod_missing/eda", { registration_number: "1", is_approved: true }, admin)).status).toBe(404)
        expect(await getContainer().resolve<EdaModuleService>(EDA_MODULE).listEdaRegistrations()).toEqual([])
      })

      it("removes the registration", async () => {
        await eda(admin).set({ registration_number: "123", is_approved: true })
        expect((await eda(admin).remove()).status).toBe(200)
        expect((await eda(admin).get()).data.eda_registration).toBeNull()
        expect((await eda(admin).remove()).status).toBe(200)
      })

      it("removes the registration when its product is deleted", async () => {
        await eda(admin).set({ registration_number: "123", is_approved: true })
        await deleteProductsWorkflow(getContainer()).run({ input: { ids: [productId] } })
        expect(await getContainer().resolve<EdaModuleService>(EDA_MODULE).listEdaRegistrations()).toEqual([])
      })

      it("shows customers the number and approval, and still sells unapproved products", async () => {
        await eda(admin).set({ registration_number: "555", is_approved: false })
        const one = await api.get(`/store/products/${productId}?${storeFields}`, storeApi)
        expect(one.status).toBe(200)
        // Medusa adds the record's id to any related fields it returns.
        expect(one.data.product.eda_registration).toEqual(expect.objectContaining({ registration_number: "555", is_approved: false }))
        const list = await api.get(`/store/products?${storeFields}`, storeApi)
        expect(list.data.products).toEqual([expect.objectContaining({ id: productId, eda_registration: expect.objectContaining({ registration_number: "555", is_approved: false }) })])
      })

      it("does not expose the registration's internal fields to customers", async () => {
        await eda(admin).set({ registration_number: "555", is_approved: true })
        const response = await api.get(`/store/products/${productId}?fields=eda_registration.id,eda_registration.created_at`, storeApi)
        // Medusa drops fields that are not allowed instead of refusing the request.
        expect(response.status).toBe(200)
        expect(response.data.product.eda_registration).toBeUndefined()
      })
    })
  },
})
