import { MathBN, MedusaError } from "@medusajs/framework/utils"

// The only payment method until Paymob; the storefront offers it as cash on delivery.
export const CASH_ON_DELIVERY_PROVIDER = "pp_system_default"
// Odoo service products staff create once (Internal References), so the Odoo
// order total matches what the customer pays.
export const SHIPPING_SKU = "WEB-SHIPPING"
export const DISCOUNT_SKU = "WEB-DISCOUNT"

export type OdooOrderLine = { sku: string, quantity: number, unitPrice: number }

export type WebsiteOrder = {
  id: string
  items?: { variant_sku?: string | null, quantity?: unknown, unit_price?: unknown }[] | null
  // Before discounts; discount_total covers item and delivery discounts.
  original_shipping_total?: unknown
  discount_total?: unknown
  payment_collections?: { payments?: { provider_id?: string | null }[] | null }[] | null
}

// Medusa returns amounts as big-number objects; Number() would give NaN.
const toNumber = (value: unknown) => MathBN.convert((value ?? 0) as number).toNumber()

// Products at their own price (a kit under its own SKU), then delivery, then
// one line for all discounts, so the lines add up to the order total.
export function odooOrderLines(order: WebsiteOrder): OdooOrderLine[] {
  const lines = (order.items ?? []).map((item) => {
    if (!item.variant_sku) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Order ${order.id} has a line without a SKU, so it cannot go to Odoo.`)
    return { sku: item.variant_sku, quantity: toNumber(item.quantity), unitPrice: toNumber(item.unit_price) }
  })
  const shipping = toNumber(order.original_shipping_total)
  const discount = toNumber(order.discount_total)
  if (shipping > 0) lines.push({ sku: SHIPPING_SKU, quantity: 1, unitPrice: shipping })
  if (discount > 0) lines.push({ sku: DISCOUNT_SKU, quantity: 1, unitPrice: -discount })
  return lines
}

export const isCashOnDelivery = (order: WebsiteOrder) =>
  (order.payment_collections ?? []).some((collection) => (collection.payments ?? []).some((payment) => payment.provider_id === CASH_ON_DELIVERY_PROVIDER))

// One lock per email, shared by the customer and order pushes (plan 2.1).
export const odooContactLockKey = (email: string) => `odoo-contact:${email.trim().toLowerCase()}`
