import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ACTIVITY_KINDS, expiresAt, isFullyDelivered, POINTS_ORDER_FIELDS, pointsFor } from "../../../../../lib/points"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import type LoyaltyModuleService from "../../../../../modules/loyalty/service"

const HISTORY_SIZE = 20

// GET /store/customers/me/points: the signed-in customer's Vi2 Points.
// Medusa requires a customer session for /store/customers/me*.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const entries = await req.scope.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
    .listPointsEntries({ customer_id: customerId }, { order: { created_at: "DESC" } })
  const balance = entries.reduce((sum, entry) => sum + entry.points, 0)
  const lastActivity = entries.find((entry) => ACTIVITY_KINDS.includes(entry.kind))?.created_at
  // P-6: placed orders that are not delivered (or canceled) yet show as pending.
  const earned = new Set(entries.filter((entry) => entry.kind === "earn").map((entry) => entry.source_id))
  const { data: orders } = await req.scope.resolve(ContainerRegistrationKeys.QUERY)
    .graph({ entity: "order", fields: POINTS_ORDER_FIELDS, filters: { customer_id: customerId } })
  const pending = orders
    .filter((order) => order.status !== "canceled" && !earned.has(order.id) && !isFullyDelivered(order as never))
    .reduce((sum, order) => sum + pointsFor(order.item_total), 0)
  return res.json({
    points: {
      balance,
      pending,
      expires_at: balance > 0 && lastActivity ? expiresAt(lastActivity).toISOString() : null,
      history: entries.slice(0, HISTORY_SIZE).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        points: entry.points,
        order_id: entry.kind === "expire" ? null : entry.source_id.split("/")[0],
        created_at: entry.created_at,
      })),
    },
  })
}
