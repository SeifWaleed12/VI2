import { escapeHtml } from "./email-html"

export type ReceivedOrder = {
  id: string
  display_id?: number | string | null
  currency_code?: string | null
  item_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  total?: number | null
  items?: { title?: string | null, variant_title?: string | null, quantity?: number | null, total?: number | null }[] | null
  shipping_address?: { first_name?: string | null, address_1?: string | null, city?: string | null } | null
}

// One key per order: a redelivered "order placed" event never sends twice.
export const orderReceivedKey = (orderId: string) => `order-received:${orderId}`

const money = (value: number | null | undefined, currency: string) =>
  `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(Number(value ?? 0))} ${currency}`

// The store does not know the shopper's language for every order, so the email
// carries Arabic first, then English. It states only what is true when the
// order is placed: received, what was ordered, the totals and the address.
export function orderReceivedContent(order: ReceivedOrder) {
  const number = String(order.display_id ?? order.id)
  const currency = (order.currency_code ?? "egp").toUpperCase()
  const items = (order.items ?? []).map((item) => ({
    name: [item.title, item.variant_title].filter(Boolean).join(" - "),
    quantity: item.quantity ?? 1,
    total: money(item.total, currency),
  }))
  const discount = Number(order.discount_total ?? 0)
  const address = order.shipping_address
  const addressLine = [address?.address_1, address?.city].filter(Boolean).join(", ")
  const name = address?.first_name?.trim()

  const text = [
    `${name ? `أهلاً ${name}، ` : ""}استلمنا طلبك رقم #${number}. شكراً لاختيارك Vi2.`,
    "",
    `${name ? `Hi ${name}, ` : ""}we've received your order #${number}. Thank you for shopping with Vi2.`,
    "",
    ...items.map((item) => `${item.quantity} × ${item.name}: ${item.total}`),
    "",
    `Subtotal / المجموع: ${money(order.item_total, currency)}`,
    ...(discount > 0 ? [`Discount / الخصم: -${money(discount, currency)}`] : []),
    `Delivery / التوصيل: ${money(order.shipping_total, currency)}`,
    `Total / الإجمالي: ${money(order.total, currency)}`,
    ...(addressLine ? ["", `Delivery address / عنوان التوصيل: ${addressLine}`] : []),
  ].join("\n")

  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0">${label}</td><td style="padding:4px 0;text-align:right${bold ? ";font-weight:700" : ""}">${escapeHtml(value)}</td></tr>`
  const html = `<div style="font-family:Arial,sans-serif;color:#11110f;max-width:560px">`
    + `<p dir="rtl" style="text-align:right">${name ? `أهلاً ${escapeHtml(name)}، ` : ""}استلمنا طلبك رقم <strong>#${escapeHtml(number)}</strong>. شكراً لاختيارك Vi2.</p>`
    + `<p>${name ? `Hi ${escapeHtml(name)}, ` : ""}we've received your order <strong>#${escapeHtml(number)}</strong>. Thank you for shopping with Vi2.</p>`
    + `<table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd">`
    + items.map((item) => row(`${item.quantity} × ${escapeHtml(item.name)}`, item.total)).join("")
    + `</table><table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;margin-top:8px">`
    + row("Subtotal / المجموع", money(order.item_total, currency))
    + (discount > 0 ? row("Discount / الخصم", `-${money(discount, currency)}`) : "")
    + row("Delivery / التوصيل", money(order.shipping_total, currency))
    + row("Total / الإجمالي", money(order.total, currency), true)
    + `</table>`
    + (addressLine ? `<p>Delivery address / عنوان التوصيل:<br>${escapeHtml(addressLine)}</p>` : "")
    + `</div>`

  return { subject: `Vi2: order #${number} received | تم استلام طلبك #${number}`, text, html }
}
