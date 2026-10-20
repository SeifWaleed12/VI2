import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ACTIVITY_KINDS, expiresAt, recordPoints } from "../lib/points"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"

const BATCH = 500

// P-7: a balance expires 12 months after the customer's last activity.
// shortcut: reads every entry and sums in code; move to a SQL sum per customer
// if customers reach the tens of thousands.
export async function expirePoints(container: MedusaContainer, now = new Date()) {
  const service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
  const customers = new Map<string, { balance: number, lastActivity: Date }>()
  for (let skip = 0; ; skip += BATCH) {
    const page = await service.listPointsEntries({}, { select: ["customer_id", "kind", "points", "created_at"], take: BATCH, skip, order: { id: "ASC" } })
    for (const entry of page) {
      const customer = customers.get(entry.customer_id) ?? { balance: 0, lastActivity: new Date(0) }
      customer.balance += entry.points
      if (ACTIVITY_KINDS.includes(entry.kind) && new Date(entry.created_at) > customer.lastActivity) customer.lastActivity = new Date(entry.created_at)
      customers.set(entry.customer_id, customer)
    }
    if (page.length < BATCH) break
  }
  let expired = 0
  for (const [customerId, { balance, lastActivity }] of customers) {
    const expiry = expiresAt(lastActivity)
    if (balance <= 0 || expiry > now) continue
    // One expiry per activity period: the source names the day it expired.
    const source = `${customerId}/${expiry.toISOString().slice(0, 10)}`
    if (await recordPoints(container, { customer_id: customerId, kind: "expire", points: -balance, source_id: source })) expired++
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
