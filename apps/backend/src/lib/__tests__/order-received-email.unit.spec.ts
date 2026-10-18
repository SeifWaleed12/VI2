import { orderReceivedContent, orderReceivedKey } from "../order-received-email"

const order = {
  id: "order_1",
  display_id: 1042,
  currency_code: "egp",
  item_total: 3000,
  shipping_total: 70,
  discount_total: 0,
  total: 3070,
  items: [{ title: "Whey", variant_title: "Chocolate", quantity: 2, total: 3000 }],
  shipping_address: { first_name: "Sara", address_1: "Tahrir Square", city: "Cairo" },
}

it("names the order, the items, the totals and the address, in Arabic and English", () => {
  const { subject, text, html } = orderReceivedContent(order)
  expect(subject).toBe("Vi2: order #1042 received | تم استلام طلبك #1042")
  for (const part of ["استلمنا طلبك رقم #1042", "we've received your order #1042", "2 × Whey - Chocolate: 3,000 EGP", "Delivery / التوصيل: 70 EGP", "Total / الإجمالي: 3,070 EGP", "Tahrir Square, Cairo"]) {
    expect(text).toContain(part)
  }
  expect(text).not.toContain("Discount")
  expect(html).toContain("3,070 EGP")
  expect(html).toContain('dir="rtl"')
})

it("shows a discount only when there is one", () => {
  expect(orderReceivedContent({ ...order, discount_total: 150, total: 2920 }).text).toContain("Discount / الخصم: -150 EGP")
})

it("escapes what the shopper typed", () => {
  const { html } = orderReceivedContent({ ...order, shipping_address: { first_name: "<b>Sara</b>", address_1: "<img src=x>", city: "Cairo" } })
  expect(html).not.toContain("<b>Sara")
  expect(html).not.toContain("<img")
  expect(html).toContain("&lt;b&gt;Sara&lt;/b&gt;")
})

it("still makes a complete email without a name, address or items", () => {
  const { subject, text } = orderReceivedContent({ id: "order_2", total: 0 })
  expect(subject).toContain("#order_2")
  expect(text).toContain("Total / الإجمالي: 0 EGP")
  expect(text).not.toContain("Delivery address")
})

it("uses one key per order, so a repeated event sends nothing new", () => {
  expect(orderReceivedKey("order_1")).toBe(orderReceivedKey("order_1"))
  expect(orderReceivedKey("order_1")).not.toBe(orderReceivedKey("order_2"))
})
