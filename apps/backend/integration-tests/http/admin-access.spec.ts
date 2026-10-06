import { dirname, join } from "path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow, createRegionsWorkflow, createUsersWorkflow } from "@medusajs/medusa/core-flows"
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
        // Medusa deletes permissions no code defines every time the server
        // starts. Running that cleanup here proves the manager's permissions
        // survive a restart, not only the moment the setup script ran.
        // The method is not in Medusa's public types; it is what startup calls.
        await (container.resolve(Modules.RBAC) as unknown as { syncRegisteredPolicies(): Promise<void> }).syncRegisteredPolicies()
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

      it("lets a manager publish, unpublish, price and delete products", async () => {
        const created = await api.post("/admin/products", { title: "Manager product", status: "published", options: [{ title: "Size", values: ["Single"] }], variants: [{ title: "Single", options: { Size: "Single" }, prices: [{ amount: 100, currency_code: "egp" }] }] }, manager)
        expect(created.status).toBe(200)
        const product = created.data.product
        expect((await api.post(`/admin/products/${product.id}`, { status: "draft" }, manager)).status).toBe(200)
        const variant = product.variants[0]
        expect((await api.post(`/admin/products/${product.id}/variants/${variant.id}`, { prices: [{ amount: 150, currency_code: "egp" }] }, manager)).status).toBe(200)
        expect((await api.delete(`/admin/products/${product.id}`, manager)).status).toBe(200)
      })

      it("stops a manager from changing an existing variant's stock settings, but not from editing it", async () => {
        const { data } = await api.post("/admin/products", { title: "Stocked", status: "published", options: [{ title: "Size", values: ["Single"] }], variants: [{ title: "Single", options: { Size: "Single" }, manage_inventory: true, allow_backorder: false, prices: [{ amount: 100, currency_code: "egp" }] }] }, admin)
        const product = data.product
        const variant = product.variants[0]
        const path = `/admin/products/${product.id}/variants/${variant.id}`
        expect((await api.post(path, { manage_inventory: false }, manager)).status).toBe(403)
        expect((await api.post(path, { allow_backorder: true }, manager)).status).toBe(403)
        expect((await api.post(`/admin/products/${product.id}`, { variants: [{ id: variant.id, allow_backorder: true }] }, manager)).status).toBe(403)
        // The dashboard's edit form resends the unchanged values with every save.
        expect((await api.post(path, { title: "Single pack", manage_inventory: true, allow_backorder: false }, manager)).status).toBe(200)
        const stored = await getContainer().resolve(Modules.PRODUCT).retrieveProductVariant(variant.id)
        expect(stored.manage_inventory).toBe(true)
        expect(stored.allow_backorder).toBe(false)
        expect(stored.title).toBe("Single pack")
      })

      it("lets a manager see, update and cancel orders", async () => {
        const container = getContainer()
        const { result: [region] } = await createRegionsWorkflow(container).run({ input: { regions: [{ name: "Egypt", currency_code: "egp", countries: ["eg"] }] } })
        const { result: order } = await createOrderWorkflow(container).run({ input: { region_id: region.id, email: "buyer@test.dev", currency_code: "egp", items: [{ title: "Whey", quantity: 1, unit_price: 100 }] } })
        expect((await api.get("/admin/orders", manager)).status).toBe(200)
        expect((await api.get(`/admin/orders/${order.id}`, manager)).status).toBe(200)
        expect((await api.post(`/admin/orders/${order.id}`, { email: "buyer2@test.dev" }, manager)).status).toBe(200)
        expect((await api.post(`/admin/orders/${order.id}/cancel`, {}, manager)).status).toBe(200)
        const { data } = await api.get(`/admin/orders/${order.id}`, admin)
        expect(data.order.status).toBe("canceled")
      })

      it("lets a manager run customers, promotions and price lists", async () => {
        expect((await api.post("/admin/customers", { email: "shopper@test.dev", first_name: "Shop" }, manager)).status).toBe(200)
        for (const path of ["/admin/customers", "/admin/customer-groups", "/admin/promotions", "/admin/campaigns", "/admin/price-lists", "/admin/collections", "/admin/product-types", "/admin/product-tags"]) {
          expect({ path, status: (await api.get(path, manager)).status }).toEqual({ path, status: 200 })
        }
        expect((await api.post("/admin/product-types", { value: "Supplement" }, manager)).status).toBe(200)
        // Brand permissions are ours; they must survive Medusa's startup cleanup.
        expect((await api.post("/admin/brands", { name: "Optimum", slug: "optimum" }, manager)).status).toBe(201)
      })

      it("lets a manager see stock and store data but not change them", async () => {
        for (const path of ["/admin/inventory-items", "/admin/stores", "/admin/regions", "/admin/sales-channels", "/admin/stock-locations"]) {
          expect({ path, status: (await api.get(path, manager)).status }).toEqual({ path, status: 200 })
        }
        const { data } = await api.get("/admin/stores", admin)
        expect((await api.post(`/admin/stores/${data.stores[0].id}`, { name: "Renamed" }, manager)).status).toBe(403)
        expect((await api.post("/admin/regions", { name: "Elsewhere", currency_code: "usd" }, manager)).status).toBe(403)
        expect((await api.post("/admin/stock-locations", { name: "Warehouse" }, manager)).status).toBe(403)
        expect((await api.post("/admin/inventory-items", { sku: "NEW-SKU" }, manager)).status).toBe(403)
        expect((await api.post("/admin/tax-regions", { country_code: "eg" }, manager)).status).toBe(403)
      })

      it("keeps settings, staff, keys and workflows admin only", async () => {
        for (const path of ["/admin/api-keys", "/admin/users", "/admin/invites", "/admin/rbac/roles", "/admin/rbac/policies", "/admin/workflows-executions", "/admin/search?q=a", "/admin/custom"]) {
          expect({ path, status: (await api.get(path, manager)).status }).toEqual({ path, status: 403 })
        }
        expect((await api.post("/admin/invites", { email: "x@test.dev" }, manager)).status).toBe(403)
        expect((await api.post("/admin/api-keys", { title: "Mine", type: "secret" }, manager)).status).toBe(403)
      })

      it("hides admin-only settings pages from a manager's dashboard only", async () => {
        const hidden = (body: { default_configuration: { configuration: { widgets: Record<string, { hidden?: boolean }> } } | null }) =>
          Object.entries(body.default_configuration?.configuration.widgets ?? {}).filter(([, widget]) => widget.hidden).map(([id]) => id)
        const forManager = await api.get("/admin/layouts/settings.sidebar/configuration", manager)
        expect(forManager.status).toBe(200)
        expect(hidden(forManager.data)).toEqual(expect.arrayContaining(["core:settings-nav:/settings/store", "core:settings-nav:/settings/secret-api-keys"]))
        expect(hidden(forManager.data)).not.toContain("core:settings-nav:/settings/product-types")
        const forAdmin = await api.get("/admin/layouts/settings.sidebar/configuration", admin)
        expect(hidden(forAdmin.data)).toEqual([])
        expect((await api.post("/admin/layouts/settings.sidebar/configuration", { is_default: true, configuration: { widgets: {} } }, manager)).status).toBe(403)
      })
    })
  },
})
