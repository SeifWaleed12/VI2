import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { customerPoints, recordPoints, summarize } from "../lib/points"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"

const BATCH = 500

// P-7: a balance expires 12 months after the customer's last earning.
// shortcut: reads every entry and sums in code to find candidates; move to a
// SQL sum per customer if customers reach the tens of thousands.
export async function expirePoints(container: MedusaContainer, now = new Date()) {
  const service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
  const byCustomer = new Map<string, { kind: "earn" | "refund" | "expire", points: number, created_at: Date }[]>()
  for (let skip = 0; ; skip += BATCH) {
    const page = await service.listPointsEntries({}, { select: ["customer_id", "kind", "points", "created_at"], take: BATCH, skip, order: { id: "ASC" } })
    for (const entry of page) byCustomer.set(entry.customer_id, [...(byCustomer.get(entry.customer_id) ?? []), entry])
    if (page.length < BATCH) break
  }
  let expired = 0
  for (const [customerId, entries] of byCustomer) {
    const candidate = summarize(entries).expiresAt
    if (!candidate || candidate > now) continue
    // One expiry per activity period: the source names the day it expires.
    const day = candidate.toISOString().slice(0, 10)
    const removed = await recordPoints(container, { customer_id: customerId, kind: "expire", source_id: `${customerId}/${day}` }, async () => {
      // Decided again under the customer's lock: an earning since the scan
      // restarts the clock and keeps the whole balance.
      const current = await customerPoints(container, customerId)
      return current.expiresAt && current.expiresAt <= now && current.expiresAt.toISOString().slice(0, 10) === day ? -current.balance : null
    })
    if (removed) expired++
  }
  return expired
}

export default async function expirePointsJob(container: MedusaContainer) {
  const expired = await expirePoints(container)
  if (expired) container.resolve(ContainerRegistrationKeys.LOGGER).info(`Expired Vi2 Points for ${expired} customers`)
}

export const config = {
  name: "expire-vi2-points",
  schedule: "45 3 * * *", // every night at 03:45
}
