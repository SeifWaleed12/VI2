import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { removeAbandonedCarts } from "../../src/jobs/remove-abandoned-carts"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"

jest.setTimeout(240 * 1000)

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const cairo = { first_name: "Sara", last_name: "Ali", address_1: "Tahrir Square", city: "Cairo", country_code: "eg", phone: "01000000000" }
const whey = { title: "Whey", quantity: 1, unit_price: 1500 }

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("abandoned guest carts", () => {
      const cartModule = () => getContainer().resolve(Modules.CART)
      const registered = async () => (await getContainer().resolve(Modules.CUSTOMER).createCustomers({ email: `member${Math.random()}@test.dev`, has_account: true })).id
      const exists = async (id: string) => (await cartModule().listCarts({ id })).length === 1

      it("deletes only guest carts untouched for 30 days that never became an order, with their items and addresses", async () => {
        const carts = cartModule()
        const [guest] = await carts.createCarts([{ currency_code: "egp", email: "guest@test.dev", shipping_address: cairo, billing_address: { ...cairo, address_1: "Zamalek" }, items: [whey] }])
        const [saved] = await carts.listCarts({ id: guest.id }, { relations: ["shipping_address", "billing_address"] })
        const shippingId = saved.shipping_address!.id
        const billingId = saved.billing_address!.id
        const [member, completed] = await carts.createCarts([
          // A registered customer's cart that also uses the guest's shipping address: it and the address stay.
          { currency_code: "egp", customer_id: await registered(), shipping_address_id: shippingId } as never,
          { currency_code: "egp" },
        ])
        await carts.updateCarts(completed.id, { completed_at: new Date() })

        expect(await removeAbandonedCarts(getContainer(), days(29))).toBe(0)
        expect(await removeAbandonedCarts(getContainer(), days(31))).toBe(1)
        expect([await exists(guest.id), await exists(member.id), await exists(completed.id)]).toEqual([false, true, true])
        expect(await carts.listLineItems({ cart_id: guest.id })).toEqual([])
        const addresses = await carts.listAddresses({ id: [shippingId, billingId] })
        expect(addresses.map((a) => a.id)).toEqual([shippingId])
      })

      it("deletes a guest checkout made through the store, whose cart has a customer record without an account", async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [settings] } = await query.graph({ entity: "store", fields: ["default_region_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        const store = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
        const { data: { cart } } = await api.post("/store/carts", { region_id: settings.default_region_id }, store)
        const updated = await api.post(`/store/carts/${cart.id}`, { email: "sara@test.dev", shipping_address: cairo, billing_address: cairo }, store)
        expect(updated.status).toBe(200)
        const [saved] = await cartModule().listCarts({ id: cart.id }, { relations: ["shipping_address", "billing_address"] })
        expect(saved.customer_id).toBeTruthy()

        expect(await removeAbandonedCarts(container, days(31))).toBe(1)
        expect(await exists(cart.id)).toBe(false)
        expect(await cartModule().listAddresses({ id: [saved.shipping_address!.id, saved.billing_address!.id] })).toEqual([])
      })

      it("keeps a guest cart whose items changed recently", async () => {
        const carts = cartModule()
        const [cart] = await carts.createCarts([{ currency_code: "egp", items: [whey] }])
        // The cart row was not touched, but an item was changed "today" (day 31).
        const [item] = await carts.listLineItems({ cart_id: cart.id })
        jest.useFakeTimers({ now: days(31), doNotFake: ["nextTick", "setImmediate", "setTimeout", "setInterval", "queueMicrotask"] })
        try {
          await carts.updateLineItems(item.id, { quantity: 2 })
        } finally {
          jest.useRealTimers()
        }
        expect(await removeAbandonedCarts(getContainer(), days(31.5))).toBe(0)
      })

      // Medusa's cart workflows hold the cart's lock while they change it. The
      // job selects the cart first, then must wait for the lock and check again.
      it.each([
        ["completed", async (id: string) => { await cartModule().updateCarts(id, { completed_at: new Date() }) }],
        ["claimed by a registered customer", async (id: string) => { await cartModule().updateCarts(id, { customer_id: await registered() }) }],
      ])("keeps a cart that was %s after the job selected it", async (_, change) => {
        const [cart] = await cartModule().createCarts([{ currency_code: "egp", email: "guest@test.dev", items: [whey] }])
        let job: Promise<number> | undefined
        await getContainer().resolve(Modules.LOCKING).execute(cart.id, async () => {
          job = removeAbandonedCarts(getContainer(), days(31))
          await sleep(1000) // the job lists the cart, then waits for this lock
          await change(cart.id)
        })
        expect(await job).toBe(0)
        expect(await exists(cart.id)).toBe(true)
      })
    })
  },
})
