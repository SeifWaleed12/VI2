import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { removeAbandonedCarts } from "../../src/jobs/remove-abandoned-carts"

jest.setTimeout(240 * 1000)

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("abandoned guest carts", () => {
      it("deletes only guest carts untouched for 30 days that never became an order", async () => {
        const carts = getContainer().resolve(Modules.CART)
        const [guest, customer, completed] = await carts.createCarts([
          { currency_code: "egp", email: "guest@test.dev", shipping_address: { first_name: "Sara", city: "Cairo", country_code: "eg" }, items: [{ title: "Whey", quantity: 1, unit_price: 1500 }] },
          { currency_code: "egp", customer_id: "cus_kept" },
          { currency_code: "egp" },
        ])
        await carts.updateCarts(completed.id, { completed_at: new Date() })

        // 29 days later nothing is old enough.
        expect(await removeAbandonedCarts(getContainer(), days(29))).toBe(0)
        // 31 days later only the guest cart goes, with its items and address.
        expect(await removeAbandonedCarts(getContainer(), days(31))).toBe(1)
        const left = await carts.listCarts({ id: [guest.id, customer.id, completed.id] })
        expect(left.map((cart) => cart.id).sort()).toEqual([customer.id, completed.id].sort())
        expect(await carts.listLineItems({ cart_id: guest.id })).toEqual([])
      })

      it("keeps a guest cart whose items changed recently", async () => {
        const carts = getContainer().resolve(Modules.CART)
        const [cart] = await carts.createCarts([{ currency_code: "egp", items: [{ title: "Whey", quantity: 1, unit_price: 1500 }] }])
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
    })
  },
})
