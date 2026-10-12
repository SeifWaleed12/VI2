import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"

jest.setTimeout(240 * 1000)

const cairo = { first_name: "Sara", last_name: "Ali", address_1: "Tahrir Square", city: "Cairo", country_code: "eg", postal_code: "00000", phone: "01000000000" }

// Follows the storefront's calls (apps/storefront/src/lib/medusa/services):
// create cart, add items, set email and addresses, pick delivery, start the
// system payment session, complete.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("cart and checkout in the Egypt store", () => {
      let regionId: string
      let locationId: string
      let variantId: string
      let inventoryItemId: string
      let publishableKey: string

      const store = (token?: string) => ({
        headers: { "x-publishable-api-key": publishableKey, ...(token ? { authorization: `Bearer ${token}` } : {}) },
        validateStatus: () => true,
      })

      beforeEach(async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [settings] } = await query.graph({ entity: "store", fields: ["default_region_id", "default_location_id", "default_sales_channel_id"] })
        regionId = settings.default_region_id as string
        locationId = settings.default_location_id as string
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        publishableKey = key.token as string
        const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })
        const { result: [product] } = await createProductsWorkflow(container).run({
          input: { products: [{ title: "Whey", status: "published", shipping_profile_id: profile.id, sales_channels: [{ id: settings.default_sales_channel_id as string }], options: [{ title: "Size", values: ["1kg"] }], variants: [{ title: "1kg", sku: "WHEY-1KG", options: { Size: "1kg" }, manage_inventory: true, prices: [{ amount: 1500, currency_code: "egp" }] }] }] },
        })
        variantId = product.variants[0].id
        const { data: [variant] } = await query.graph({ entity: "variant", fields: ["inventory_items.inventory_item_id"], filters: { id: variantId } })
        inventoryItemId = (variant.inventory_items as { inventory_item_id: string }[])[0].inventory_item_id
        await container.resolve(Modules.INVENTORY).createInventoryLevels([{ inventory_item_id: inventoryItemId, location_id: locationId, stocked_quantity: 5 }])
      })

      async function cartWith(quantity: number, token?: string) {
        const { data: { cart } } = await api.post("/store/carts", { region_id: regionId }, store(token))
        const added = await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity }, store(token))
        return { cartId: cart.id as string, added }
      }

      async function prepare(cartId: string, token?: string) {
        expect((await api.post(`/store/carts/${cartId}`, { email: "sara@test.dev", shipping_address: cairo, billing_address: cairo }, store(token))).status).toBe(200)
        const { data: { shipping_options } } = await api.get(`/store/shipping-options?cart_id=${cartId}`, store(token))
        expect(shipping_options).toEqual([expect.objectContaining({ name: "Standard Delivery", amount: 70 })])
        expect((await api.post(`/store/carts/${cartId}/shipping-methods`, { option_id: shipping_options[0].id }, store(token))).status).toBe(200)
        const { data: { payment_collection } } = await api.post("/store/payment-collections", { cart_id: cartId }, store(token))
        expect((await api.post(`/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" }, store(token))).status).toBe(200)
      }
      const complete = (cartId: string, token?: string) => api.post(`/store/carts/${cartId}/complete`, {}, store(token))
      const checkout = async (cartId: string, token?: string) => {
        await prepare(cartId, token)
        return complete(cartId, token)
      }

      const stockLevel = async () => (await getContainer().resolve(Modules.INVENTORY).listInventoryLevels({ inventory_item_id: inventoryItemId, location_id: locationId }))[0]

      it("places a guest order with 70 EGP delivery, tax-inclusive prices and reserved stock", async () => {
        const { cartId, added } = await cartWith(2)
        expect(added.status).toBe(200)
        const completed = await checkout(cartId)
        expect(completed.status).toBe(200)
        expect(completed.data.type).toBe("order")
        const { order } = completed.data
        expect(order).toEqual(expect.objectContaining({ email: "sara@test.dev", currency_code: "egp", item_total: 3000, shipping_total: 70, tax_total: 0, total: 3070 }))
        expect(order.shipping_address).toEqual(expect.objectContaining({ city: "Cairo", country_code: "eg" }))
        expect(await stockLevel()).toEqual(expect.objectContaining({ stocked_quantity: 5, reserved_quantity: 2 }))
      })

      it("does not let a cart hold more than the warehouse has", async () => {
        const { cartId, added } = await cartWith(6)
        expect(added.status).toBe(400)
        const { data: { cart } } = await api.get(`/store/carts/${cartId}`, store())
        expect(cart.items).toEqual([])
      })

      it("does not deliver outside Egypt", async () => {
        const { cartId } = await cartWith(1)
        const moved = await api.post(`/store/carts/${cartId}`, { shipping_address: { ...cairo, city: "London", country_code: "gb" } }, store())
        expect(moved.status).toBe(400)
        expect(moved.data.message).toBe("Country with code gb is not within region Egypt")
      })

      it("shows a signed-in customer's order in their order history", async () => {
        const registered = await api.post("/store/auth/register", { email: "sara@test.dev", password: "test-password-123", first_name: "Sara", last_name: "Ali" }, store())
        expect(registered.status).toBe(201)
        const { token } = registered.data
        const { cartId } = await cartWith(1, token)
        const completed = await checkout(cartId, token)
        expect(completed.data.type).toBe("order")
        const { data } = await api.get("/store/orders", store(token))
        expect(data.orders.map((order: { id: string }) => order.id)).toEqual([completed.data.order.id])
        expect((await api.get("/store/orders", store())).status).toBe(401)
      })

      it("refuses checkout in production until a real payment provider is set up", async () => {
        const { cartId } = await cartWith(1)
        await prepare(cartId)
        // The gate reads NODE_ENV per request, so only the completion runs as production.
        const nodeEnv = process.env.NODE_ENV
        process.env.NODE_ENV = "production"
        let completed
        try {
          completed = await complete(cartId)
        } finally {
          process.env.NODE_ENV = nodeEnv
        }
        expect(completed!.status).toBe(400)
        expect(completed!.data.message).toBe("Production checkout is not configured")
        expect((await stockLevel()).reserved_quantity).toBe(0)
      })
    })
  },
})
