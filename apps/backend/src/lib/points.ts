import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"

// Vi2 Points rules (Seif, 2026-10-20; P-n are the rules in
// docs/reviews/account-page-backend.md).
export const POINTS_PER_EGP = 1
export const EXPIRE_AFTER_MONTHS = 12

export type PointsKind = "earn" | "return" | "expire"
// What restarts the 12-month expiry clock (P-7). Spending joins it later.
export const ACTIVITY_KINDS: PointsKind[] = ["earn"]

// Medusa computes order totals from the items and shipping methods it loads,
// so their fields are loaded; item details carry the delivered quantity.
export const POINTS_ORDER_FIELDS = ["id", "status", "customer_id", "customer.has_account", "item_total", "items.*", "items.detail.*", "shipping_methods.*"]

type PointsOrder = {
  status?: string
  customer?: { has_account?: boolean } | null
  items?: { quantity?: unknown, detail?: { delivered_quantity?: unknown } | null }[] | null
}

// P-1, P-3: whole points for an amount in EGP, rounded down, never negative.
export const pointsFor = (egp: unknown) => Math.max(0, Math.floor(Number(egp ?? 0) * POINTS_PER_EGP))

export const isFullyDelivered = (order: PointsOrder) =>
  !!order.items?.length && order.items.every((item) => Number(item.detail?.delivered_quantity ?? 0) >= Number(item.quantity ?? 0))

// P-4, P-5: a registered customer's order earns once it is fully delivered.
export const earnsPoints = (order: PointsOrder | undefined) =>
  !!order && order.status !== "canceled" && !!order.customer?.has_account && isFullyDelivered(order)

export function expiresAt(lastActivity: Date | string) {
  const date = new Date(lastActivity)
  date.setUTCMonth(date.getUTCMonth() + EXPIRE_AFTER_MONTHS)
  return date
}

// P-9: a removal stops at a zero balance (and at any other limit given).
export const cappedRemoval = (wanted: number, ...limits: number[]) => Math.max(0, Math.min(wanted, ...limits))

const loyalty = (container: MedusaContainer) => container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)

export async function balanceOf(container: MedusaContainer, customerId: string) {
  const entries = await loyalty(container).listPointsEntries({ customer_id: customerId }, { select: ["points"] })
  return entries.reduce((sum, entry) => sum + entry.points, 0)
}

// Points the order still holds: earned on delivery minus what its returns removed (P-8).
export async function orderPointsLeft(container: MedusaContainer, orderId: string) {
  const entries = await loyalty(container).listPointsEntries(
    { $or: [{ kind: "earn", source_id: orderId }, { kind: "return", source_id: { $like: `${orderId}/%` } }] },
    { select: ["points"] },
  )
  return entries.reduce((sum, entry) => sum + entry.points, 0)
}

type NewEntry = { customer_id: string, kind: PointsKind, points: number, source_id: string }

// Every change goes through here (P-9 to P-11): one change per customer at a
// time; a repeated (kind, source) is ignored; a removal stops at a zero
// balance and at `limit`, read under the same lock. Returns the points written.
export async function recordPoints(container: MedusaContainer, entry: NewEntry, limit?: () => Promise<number>) {
  return container.resolve(Modules.LOCKING).execute(`points:${entry.customer_id}`, async () => {
    const service = loyalty(container)
    if ((await service.listPointsEntries({ kind: entry.kind, source_id: entry.source_id }, { select: ["id"] })).length) return 0
    let points = entry.points
    if (points < 0) {
      points = -cappedRemoval(-points, await balanceOf(container, entry.customer_id), limit ? await limit() : Infinity)
    }
    if (points === 0) return 0
    await service.createPointsEntries({ ...entry, points })
    return points
  }, { timeout: 10 })
}
