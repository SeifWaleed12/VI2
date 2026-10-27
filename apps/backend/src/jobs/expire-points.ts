import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { customerPoints, expiresAt, recordPoints } from "../lib/points"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"

// P-7: a balance expires 12 months after the customer's last earning.
// Aggregate in persistence and retain only one page of customers at a time.
export async function expirePoints(container: MedusaContainer, now = new Date(), signal?: AbortSignal) {
  const service = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
  let expired = 0
  let after = ""
  for (;;) {
    signal?.throwIfAborted()
    const page = await service.customerPointPage(after)
    if (!page.length) return expired
    for (const row of page) {
      signal?.throwIfAborted()
      const customerId = row.customer_id
      const candidate = Number(row.balance) > 0 && row.last_activity ? expiresAt(row.last_activity) : null
      if (!candidate || candidate > now) continue
      // One expiry per activity period: the source names the day it expires.
      const day = candidate.toISOString().slice(0, 10)
      const removed = await recordPoints(container, { customer_id: customerId, kind: "expire", source_id: `${customerId}/${day}` }, async context => {
        // Decided again under the customer's lock: an earning since the scan
        // restarts the clock and keeps the whole balance.
        const current = await customerPoints(container, customerId, context)
        return current.expiresAt && current.expiresAt <= now && current.expiresAt.toISOString().slice(0, 10) === day ? -current.balance : null
      })
      if (removed) expired++
    }
    after = page[page.length - 1].customer_id
  }
}

export default async function expirePointsJob(container: MedusaContainer) {
  let entered = false
  const expired = await container.resolve(Modules.LOCKING).execute("job:expire-vi2-points", (signal?: AbortSignal) => {
    entered = true
    return expirePoints(container, new Date(), signal)
  }, { timeout: 1, expire: 300 }).catch((error: unknown) => {
    if (!entered && error instanceof MedusaError && error.type === MedusaError.Types.CONFLICT && error.message === "Timed-out acquiring lock.") return 0
    throw error
  })
  if (expired) container.resolve(ContainerRegistrationKeys.LOGGER).info(`Expired Vi2 Points for ${expired} customers`)
}

export const config = {
  name: "expire-vi2-points",
  schedule: "45 3 * * *", // every night at 03:45
}
