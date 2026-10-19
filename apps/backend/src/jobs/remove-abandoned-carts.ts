import type { FilterableCartProps, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Seif (2026-10-19): guest carts nobody has touched for 30 days are deleted.
// Raise it to 60-90 days if abandoned-cart emails are added.
export const ABANDONED_AFTER_DAYS = 30
const BATCH = 200

// Deletes carts with no account that never became an order and were last
// changed (the cart or any of its items) more than 30 days ago. They hold a
// shopper's email and address, so they are not kept forever.
// shortcut: a deleted cart's unpaid payment collection stays (the system
// provider only), delete those too once a real payment provider stores data.
export async function removeAbandonedCarts(container: MedusaContainer, now = new Date()) {
  const carts = container.resolve(Modules.CART)
  const cutoff = new Date(now.getTime() - ABANDONED_AFTER_DAYS * 24 * 60 * 60 * 1000)
  // Medusa's filter type leaves out null and completed_at, but the cart module
  // passes them to the database as written (abandoned-carts.spec.ts runs it).
  const filters = { customer_id: null, completed_at: null, updated_at: { $lt: cutoff } } as unknown as FilterableCartProps
  let removed = 0
  let skip = 0
  for (;;) {
    const page = await carts.listCarts(
      filters,
      { relations: ["items"], take: BATCH, skip, order: { created_at: "ASC" } },
    )
    const stale = page.filter((cart) => (cart.items ?? []).every((item) => item.updated_at != null && new Date(item.updated_at) < cutoff)).map((cart) => cart.id)
    if (stale.length) {
      await container.resolve(ContainerRegistrationKeys.LINK).delete({ [Modules.CART]: { cart_id: stale } })
      await carts.deleteCarts(stale)
      removed += stale.length
    }
    // Carts kept on this page (an item changed recently) are skipped next time.
    skip += page.length - stale.length
    if (page.length < BATCH) return removed
  }
}

export default async function removeAbandonedCartsJob(container: MedusaContainer) {
  const removed = await removeAbandonedCarts(container)
  if (removed) container.resolve(ContainerRegistrationKeys.LOGGER).info(`Removed ${removed} abandoned guest carts`)
}

export const config = {
  name: "remove-abandoned-carts",
  schedule: "30 3 * * *", // every night at 03:30
}
