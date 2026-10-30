import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export async function customerReturnOnly(req: AuthenticatedMedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const body = (req.body ?? {}) as { order_id?: unknown, receive_now?: unknown, return_shipping?: { price?: unknown } }
  if (body.receive_now === true || body.return_shipping?.price !== undefined) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Only staff can receive returns or set return shipping prices.")
  }
  if (typeof body.order_id !== "string" || !body.order_id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "An order is required.")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [order] } = await query.graph({ entity: "order", fields: ["customer_id"], filters: { id: body.order_id as string } })
  if (!order || !req.auth_context.actor_id || order.customer_id !== req.auth_context.actor_id) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Returns require the order owner's login. Contact support for guest returns.")
  }
  return next()
}
