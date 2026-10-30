import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ChangeActionType, ContainerRegistrationKeys, MathBN, MedusaError, Modules, OrderChangeStatus } from "@medusajs/framework/utils"
import { returnReceiptProblem } from "../lib/return-receipt"

type NativeHandler = (req: AuthenticatedMedusaRequest, res: MedusaResponse) => Promise<unknown>
const number = (value: unknown) => MathBN.convert((value ?? 0) as number).toNumber()

async function checkReceipt(req: AuthenticatedMedusaRequest, orderId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: changes } = await query.graph({ entity: "order_change", fields: ["id", "actions.action", "actions.details"], filters: { order_id: orderId, return_id: req.params.id, status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED] } })
  if (changes.length !== 1) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This return has no active receipt request.")
  const incoming = new Map<string, number>()
  for (const action of changes[0].actions ?? []) {
    if (![ChangeActionType.RECEIVE_RETURN_ITEM, ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM].includes(action.action as never)) continue
    const details = action.details as { reference_id: string, quantity: unknown }
    const quantity = number(details.quantity)
    if (!details.reference_id || !Number.isFinite(quantity) || quantity <= 0) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid return quantity.")
    incoming.set(details.reference_id, (incoming.get(details.reference_id) ?? 0) + quantity)
  }
  const { data: [order] } = await query.graph({ entity: "order", fields: ["id", "items.id", "items.detail.shipped_quantity", "items.detail.return_received_quantity", "items.detail.return_dismissed_quantity"], filters: { id: orderId } })
  for (const [id, quantity] of incoming) {
    const detail = order?.items?.find(item => item.id === id)?.detail
    if (!detail) throw new MedusaError(MedusaError.Types.INVALID_DATA, "The returned order item was not found.")
    const problem = returnReceiptProblem(number(detail.shipped_quantity), number(detail.return_received_quantity), number(detail.return_dismissed_quantity), quantity)
    if (problem) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, problem)
  }
}

// Receipt and all edits to its pending actions share one native distributed
// order lock. The lock covers the awaited workflow, not the client connection.
export async function withReturnMutation(req: AuthenticatedMedusaRequest, res: MedusaResponse, native: NativeHandler, confirm = false) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [orderReturn] } = await query.graph({ entity: "return", fields: ["order_id"], filters: { id: req.params.id } })
  if (!orderReturn?.order_id) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Return not found.")
  const send = res.json.bind(res)
  let payload: unknown
  res.json = body => { payload = body; return res }
  try {
    await req.scope.resolve(Modules.LOCKING).execute(`order-return-receipt:${orderReturn.order_id}`, async (signal?: AbortSignal) => {
      signal?.throwIfAborted()
      if (confirm) await checkReceipt(req, orderReturn.order_id)
      signal?.throwIfAborted()
      await native(req, res)
      signal?.throwIfAborted()
    }, { timeout: 5, expire: 120 })
  } finally { res.json = send }
  return send(payload)
}
