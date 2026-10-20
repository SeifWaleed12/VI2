import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isFullyDelivered, POINTS_ORDER_FIELDS, pointsFor, summarize } from "../../../../../lib/points"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import type LoyaltyModuleService from "../../../../../modules/loyalty/service"

const HISTORY_SIZE = 20

// GET /store/customers/me/points: the signed-in customer's Vi2 Points.
// Medusa requires a customer session for /store/customers/me*.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const entries = await req.scope.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
    .listPointsEntries({ customer_id: customerId }, { order: { created_at: "DESC" } })
  const { balance, expiresAt } = summarize(entries)
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
      expires_at: expiresAt?.toISOString() ?? null,
      // Entries capped to 0 only mark an event as used; they are not shown.
      history: entries.filter((entry) => entry.points !== 0).slice(0, HISTORY_SIZE).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        points: entry.points,
        order_id: entry.kind === "expire" ? null : entry.source_id.split("/")[0],
        created_at: entry.created_at,
      })),
    },
  })
}
