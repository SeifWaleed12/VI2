import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { capturePaymentWorkflow, createOrderFulfillmentWorkflow, createProductsWorkflow, markOrderFulfillmentAsDeliveredWorkflow, refundPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { signEmailChange } from "../../src/lib/email-change"
import { expirePoints } from "../../src/jobs/expire-points"
import pointsOnDelivery from "../../src/subscribers/points-on-delivery"
import pointsOnRefund from "../../src/subscribers/points-on-refund"
import { LOYALTY_MODULE } from "../../src/modules/loyalty"
import type LoyaltyModuleService from "../../src/modules/loyalty/service"

jest.setTimeout(240 * 1000)
// Email-change links point at the storefront; the test server needs its address.
process.env.STOREFRONT_URL ??= "http://localhost:3000"

const cairo = { first_name: "Sara", last_name: "Ali", address_1: "Tahrir Square", city: "Cairo", country_code: "eg", phone: "01000000000" }
const PASSWORD = "test-password-123"
const months = (n: number) => { const date = new Date(); date.setUTCMonth(date.getUTCMonth() + n); return date }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The account page's backend: saved addresses, email change and Vi2 Points.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("account page backend", () => {
      let regionId: string
      let locationId: string
      let variantId: string
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
        const inventoryItemId = (variant.inventory_items as { inventory_item_id: string }[])[0].inventory_item_id
        await container.resolve(Modules.INVENTORY).createInventoryLevels([{ inventory_item_id: inventoryItemId, location_id: locationId, stocked_quantity: 50 }])
      })

      const register = async (email: string) => {
        const registered = await api.post("/store/auth/register", { email, password: PASSWORD, first_name: "Sara", last_name: "Ali" }, store())
        expect(registered.status).toBe(201)
        return registered.data.token as string
      }
      const signIn = (email: string) => api.post("/auth/customer/emailpass", { email, password: PASSWORD }, store())
      const customerId = async (token: string) => (await api.get("/store/customers/me", store(token))).data.customer.id as string

      async function placeOrder(token?: string) {
        const { data: { cart } } = await api.post("/store/carts", { region_id: regionId }, store())
        await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity: 1 }, store())
        await api.post(`/store/carts/${cart.id}`, { email: "sara@test.dev", shipping_address: cairo, billing_address: cairo }, store())
        const { data: { shipping_options } } = await api.get(`/store/shipping-options?cart_id=${cart.id}`, store())
        await api.post(`/store/carts/${cart.id}/shipping-methods`, { option_id: shipping_options[0].id }, store())
        const { data: { payment_collection } } = await api.post("/store/payment-collections", { cart_id: cart.id }, store())
        await api.post(`/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" }, store())
        const completed = await api.post(`/store/carts/${cart.id}/complete`, {}, store(token))
        expect(completed.data.type).toBe("order")
        return completed.data.order as { id: string, items: { id: string, quantity: number }[] }
      }

      async function deliver(order: { id: string, items: { id: string, quantity: number }[] }) {
        const container = getContainer()
        const { result: fulfillment } = await createOrderFulfillmentWorkflow(container).run({
          input: { order_id: order.id, location_id: locationId, items: order.items.map((item) => ({ id: item.id, quantity: item.quantity })) },
        })
        await markOrderFulfillmentAsDeliveredWorkflow(container).run({ input: { orderId: order.id, fulfillmentId: fulfillment.id } })
        return fulfillment.id
      }

      const entries = (customer: string) => getContainer().resolve<LoyaltyModuleService>(LOYALTY_MODULE).listPointsEntries({ customer_id: customer })
      const points = async (token: string) => (await api.get("/store/customers/me/points", store(token))).data.points
      // Subscribers run after the workflow's events, so wait for the entry.
      async function waitForEntries(customer: string, count: number) {
        for (let i = 0; i < 50 && (await entries(customer)).length < count; i++) await new Promise((resolve) => setTimeout(resolve, 100))
        return entries(customer)
      }
      // A real refund through Medusa's payment workflows (capturing first), as
      // the admin's Refund button does; its payment.refunded event moves points.
      async function refund(orderId: string, amount: number) {
        const container = getContainer()
        const { data: [order] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "order", fields: ["customer_id", "payment_collections.payments.id", "payment_collections.payments.captured_at"], filters: { id: orderId } })
        const payment = (order.payment_collections as unknown as { payments: { id: string, captured_at: unknown }[] }[])[0].payments[0]
        if (!payment.captured_at) await capturePaymentWorkflow(container).run({ input: { payment_id: payment.id } })
        const before = (await entries(order.customer_id as string)).length
        await refundPaymentWorkflow(container).run({ input: { payment_id: payment.id, amount } })
        await waitForEntries(order.customer_id as string, before + 1)
        return payment.id
      }
      const replayRefund = (paymentId: string) =>
        pointsOnRefund({ event: { name: "payment.refunded", data: { id: paymentId } }, container: getContainer() } as never)

      describe("saved addresses", () => {
        it("keeps a customer's Egyptian addresses to that customer", async () => {
          const sara = await register("sara@test.dev")
          const other = await register("omar@test.dev")
          expect((await api.post("/store/customers/me/addresses", { ...cairo, country_code: "fr" }, store(sara))).status).toBe(400)
          expect((await api.post("/store/customers/me/addresses", { first_name: "Sara", address_1: "Tahrir Square", city: "Cairo" }, store(sara))).status).toBe(400)
          const created = await api.post("/store/customers/me/addresses", { ...cairo, address_name: "Home" }, store(sara))
          expect(created.status).toBe(200)
          const address = created.data.customer.addresses[0]
          expect(address).toEqual(expect.objectContaining({ address_name: "Home", city: "Cairo", country_code: "eg" }))

          expect((await api.post(`/store/customers/me/addresses/${address.id}`, { city: "Giza" }, store(sara))).status).toBe(200)
          expect((await api.post(`/store/customers/me/addresses/${address.id}`, { country_code: "us" }, store(sara))).status).toBe(400)
          expect((await api.get("/store/customers/me/addresses", store(sara))).data.addresses).toEqual([expect.objectContaining({ id: address.id, city: "Giza" })])

          expect((await api.get(`/store/customers/me/addresses/${address.id}`, store(other))).status).toBe(404)
          expect((await api.post(`/store/customers/me/addresses/${address.id}`, { city: "Alexandria" }, store(other))).status).not.toBe(200)
          expect((await api.delete(`/store/customers/me/addresses/${address.id}`, store(other))).status).not.toBe(200)
          expect((await api.get("/store/customers/me/addresses", store())).status).toBe(401)

          expect((await api.delete(`/store/customers/me/addresses/${address.id}`, store(sara))).status).toBe(200)
          expect((await api.get("/store/customers/me/addresses", store(sara))).data.addresses).toEqual([])
        })
      })

      describe("email change", () => {
        const jwtSecret = () => getContainer().resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig.http.jwtSecret as string

        it("changes the sign-in email only after the link sent to the new address is opened, once", async () => {
          const sara = await register("sara@test.dev")
          const notifications = getContainer().resolve(Modules.NOTIFICATION)
          const sent = jest.spyOn(notifications, "createNotifications")
          try {
            expect((await api.post("/store/customers/me/email", { email: "sara.new@test.dev", password: "wrong-password" }, store(sara))).data.code).toBe("wrong_password")
            expect((await api.post("/store/customers/me/email", { email: "sara@test.dev", password: PASSWORD }, store(sara))).data.code).toBe("same_email")
            expect((await api.post("/store/customers/me/email", { email: "sara.new@test.dev", password: PASSWORD }, store())).status).toBe(401)
            expect(sent).not.toHaveBeenCalled()

            const requested = await api.post("/store/customers/me/email", { email: "Sara.New@test.dev", password: PASSWORD }, store(sara))
            expect(requested.status).toBe(200)
            const emails = sent.mock.calls[0][0] as unknown as { to: string, template: string, content: { text: string } }[]
            expect(emails.map((email) => [email.to, email.template])).toEqual([["sara.new@test.dev", "email-change-confirm"], ["sara@test.dev", "email-change-notice"]])
            const token = decodeURIComponent(/token=(\S+)/.exec(emails[0].content.text)![1])
            // Nothing changes before the link is opened.
            expect((await signIn("sara@test.dev")).status).toBe(200)

            expect((await api.post("/store/email-change/confirm", { token: `${token}x` }, store())).data.code).toBe("invalid_link")
            const confirmed = await api.post("/store/email-change/confirm", { token }, store())
            expect(confirmed.data).toEqual({ success: true, email: "sara.new@test.dev" })
            expect((await signIn("sara.new@test.dev")).status).toBe(200)
            expect((await signIn("sara@test.dev")).status).toBe(401)
            expect((await api.get("/store/customers/me", store(sara))).data.customer.email).toBe("sara.new@test.dev")
            // The same link a second time does nothing.
            expect((await api.post("/store/email-change/confirm", { token }, store())).data.code).toBe("invalid_link")

            // Not even after changing back to the old address (A -> B -> A, then the A -> B link again).
            expect((await api.post("/store/customers/me/email", { email: "sara@test.dev", password: PASSWORD }, store(sara))).status).toBe(200)
            const back = sent.mock.calls[1][0] as unknown as { content: { text: string } }[]
            const backToken = decodeURIComponent(/token=(\S+)/.exec(back[0].content.text)![1])
            expect((await api.post("/store/email-change/confirm", { token: backToken }, store())).data.email).toBe("sara@test.dev")
            expect((await api.post("/store/email-change/confirm", { token }, store())).data.code).toBe("invalid_link")
            expect((await signIn("sara@test.dev")).status).toBe(200)
          } finally {
            sent.mockRestore()
          }
        })

        it("keeps the hourly request limit across an email change", async () => {
          const sara = await register("sara@test.dev")
          const sent = jest.spyOn(getContainer().resolve(Modules.NOTIFICATION), "createNotifications")
          try {
            for (const email of ["one@test.dev", "two@test.dev", "three@test.dev"]) {
              expect((await api.post("/store/customers/me/email", { email, password: PASSWORD }, store(sara))).status).toBe(200)
            }
            const first = sent.mock.calls[0][0] as unknown as { content: { text: string } }[]
            const token = decodeURIComponent(/token=(\S+)/.exec(first[0].content.text)![1])
            expect((await api.post("/store/email-change/confirm", { token }, store())).data.email).toBe("one@test.dev")
            expect((await api.post("/store/customers/me/email", { email: "four@test.dev", password: PASSWORD }, store(sara))).status).toBe(429)
          } finally {
            sent.mockRestore()
          }
        })

        it("never moves a login onto an email another account uses, or onto a staff login", async () => {
          const sara = await register("sara@test.dev")
          await register("omar@test.dev")
          const sent = jest.spyOn(getContainer().resolve(Modules.NOTIFICATION), "createNotifications")
          try {
            // Same answer as a free address, but only the notice to the current address is sent.
            expect((await api.post("/store/customers/me/email", { email: "omar@test.dev", password: PASSWORD }, store(sara))).status).toBe(200)
            expect((sent.mock.calls[0][0] as unknown as { to: string }[]).map((email) => email.to)).toEqual(["sara@test.dev"])
          } finally {
            sent.mockRestore()
          }
          const id = await customerId(sara)
          const taken = signEmailChange({ customer_id: id, from: "sara@test.dev", to: "omar@test.dev" }, jwtSecret())
          expect((await api.post("/store/email-change/confirm", { token: taken }, store())).data.code).toBe("email_taken")
          expect((await signIn("sara@test.dev")).status).toBe(200)

          // An account record without a login already holds the address, so the
          // customer update fails; the login must move back (workflow compensation).
          await getContainer().resolve(Modules.CUSTOMER).createCustomers({ email: "held@test.dev", has_account: true })
          const held = signEmailChange({ customer_id: id, from: "sara@test.dev", to: "held@test.dev" }, jwtSecret())
          expect((await api.post("/store/email-change/confirm", { token: held }, store())).status).toBeGreaterThanOrEqual(400)
          expect((await signIn("sara@test.dev")).status).toBe(200)
          expect((await signIn("held@test.dev")).status).toBe(401)

          const auth = getContainer().resolve(Modules.AUTH)
          const [login] = await auth.listProviderIdentities({ provider: "emailpass", entity_id: "sara@test.dev" }, { relations: ["auth_identity"] })
          await auth.updateAuthIdentities([{ id: login.auth_identity_id as string, app_metadata: { ...login.auth_identity!.app_metadata, user_id: "user_staff" } }])
          const staff = signEmailChange({ customer_id: id, from: "sara@test.dev", to: "sara.free@test.dev" }, jwtSecret())
          expect((await api.post("/store/email-change/confirm", { token: staff }, store())).data.code).toBe("staff_login")
          expect((await signIn("sara@test.dev")).status).toBe(200)
        })
      })

      describe("Vi2 Points", () => {
        it("earns on delivery, once; shows pending before; refunds and expiry never go below zero", async () => {
          const sara = await register("sara@test.dev")
          const id = await customerId(sara)
          const order = await placeOrder(sara)
          // 1,500 EGP of products and 70 EGP delivery: 1,500 points, pending until delivered.
          expect(await points(sara)).toEqual({ balance: 0, pending: 1500, expires_at: null, history: [] })

          const fulfillmentId = await deliver(order)
          expect((await waitForEntries(id, 1)).map((entry) => [entry.kind, entry.points])).toEqual([["earn", 1500]])
          const afterDelivery = await points(sara)
          expect(afterDelivery).toEqual(expect.objectContaining({ balance: 1500, pending: 0, history: [expect.objectContaining({ kind: "earn", points: 1500, order_id: order.id })] }))
          expect(new Date(afterDelivery.expires_at).getTime()).toBeGreaterThan(months(11).getTime())

          // A repeated delivery event adds nothing (P-10).
          await pointsOnDelivery({ event: { name: "delivery.created", data: { id: fulfillmentId } }, container: getContainer() } as never)
          expect(await entries(id)).toHaveLength(1)

          // A refund removes its amount's points (P-8), once.
          const paymentId = await refund(order.id, 400.5)
          expect((await points(sara)).balance).toBe(1100)
          await replayRefund(paymentId)
          expect((await points(sara)).balance).toBe(1100)

          // Nothing expires within 12 months; after that the whole balance does (P-7).
          expect(await expirePoints(getContainer(), months(11))).toBe(0)
          expect(await expirePoints(getContainer(), months(13))).toBe(1)
          expect(await expirePoints(getContainer(), months(13))).toBe(0)
          expect(await points(sara)).toEqual(expect.objectContaining({ balance: 0, expires_at: null }))

          // A refund after expiry cannot take the balance below zero (P-9)...
          await refund(order.id, 600)
          expect((await points(sara)).balance).toBe(0)
          expect((await entries(id)).map((entry) => entry.kind).sort()).toEqual(["earn", "expire", "refund", "refund"])
          // ...and stays used up: retried after a later earning, it removes nothing (P-10).
          await deliver(await placeOrder(sara))
          await waitForEntries(id, 5)
          await replayRefund(paymentId)
          expect((await points(sara)).balance).toBe(1500)
          expect((await points(sara)).history.map((entry: { kind: string }) => entry.kind)).toEqual(["earn", "expire", "refund", "earn"])
        })

        it("keeps the whole balance when an earning lands while expiry waits (P-7, P-11)", async () => {
          const sara = await register("sara@test.dev")
          const id = await customerId(sara)
          await deliver(await placeOrder(sara))
          await waitForEntries(id, 1)
          let job: Promise<number> | undefined
          // Hold the customer's lock as an earning would, while expiry runs for 13 months later.
          await getContainer().resolve(Modules.LOCKING).execute(`points:${id}`, async () => {
            job = expirePoints(getContainer(), months(13))
            await sleep(1000)
            jest.useFakeTimers({ now: months(13), doNotFake: ["nextTick", "setImmediate", "setTimeout", "setInterval", "queueMicrotask"] })
            try {
              await getContainer().resolve<LoyaltyModuleService>(LOYALTY_MODULE).createPointsEntries({ customer_id: id, kind: "earn", points: 100, source_id: "order_later" })
            } finally {
              jest.useRealTimers()
            }
          })
          expect(await job).toBe(0)
          expect((await points(sara)).balance).toBe(1600)
        })

        it("never removes more than an order earned, even with refund events at once (P-8, P-11)", async () => {
          const sara = await register("sara@test.dev")
          const id = await customerId(sara)
          await deliver(await placeOrder(sara))
          await deliver(await placeOrder(sara))
          await waitForEntries(id, 2)
          const [first] = await entries(id)
          // Two refunds on the first order (1,570 EGP paid), then both events again at once.
          await refund(first.source_id, 760)
          const paymentId = await refund(first.source_id, 760)
          await Promise.all([replayRefund(paymentId), replayRefund(paymentId)])
          // 3,000 earned; the first order loses at most its 1,500.
          expect((await points(sara)).balance).toBe(1500)
        })

        it("gives a guest order no points", async () => {
          const order = await placeOrder()
          await deliver(order)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          expect(await getContainer().resolve<LoyaltyModuleService>(LOYALTY_MODULE).listPointsEntries({})).toEqual([])
        })

        it("is only shown to a signed-in customer", async () => {
          expect((await api.get("/store/customers/me/points", store())).status).toBe(401)
        })
      })
    })
  },
})
