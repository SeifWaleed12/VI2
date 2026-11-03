import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { customerPoints, isFullyDelivered, POINTS_ORDER_FIELDS, pointsFor } from "../../../../../lib/points"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import type LoyaltyModuleService from "../../../../../modules/loyalty/service"

const HISTORY_SIZE = 20

// GET /store/customers/me/points: the signed-in customer's Vi2 Points.
// Medusa requires a customer session for /store/customers/me*.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const service = req.scope.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
  const [entries, { balance, expiresAt }] = await Promise.all([
    service.listPointsEntries({ customer_id: customerId, points: { $ne: 0 } }, { order: { created_at: "DESC", id: "DESC" }, take: HISTORY_SIZE }),
    customerPoints(req.scope, customerId),
  ])
  // P-6: placed orders that are not delivered (or canceled) yet show as pending.
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  let pending = 0
  for (let skip = 0; ; skip += 100) {
    const { data: candidates } = await query.graph({ entity: "order", fields: ["id"],
      filters: { customer_id: customerId, status: { $ne: "canceled" } }, pagination: { skip, take: 100, order: { id: "ASC" } } })
    if (!candidates.length) break
    const earned = new Set((await service.listPointsEntries({ customer_id: customerId, kind: "earn", source_id: candidates.map(order => order.id) }, { select: ["source_id"], take: 100 })).map(entry => entry.source_id))
    const ids = candidates.map(order => order.id).filter(id => !earned.has(id))
    if (ids.length) {
      const { data: orders } = await query.graph({ entity: "order", fields: POINTS_ORDER_FIELDS, filters: { id: ids, customer_id: customerId } })
      pending += orders.filter(order => order.status !== "canceled" && !isFullyDelivered(order as never)).reduce((sum, order) => sum + pointsFor(order.item_total), 0)
    }
    if (candidates.length < 100) break
  }
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
