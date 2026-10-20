import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"

// Vi2 Points rules (Seif, 2026-10-20; P-n are the rules in
// docs/reviews/account-page-backend.md).
export const POINTS_PER_EGP = 1
export const EXPIRE_AFTER_MONTHS = 12

export type PointsKind = "earn" | "refund" | "expire"
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

type Entry = { kind: PointsKind, points: number, created_at: Date | string }

// P-7, P-13: the balance is the sum of the history; the expiry clock runs from
// the last earning.
export function summarize(entries: Entry[]) {
  let balance = 0
  let lastActivity: Date | null = null
  for (const entry of entries) {
    balance += entry.points
    const at = new Date(entry.created_at)
    if (ACTIVITY_KINDS.includes(entry.kind) && (!lastActivity || at > lastActivity)) lastActivity = at
  }
  return { balance, lastActivity, expiresAt: balance > 0 && lastActivity ? expiresAt(lastActivity) : null }
}

const loyalty = (container: MedusaContainer) => container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)

export async function customerPoints(container: MedusaContainer, customerId: string) {
  return summarize(await loyalty(container).listPointsEntries({ customer_id: customerId }, { select: ["kind", "points", "created_at"] }))
}

// Points the order still holds: earned on delivery minus what its refunds removed (P-8).
export async function orderPointsLeft(container: MedusaContainer, orderId: string) {
  const entries = await loyalty(container).listPointsEntries(
    { $or: [{ kind: "earn", source_id: orderId }, { kind: "refund", source_id: { $like: `${orderId}/%` } }] },
    { select: ["points"] },
  )
  return entries.reduce((sum, entry) => sum + entry.points, 0)
}

// The order's refunds, from its payments (where Medusa records them).
export async function orderRefunds(container: MedusaContainer, orderId: string) {
  const { data: [order] } = await container.resolve(ContainerRegistrationKeys.QUERY)
    .graph({ entity: "order", fields: ["payment_collections.payments.refunds.id", "payment_collections.payments.refunds.amount"], filters: { id: orderId } })
  type Collections = { payments?: { refunds?: { id: string, amount: unknown }[] | null }[] | null }[] | null
  return ((order?.payment_collections ?? []) as Collections ?? []).flatMap((collection) => (collection.payments ?? []).flatMap((payment) => payment.refunds ?? []))
}

// For an order that earns now (call under the customer's lock): refunds made
// before delivery are taken off what it earns, and marked used, so their
// events change nothing later (P-8, P-10).
export async function takeEarlierRefunds(container: MedusaContainer, customerId: string, orderId: string) {
  const service = loyalty(container)
  let points = 0
  for (const refund of await orderRefunds(container, orderId)) {
    points += pointsFor(refund.amount)
    const source_id = `${orderId}/${refund.id}`
    if (!(await service.listPointsEntries({ kind: "refund", source_id }, { select: ["id"] })).length) {
      await service.createPointsEntries({ customer_id: customerId, kind: "refund", source_id, points: 0 })
    }
  }
  return points
}

type Source = { customer_id: string, kind: PointsKind, source_id: string }

// Every change goes through here (P-9 to P-11). Under the customer's lock:
// a source already recorded is ignored; `amount` is worked out (null = not due,
// nothing written); a removal stops at a zero balance and at `limit`. The entry
// is written even when capped to 0, so a retried event stays used up (P-10).
// Returns the points written.
export async function recordPoints(
  container: MedusaContainer,
  source: Source,
  amount: () => Promise<number | null> | number | null,
  limit?: () => Promise<number>,
) {
  return container.resolve(Modules.LOCKING).execute(`points:${source.customer_id}`, async () => {
    const service = loyalty(container)
    if ((await service.listPointsEntries({ kind: source.kind, source_id: source.source_id }, { select: ["id"] })).length) return 0
    let points = await amount()
    if (points === null) return 0
    if (points < 0) {
      const { balance } = await customerPoints(container, source.customer_id)
      points = -cappedRemoval(-points, balance, limit ? await limit() : Infinity)
    }
    await service.createPointsEntries({ ...source, points })
    return points
  }, { timeout: 10 })
}
