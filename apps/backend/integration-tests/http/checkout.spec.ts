import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { removeAbandonedCarts } from "../../src/jobs/remove-abandoned-carts"

jest.setTimeout(240 * 1000)

const cairo = { first_name: "Sara", last_name: "Ali", address_1: "Tahrir Square", city: "Cairo", country_code: "eg", phone: "01000000000" }

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

      async function cartWith(quantity: number) {
        const { data: { cart } } = await api.post("/store/carts", { region_id: regionId }, store())
        const added = await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity }, store())
        return { cartId: cart.id as string, added }
      }

      async function prepare(cartId: string, token?: string) {
        expect((await api.post(`/store/carts/${cartId}`, { email: "sara@test.dev", shipping_address: cairo, billing_address: cairo }, store(token))).status).toBe(200)
        const { data: { shipping_options } } = await api.get(`/store/shipping-options?cart_id=${cartId}`, store(token))
        expect(shipping_options).toEqual([expect.objectContaining({ name: "Standard Delivery", amount: 70 })])
        expect((await api.post(`/store/carts/${cartId}/shipping-methods`, { option_id: shipping_options[0].id }, store(token))).status).toBe(200)
        const { data: { payment_collection } } = await api.post("/store/payment-collections", { cart_id: cartId }, store(token))
        expect((await api.post(`/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" }, store(token))).status).toBe(200)
        return payment_collection.id as string
      }
      const complete = (cartId: string, token?: string) => api.post(`/store/carts/${cartId}/complete`, {}, store(token))
      const checkout = async (cartId: string, token?: string) => {
        await prepare(cartId)
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

      // Medusa picks a cart's customer by email. src/api/cart-access.ts gives a
      // cart to a customer only through their login, keeps it to that login,
      // and gives the order to the customer signed in when it is placed. Carts
      // are built without a login, as the storefront does.
      const register = async (email = "sara@test.dev") => {
        const registered = await api.post("/store/auth/register", { email, password: "test-password-123", first_name: "Sara", last_name: "Ali" }, store())
        expect(registered.status).toBe(201)
        return registered.data.token as string
      }
      const history = async (token: string) => (await api.get("/store/orders", store(token))).data.orders.map((order: { id: string }) => order.id)

      it("never puts an order into an account because of the email typed at checkout", async () => {
        const token = await register()
        const placed = await checkout((await cartWith(1)).cartId)
        expect(placed.data.type).toBe("order")
        expect(await history(token)).toEqual([])
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const { data: [order] } = await query.graph({ entity: "order", fields: ["email", "customer.has_account"], filters: { id: placed.data.order.id } })
        expect(order).toEqual(expect.objectContaining({ email: "sara@test.dev", customer: expect.objectContaining({ has_account: false }) }))
      })

      it("puts a signed-in customer's order in their history, even if they ordered as a guest before registering", async () => {
        expect((await checkout((await cartWith(1)).cartId)).data.type).toBe("order")
        const token = await register()
        const placed = await checkout((await cartWith(1)).cartId, token)
        expect(placed.data.type).toBe("order")
        expect(await history(token)).toEqual([placed.data.order.id])
        expect((await api.get("/store/orders", store())).status).toBe(401)
      })

      it("does not let a shopper sign in to a cart while the abandoned-cart job is deleting it", async () => {
        const { cartId } = await cartWith(1)
        await prepare(cartId)
        const token = await register()
        const owner = async () => (await getContainer().resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "cart", fields: ["customer.has_account"], filters: { id: cartId } })).data[0]?.customer?.has_account
        // Pause the job after its last check, while it holds the cart's lock.
        const link = getContainer().resolve(ContainerRegistrationKeys.LINK)
        const linkDelete = link.delete.bind(link)
        let atDelete!: () => void, resume!: () => void
        const reached = new Promise<void>((resolve) => { atDelete = resolve })
        const gate = new Promise<void>((resolve) => { resume = resolve })
        const spy = jest.spyOn(link, "delete").mockImplementationOnce(async (...args) => { atDelete(); await gate; return linkDelete(...args) })
        try {
          const job = removeAbandonedCarts(getContainer(), new Date(Date.now() + 31 * 24 * 60 * 60 * 1000))
          await reached
          const completing = complete(cartId, token)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          // Signing in at checkout waits for the job instead of claiming the cart it already checked.
          expect(await owner()).toBe(false)
          resume()
          expect(await job).toBe(1)
          expect((await completing).status).toBe(404)
        } finally {
          resume()
          spy.mockRestore()
        }
        expect(await history(token)).toEqual([])
      })

      it("keeps a customer's cart to that customer's login", async () => {
        const sara = await register()
        const omar = await register("omar@test.dev")
        const { data: { cart } } = await api.post("/store/carts", { region_id: regionId }, store(sara))
        expect((await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity: 1 }, store(sara))).status).toBe(200)
        const paymentCollectionId = await prepare(cart.id, sara)

        for (const intruder of [undefined, omar]) {
          const refused = [
            await api.get(`/store/carts/${cart.id}`, store(intruder)),
            await api.post(`/store/carts/${cart.id}`, { email: "intruder@test.dev" }, store(intruder)),
            await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity: 1 }, store(intruder)),
            await api.post(`/store/carts/${cart.id}/customer`, {}, store(intruder)),
            await api.post("/store/payment-collections", { cart_id: cart.id }, store(intruder)),
            await api.post(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, { provider_id: "pp_system_default" }, store(intruder)),
            await complete(cart.id, intruder),
          ]
          expect(refused.map((response) => response.status)).toEqual(Array(refused.length).fill(403))
        }
        const { data } = await api.get(`/store/carts/${cart.id}`, store(sara))
        expect(data.cart).toEqual(expect.objectContaining({ email: "sara@test.dev", items: [expect.objectContaining({ quantity: 1 })] }))
        const placed = await complete(cart.id, sara)
        expect(placed.data.type).toBe("order")
        expect(await history(sara)).toEqual([placed.data.order.id])
        expect(await history(omar)).toEqual([])
      })

      it("does not start a guest cart with an email, since the email could be an account's", async () => {
        await register()
        const created = await api.post("/store/carts", { region_id: regionId, email: "sara@test.dev" }, store())
        expect(created.status).toBe(400)
        expect(created.data.message).toBe("Create the cart first, then add the email.")
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
