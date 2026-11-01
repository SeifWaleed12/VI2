import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows"

const ORDER_FIELDS = ["id", "display_id", "status", "payment_status", "currency_code", "total", "created_at"]
const ITEM_FIELDS = ["id", "title", "quantity", "unit_price", "total"]
const pick = (value: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map(key => [key, value[key]]))

// An order link grants receipt access only. Customer history is separately
// authenticated; query parameters must never expand this public capability.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await getOrderDetailWorkflow(req.scope).run({ input: {
    order_id: req.params.id,
    filters: { is_draft_order: false },
    fields: [...ORDER_FIELDS, ...ITEM_FIELDS.map(field => `items.${field}`)],
  } })
  const order = result as unknown as Record<string, unknown>
  const items = Array.isArray(order.items) ? order.items.map(item => pick(item, ITEM_FIELDS)) : []
  return res.status(200).json({ order: { ...pick(order, ORDER_FIELDS), items } })
}
