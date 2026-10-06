import { dirname, join } from "path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createUsersWorkflow } from "@medusajs/medusa/core-flows"
import setupCatalogManager from "../../src/scripts/setup-catalog-manager"

// Medusa's own migration script that creates Super Admin and assigns it to every
// existing user; the test database does not run migration scripts by itself.
// The package does not export that path, so it is loaded by file location.
const medusaDist = dirname(require.resolve("@medusajs/medusa"))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createSuperAdminRole = require(join(medusaDist, "migration-scripts", "create-super-admin-role")).default

jest.setTimeout(240 * 1000)

const password = "test-password-123"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("admin access with real roles over HTTP", () => {
      type Session = { headers: { authorization: string }, validateStatus: () => boolean }
      let admin: Session
      let manager: Session
      let nobody: Session
      let managerUserId: string
      let managerRoleId: string

      async function createStaff(email: string) {
        const container = getContainer()
        const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email }] } })
        const auth = container.resolve(Modules.AUTH)
        const { authIdentity } = await auth.register("emailpass", { body: { email, password } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        return user
      }
      async function login(email: string): Promise<Session> {
        const { data } = await api.post("/auth/user/emailpass", { email, password })
        return { headers: { authorization: `Bearer ${data.token}` }, validateStatus: () => true }
      }
      const roleLink = (userId: string, roleId: string) => ({ [Modules.USER]: { user_id: userId }, [Modules.RBAC]: { rbac_role_id: roleId } })

      beforeEach(async () => {
        const container = getContainer()
        const adminUser = await createStaff("admin@test.dev")
        await createSuperAdminRole({ container })
        await setupCatalogManager({ container, args: [adminUser.id] } as never)
        const [role] = await container.resolve(Modules.RBAC).listRbacRoles({ name: "Catalog Manager" })
        managerRoleId = role.id
        const managerUser = await createStaff("manager@test.dev")
        managerUserId = managerUser.id
        await container.resolve(ContainerRegistrationKeys.LINK).create(roleLink(managerUserId, managerRoleId))
        await createStaff("nobody@test.dev")
        admin = await login("admin@test.dev")
        manager = await login("manager@test.dev")
        nobody = await login("nobody@test.dev")
      })

      async function publishedProduct() {
        const { data } = await api.post("/admin/products", { title: "Live product", status: "published", options: [{ title: "Size", values: ["Single"] }] }, admin)
        return data.product
      }

      it("gives the super admin full access", async () => {
        for (const path of ["/admin/products", "/admin/orders", "/admin/stores", "/admin/rbac/roles"]) {
          expect((await api.get(path, admin)).status).toBe(200)
        }
      })

      it("denies a staff user with no role on custom and native routes", async () => {
        expect((await api.post("/admin/brands", { name: "Sneaky", slug: "sneaky" }, nobody)).status).toBe(403)
        expect((await api.get("/admin/custom", nobody)).status).toBe(403)
        expect((await api.get("/admin/orders", nobody)).status).toBe(403)
        const brands = await getContainer().resolve("brand").listBrands({ slug: "sneaky" })
        expect(brands).toEqual([])
      })

      it("denies access as soon as the last role is revoked", async () => {
        expect((await api.get("/admin/products", manager)).status).toBe(200)
        await getContainer().resolve(ContainerRegistrationKeys.LINK).dismiss(roleLink(managerUserId, managerRoleId))
        expect((await api.get("/admin/products", manager)).status).toBe(403)
        expect((await api.post("/admin/brands", { name: "Late", slug: "late" }, manager)).status).toBe(403)
      })

      it("lets a catalog manager create a draft product", async () => {
        const response = await api.post("/admin/products", { title: "Manager draft", status: "draft", options: [{ title: "Size", values: ["Single"] }] }, manager)
        expect(response.status).toBe(200)
        expect(response.data.product.status).toBe("draft")
      })

      it("lets a catalog manager edit product content", async () => {
        const product = await publishedProduct()
        const response = await api.post(`/admin/products/${product.id}`, { description: "New copy" }, manager)
        expect(response.status).toBe(200)
        const { data } = await api.get(`/admin/products/${product.id}`, admin)
        expect(data.product.description).toBe("New copy")
        expect(data.product.status).toBe("published")
      })

      it("stops a catalog manager from unpublishing a live product", async () => {
        const product = await publishedProduct()
        expect((await api.post(`/admin/products/${product.id}`, { status: "draft" }, manager)).status).toBe(403)
        const { data } = await api.get(`/admin/products/${product.id}`, admin)
        expect(data.product.status).toBe("published")
      })

      it("stops a catalog manager from publishing a draft", async () => {
        // The draft is created by the admin so this test only depends on the publishing rule.
        const { data: created } = await api.post("/admin/products", { title: "Draft", status: "draft", options: [{ title: "Size", values: ["Single"] }] }, admin)
        expect(created.product.status).toBe("draft")
        expect((await api.post(`/admin/products/${created.product.id}`, { status: "published" }, manager)).status).toBe(403)
        const { data } = await api.get(`/admin/products/${created.product.id}`, admin)
        expect(data.product.status).toBe("draft")
        expect((await api.post("/admin/products", { title: "Live", status: "published", options: [{ title: "Size", values: ["Single"] }] }, manager)).status).toBe(403)
      })

      it("stops a catalog manager from switching off stock enforcement on a live variant", async () => {
        const { data } = await api.post("/admin/products", { title: "Stocked", status: "published", options: [{ title: "Size", values: ["Single"] }], variants: [{ title: "Single", options: { Size: "Single" }, manage_inventory: true, allow_backorder: false, prices: [{ amount: 100, currency_code: "egp" }] }] }, admin)
        const product = data.product
        const variant = product.variants[0]
        expect((await api.post(`/admin/products/${product.id}/variants/${variant.id}`, { manage_inventory: false }, manager)).status).toBe(403)
        expect((await api.post(`/admin/products/${product.id}/variants/${variant.id}`, { allow_backorder: true }, manager)).status).toBe(403)
        expect((await api.post(`/admin/products/${product.id}`, { variants: [{ id: variant.id, allow_backorder: true }] }, manager)).status).toBe(403)
        const stored = await getContainer().resolve(Modules.PRODUCT).retrieveProductVariant(variant.id)
        expect(stored.manage_inventory).toBe(true)
        expect(stored.allow_backorder).toBe(false)
      })

      it("stops a catalog manager from setting prices or reaching non-catalog areas", async () => {
        const withPrices = { title: "Priced", status: "draft", options: [{ title: "Size", values: ["Single"] }], variants: [{ title: "Single", options: { Size: "Single" }, prices: [{ amount: 100, currency_code: "egp" }] }] }
        expect((await api.post("/admin/products", withPrices, manager)).status).toBe(403)
        for (const path of ["/admin/orders", "/admin/customers", "/admin/inventory-items", "/admin/price-lists", "/admin/users"]) {
          expect((await api.get(path, manager)).status).toBe(403)
        }
      })
    })
  },
})
