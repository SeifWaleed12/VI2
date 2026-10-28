import { isCashOnDelivery, odooContactLockKey, odooOrderLines } from "../odoo-orders"

const order = {
  id: "order_1",
  items: [
    { variant_sku: "WHEY-1KG", quantity: 2, unit_price: 1500 },
    { variant_sku: "STACK-KIT", quantity: 1, unit_price: { value: "899.5", precision: 20 } },
  ],
  original_shipping_total: 60,
  discount_total: 150,
}

it("sends each product at its own price, then delivery and one discount line that add up to the order total", () => {
  const lines = odooOrderLines(order)
  expect(lines).toEqual([
    { sku: "WHEY-1KG", quantity: 2, unitPrice: 1500 },
    { sku: "STACK-KIT", quantity: 1, unitPrice: 899.5 },
    { sku: "WEB-SHIPPING", quantity: 1, unitPrice: 60 },
    { sku: "WEB-DISCOUNT", quantity: 1, unitPrice: -150 },
  ])
  // Medusa's total: items before discounts + delivery before discounts − discounts.
  expect(lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0)).toBe(3000 + 899.5 + 60 - 150)
})

it("adds no delivery or discount line when there is none", () => {
  expect(odooOrderLines({ ...order, original_shipping_total: 0, discount_total: null })).toHaveLength(2)
})

it("refuses an order line without a SKU", () => {
  expect(() => odooOrderLines({ id: "order_2", items: [{ variant_sku: null, quantity: 1, unit_price: 10 }] })).toThrow("Order order_2 has a line without a SKU")
})

it("treats only the system payment provider as cash on delivery", () => {
  expect(isCashOnDelivery({ id: "o", payment_collections: [{ payments: [{ provider_id: "pp_system_default" }] }] })).toBe(true)
  expect(isCashOnDelivery({ id: "o", payment_collections: [{ payments: [{ provider_id: "pp_paymob_card" }] }] })).toBe(false)
  expect(isCashOnDelivery({ id: "o", payment_collections: [{ payments: [] }] })).toBe(false)
  expect(isCashOnDelivery({ id: "o" })).toBe(false)
})

it("keys the contact lock by the trimmed, lower-cased email", () => {
  expect(odooContactLockKey(" Sara@Example.com ")).toBe(odooContactLockKey("sara@example.com"))
})
