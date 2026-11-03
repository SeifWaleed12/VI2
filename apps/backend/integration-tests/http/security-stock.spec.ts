import { dirname, join } from "node:path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, MathBN, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow, createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import setupCatalogManager from "../../src/scripts/setup-catalog-manager"

const createSuperAdminRole = require(join(dirname(require.resolve("@medusajs/medusa")), "migration-scripts/create-super-admin-role")).default
const password = "security-fixture-password"
const address = { first_name: "Dummy", last_name: "Buyer", address_1: "Dummy street", city: "Cairo", country_code: "eg", phone: "01000000000" }
jest.setTimeout(240000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("security: manager return stock integrity", () => {
      let manager: { headers: { authorization: string }, validateStatus: () => boolean }
      let order: { id: string, items: { id: string }[] }, fulfillmentId: string, locationId: string, inventoryId: string
      const anyStatus = { validateStatus: () => true }

      async function setup(quantity = 1) {
        const container = getContainer(), query = container.resolve(ContainerRegistrationKeys.QUERY)
        await setupEgyptStore(container)
        const staff = async (email: string) => {
          const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email }] } })
          const auth = container.resolve(Modules.AUTH)
          const { authIdentity } = await auth.register("emailpass", { body: { email, password } })
          await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
          return user
        }
        const admin = await staff("stock-admin@example.test")
        await createSuperAdminRole({ container })
        await setupCatalogManager({ container, args: [admin.id] } as never)
        const user = await staff("stock-manager@example.test")
        const [role] = await container.resolve(Modules.RBAC).listRbacRoles({ name: "Catalog Manager" })
        await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.USER]: { user_id: user.id }, [Modules.RBAC]: { rbac_role_id: role.id } })
        const login = await api.post("/auth/user/emailpass", { email: user.email, password }, anyStatus)
        expect(login.status).toBe(200)
        manager = { headers: { authorization: `Bearer ${login.data.token}` }, ...anyStatus }
        const { data: [store] } = await query.graph({ entity: "store", fields: ["default_region_id", "default_location_id", "default_sales_channel_id"] })
        locationId = store.default_location_id as string
        const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })
        const { result: [product] } = await createProductsWorkflow(container).run({ input: { products: [{ title: "Dummy stock item", status: "published", shipping_profile_id: profile.id, sales_channels: [{ id: store.default_sales_channel_id as string }], options: [{ title: "Size", values: ["one"] }], variants: [{ title: "one", sku: "SECURITY-STOCK", options: { Size: "one" }, manage_inventory: true, prices: [{ amount: 100, currency_code: "egp" }] }] }] } })
        const variantId = product.variants[0].id
        const { data: [variant] } = await query.graph({ entity: "variant", fields: ["inventory_items.inventory_item_id"], filters: { id: variantId } })
        inventoryId = (variant.inventory_items as { inventory_item_id: string }[])[0].inventory_item_id
        await container.resolve(Modules.INVENTORY).createInventoryLevels([{ inventory_item_id: inventoryId, location_id: locationId, stocked_quantity: 10 }])
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        const storeRequest = { headers: { "x-publishable-api-key": key.token }, ...anyStatus }
        const created = await api.post("/store/carts", { region_id: store.default_region_id }, storeRequest)
        const cartId = created.data.cart.id
        expect((await api.post(`/store/carts/${cartId}/line-items`, { variant_id: variantId, quantity }, storeRequest)).status).toBe(200)
        await api.post(`/store/carts/${cartId}`, { email: "dummy-buyer@example.test", shipping_address: address, billing_address: address }, storeRequest)
        const options = await api.get(`/store/shipping-options?cart_id=${cartId}`, storeRequest)
        await api.post(`/store/carts/${cartId}/shipping-methods`, { option_id: options.data.shipping_options[0].id }, storeRequest)
        const collection = await api.post("/store/payment-collections", { cart_id: cartId }, storeRequest)
        await api.post(`/store/payment-collections/${collection.data.payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" }, storeRequest)
        const completed = await api.post(`/store/carts/${cartId}/complete`, {}, storeRequest)
        expect(completed.data.type).toBe("order")
        order = completed.data.order
        const fulfilled = await api.post(`/admin/orders/${order.id}/fulfillments`, { location_id: locationId, items: [{ id: order.items[0].id, quantity: 1 }] }, manager)
        expect(fulfilled.status).toBe(200)
        const { data: [stored] } = await query.graph({ entity: "order", fields: ["fulfillments.id"], filters: { id: order.id } })
        fulfillmentId = stored.fulfillments![0]!.id
      }

      async function quantity() {
        const [level] = await getContainer().resolve(Modules.INVENTORY).listInventoryLevels({ inventory_item_id: inventoryId, location_id: locationId })
        return MathBN.convert(level.stocked_quantity).toNumber()
      }
      async function prepareReceipt() {
        const start = await api.post("/admin/returns", { order_id: order.id, location_id: locationId }, manager)
        expect(start.status).toBe(200)
        const id = start.data.return.id
        for (const [path, body] of [
          ["request-items", { items: [{ id: order.items[0].id, quantity: 1 }] }],
          ["request", {}], ["receive", {}],
          ["receive-items", { items: [{ id: order.items[0].id, quantity: 1 }] }],
        ] as const) expect((await api.post(`/admin/returns/${id}/${path}`, body, manager)).status).toBe(200)
        return id
      }
      it("rejects unshipped receipt without adding stock and permits ordinary cancellation", async () => {
        await setup()
        expect(await quantity()).toBe(9)
        const id = await prepareReceipt()
        const receipt = await api.post(`/admin/returns/${id}/receive/confirm`, {}, manager)
        const afterReceipt = await quantity()
        if (receipt.status !== 200) expect((await api.delete(`/admin/returns/${id}/receive`, manager)).status).toBe(200)
        expect((await api.post(`/admin/orders/${order.id}/fulfillments/${fulfillmentId}/cancel`, {}, manager)).status).toBe(200)
        const afterCancel = await quantity()
        console.info("STOCK_RECEIPT_PROBE", JSON.stringify({ receipt_status: receipt.status, before: 10, fulfilled: 9, after_receipt: afterReceipt, after_cancel: afterCancel }))
        expect(afterCancel).toBe(10)
        expect(receipt.status).toBe(400)
        expect(receipt.data.message).toContain("shipped")
      })
      it("keeps manager shipped receipt and credits concurrent confirmation only once", async () => {
        await setup()
        expect((await api.post(`/admin/orders/${order.id}/fulfillments/${fulfillmentId}/shipments`, { labels: [], items: [{ id: order.items[0].id, quantity: 1 }] }, manager)).status).toBe(200)
        const id = await prepareReceipt()
        const results = await Promise.all([api.post(`/admin/returns/${id}/receive/confirm`, {}, manager), api.post(`/admin/returns/${id}/receive/confirm`, {}, manager)])
        expect(results.map(result => result.status).sort()).toEqual([200, 400])
        expect(await quantity()).toBe(10)
        for (const path of [`/admin/orders/${order.id}/fulfillments/${fulfillmentId}/cancel`, `/admin/fulfillments/${fulfillmentId}/cancel`, `/admin/orders/${order.id}/cancel`]) {
          const canceled = await api.post(path, {}, manager)
          expect([200, 400]).toContain(canceled.status)
          expect(await quantity()).toBe(10)
        }
      })
      it("rolls back a failed inventory write and permits one safe retry", async () => {
        await setup()
        expect((await api.post(`/admin/orders/${order.id}/fulfillments/${fulfillmentId}/shipments`, { labels: [], items: [{ id: order.items[0].id, quantity: 1 }] }, manager)).status).toBe(200)
        const id = await prepareReceipt()
        const inventory = getContainer().resolve(Modules.INVENTORY)
        const failure = jest.spyOn(inventory, "adjustInventory").mockRejectedValueOnce(new Error("dummy inventory failure"))
        try { expect((await api.post(`/admin/returns/${id}/receive/confirm`, {}, manager)).status).toBe(500) }
        finally { failure.mockRestore() }
        expect(await quantity()).toBe(9)
        expect((await api.post(`/admin/returns/${id}/receive/confirm`, {}, manager)).status).toBe(200)
        expect(await quantity()).toBe(10)
      })
      it("does not reuse a shipped unit's return budget for an unshipped fulfillment on the same line", async () => {
        await setup(2)
        expect((await api.post(`/admin/orders/${order.id}/fulfillments/${fulfillmentId}/shipments`, { labels: [], items: [{ id: order.items[0].id, quantity: 1 }] }, manager)).status).toBe(200)
        expect((await api.post(`/admin/orders/${order.id}/fulfillments`, { location_id: locationId, items: [{ id: order.items[0].id, quantity: 1 }] }, manager)).status).toBe(200)
        const { data: [stored] } = await getContainer().resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "order", fields: ["fulfillments.id"], filters: { id: order.id } })
        const unshipped = stored.fulfillments!.find(fulfillment => fulfillment!.id !== fulfillmentId)!
        expect(await quantity()).toBe(8)
        const firstReturn = await prepareReceipt()
        expect((await api.post(`/admin/returns/${firstReturn}/receive/confirm`, {}, manager)).status).toBe(200)
        expect(await quantity()).toBe(9)
        const secondReturn = await prepareReceipt()
        expect((await api.post(`/admin/returns/${secondReturn}/receive/confirm`, {}, manager)).status).toBe(400)
        expect(await quantity()).toBe(9)
        expect((await api.delete(`/admin/returns/${secondReturn}/receive`, manager)).status).toBe(200)
        expect((await api.post(`/admin/orders/${order.id}/fulfillments/${unshipped.id}/cancel`, {}, manager)).status).toBe(200)
        expect(await quantity()).toBe(10)
      })
    })
  },
})
