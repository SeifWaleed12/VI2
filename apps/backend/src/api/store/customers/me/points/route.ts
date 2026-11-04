import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { customerPoints, pendingPoints } from "../../../../../lib/points"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import type LoyaltyModuleService from "../../../../../modules/loyalty/service"

const HISTORY_SIZE = 20

// GET /store/customers/me/points: the signed-in customer's Vi2 Points.
// Medusa requires a customer session for /store/customers/me*.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const service = req.scope.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
  const [entries, { balance, expiresAt }, pending] = await Promise.all([
    service.listPointsEntries({ customer_id: customerId, points: { $ne: 0 } }, { order: { created_at: "DESC", id: "DESC" }, take: HISTORY_SIZE }),
    customerPoints(req.scope, customerId),
    pendingPoints(req.scope, customerId),
  ])
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
