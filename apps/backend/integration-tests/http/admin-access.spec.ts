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

      it("stops a manager from reserving or releasing stock by hand, but lets them export it", async () => {
        const container = getContainer()
        const { data: { stock_location: location } } = await api.post("/admin/stock-locations", { name: "Warehouse" }, admin)
        const { data: { inventory_item: item } } = await api.post("/admin/inventory-items", { sku: "WHEY-1KG" }, admin)
        await api.post(`/admin/inventory-items/${item.id}/location-levels`, { location_id: location.id, stocked_quantity: 10 }, admin)
        const { data: { reservation } } = await api.post("/admin/reservations", { inventory_item_id: item.id, location_id: location.id, quantity: 2 }, admin)
        expect((await api.post("/admin/reservations", { inventory_item_id: item.id, location_id: location.id, quantity: 7 }, manager)).status).toBe(403)
        expect((await api.post(`/admin/reservations/${reservation.id}`, { quantity: 9 }, manager)).status).toBe(403)
        expect((await api.delete(`/admin/reservations/${reservation.id}`, manager)).status).toBe(403)
        expect((await api.get("/admin/reservations", manager)).status).toBe(200)
        const [level] = await container.resolve(Modules.INVENTORY).listInventoryLevels({ inventory_item_id: item.id })
        expect(level.reserved_quantity).toBe(2)
        expect((await api.post("/admin/inventory-items/export", {}, manager)).status).toBe(202)
      })

      it("lets a manager allocate stock to an order line, but never more than it needs", async () => {
        const container = getContainer()
        const { data: { stock_location: location } } = await api.post("/admin/stock-locations", { name: "Warehouse" }, admin)
        const { data: { product } } = await api.post("/admin/products", { title: "Whey", status: "published", options: [{ title: "Size", values: ["1kg"] }], variants: [{ title: "1kg", options: { Size: "1kg" }, manage_inventory: true, prices: [{ amount: 100, currency_code: "egp" }] }] }, admin)
        const variantId = product.variants[0].id
        const { data: [link] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "product_variant_inventory_item", fields: ["inventory_item_id"], filters: { variant_id: variantId } })
        const inventoryItemId = (link as { inventory_item_id: string }).inventory_item_id
        await api.post(`/admin/inventory-items/${inventoryItemId}/location-levels`, { location_id: location.id, stocked_quantity: 10 }, admin)
        const { data: { inventory_item: otherItem } } = await api.post("/admin/inventory-items", { sku: "OTHER" }, admin)
        await api.post(`/admin/inventory-items/${otherItem.id}/location-levels`, { location_id: location.id, stocked_quantity: 10 }, admin)
        const { result: [region] } = await createRegionsWorkflow(container).run({ input: { regions: [{ name: "Egypt", currency_code: "egp", countries: ["eg"] }] } })
        const { result: order } = await createOrderWorkflow(container).run({ input: { region_id: region.id, email: "buyer@test.dev", currency_code: "egp", items: [{ title: "Whey", variant_id: variantId, quantity: 2, unit_price: 100 }] } })
        const lineItemId = order.items![0].id
        const allocate = (body: Record<string, unknown>) => api.post("/admin/reservations", { location_id: location.id, ...body }, manager)

        const first = await allocate({ line_item_id: lineItemId, inventory_item_id: inventoryItemId, quantity: 1 })
        expect(first.status).toBe(200)
        expect((await allocate({ line_item_id: lineItemId, inventory_item_id: inventoryItemId, quantity: 1 })).status).toBe(200)
        const tooMany = await allocate({ line_item_id: lineItemId, inventory_item_id: inventoryItemId, quantity: 1 })
        expect(tooMany.status).toBe(400)
        expect(tooMany.data.message).toContain("At most 0 more")
        expect((await allocate({ line_item_id: lineItemId, inventory_item_id: otherItem.id, quantity: 1 })).status).toBe(400)
        expect((await allocate({ line_item_id: "ordli_does_not_exist", inventory_item_id: inventoryItemId, quantity: 1 })).status).toBe(400)
        const levels = await container.resolve(Modules.INVENTORY).listInventoryLevels({ inventory_item_id: [inventoryItemId, otherItem.id] })
        expect(Object.fromEntries(levels.map((level) => [level.inventory_item_id, level.reserved_quantity]))).toEqual({ [inventoryItemId]: 2, [otherItem.id]: 0 })

        expect((await api.post(`/admin/orders/${order.id}/cancel`, {}, manager)).status).toBe(200)
        expect((await allocate({ line_item_id: lineItemId, inventory_item_id: inventoryItemId, quantity: 1 })).status).toBe(400)
      })

      it("removes permissions the role no longer grants when the setup runs again", async () => {
        const container = getContainer()
        const rbac = container.resolve(Modules.RBAC)
        const [extra] = await rbac.listRbacPolicies({ key: "reservation_item:delete" })
        await rbac.createRbacRolePolicies([{ role_id: managerRoleId, policy_id: extra.id }])
        const { data: { users: [adminUser] } } = await api.get("/admin/users", admin)
        await setupCatalogManager({ container, args: [adminUser.id] } as never)
        const links = await rbac.listRbacRolePolicies({ role_id: managerRoleId })
        expect(links.map((link) => link.policy_id)).not.toContain(extra.id)
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
