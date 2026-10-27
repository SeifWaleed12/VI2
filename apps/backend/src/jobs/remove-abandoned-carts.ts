import type { FilterableCartProps, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

// Seif (2026-10-19): guest carts nobody has touched for 30 days are deleted.
// Raise it to 60-90 days if abandoned-cart emails are added.
export const ABANDONED_AFTER_DAYS = 30
const BATCH = 200
// Seconds to wait for a cart another request is changing; a busy cart is kept.
const LOCK_TIMEOUT = 5

// Deletes guest carts that never became an order and were last changed (the
// cart or any of its items) more than 30 days ago, with their items, addresses
// and links: they hold a shopper's email and address. A guest checkout has a
// customer record without an account (cart-access.ts), so only carts of
// registered customers are kept.
// shortcut: a deleted cart's unpaid payment collection stays (the system
// provider only), delete those too once a real payment provider stores data.
export async function removeAbandonedCarts(container: MedusaContainer, now = new Date(), signal?: AbortSignal) {
  const carts = container.resolve(Modules.CART)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const locking = container.resolve(Modules.LOCKING)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cutoff = new Date(now.getTime() - ABANDONED_AFTER_DAYS * 24 * 60 * 60 * 1000)
  const old = (date: unknown) => date != null && new Date(date as string) < cutoff

  // Read under the cart's lock, so the answer still holds when it is deleted.
  async function abandoned(id: string) {
    const { data: [cart] } = await query.graph({
      entity: "cart",
      fields: ["id", "completed_at", "updated_at", "shipping_address_id", "billing_address_id", "customer.has_account", "items.updated_at"],
      filters: { id },
    })
    const items = (cart?.items ?? []) as { updated_at: unknown }[]
    return cart && !cart.completed_at && !cart.customer?.has_account && old(cart.updated_at) && items.every((item) => old(item.updated_at)) ? cart : null
  }

  async function remove(id: string) {
    const cart = await abandoned(id)
    if (!cart) return false
    const addressIds = [...new Set([cart.shipping_address_id, cart.billing_address_id].filter((a): a is string => !!a))]
    await link.delete({ [Modules.CART]: { cart_id: id } })
    await carts.deleteCarts(id)
    // The cart module keeps addresses when a cart is deleted; remove the ones
    // no other cart uses.
    const users = addressIds.length
      ? await carts.listCarts({ $or: [{ shipping_address_id: addressIds }, { billing_address_id: addressIds }] } as unknown as FilterableCartProps, { select: ["id"], relations: ["shipping_address", "billing_address"] })
      : []
    const shared = new Set(users.flatMap((c) => [c.shipping_address?.id, c.billing_address?.id]))
    const own = addressIds.filter((a) => !shared.has(a))
    if (own.length) await carts.deleteAddresses(own)
    return true
  }

  // Medusa's filter type leaves out null and completed_at, but the cart module
  // passes them to the database as written (abandoned-carts.spec.ts runs it).
  const filters = { completed_at: null, updated_at: { $lt: cutoff } } as unknown as FilterableCartProps
  let removed = 0
  let skip = 0
  for (;;) {
    signal?.throwIfAborted()
    const page = await carts.listCarts(filters, { select: ["id"], take: BATCH, skip, order: { created_at: "ASC" } })
    let kept = page.length
    for (const { id } of page) {
      signal?.throwIfAborted()
      // Medusa's cart workflows (add, update, complete, transfer to a
      // customer) lock the cart by its id, so none can change it in between.
      const gone = await locking.execute(id, () => remove(id), { timeout: LOCK_TIMEOUT }).catch((error: Error) => {
        logger.warn(`Abandoned cart ${id} kept: ${error.message}`)
        return false
      })
      if (gone) {
        removed++
        kept--
      }
    }
    // Carts kept on this page are skipped next time; deleted ones are gone.
    skip += kept
    if (page.length < BATCH) return removed
  }
}

export default async function removeAbandonedCartsJob(container: MedusaContainer) {
  let entered = false
  const removed = await container.resolve(Modules.LOCKING).execute("job:remove-abandoned-carts", (signal?: AbortSignal) => {
    entered = true
    return removeAbandonedCarts(container, new Date(), signal)
  }, { timeout: 1, expire: 300 }).catch((error: unknown) => {
    if (!entered && error instanceof MedusaError && error.type === MedusaError.Types.CONFLICT && error.message === "Timed-out acquiring lock.") return 0
    throw error
  })
  if (removed) container.resolve(ContainerRegistrationKeys.LOGGER).info(`Removed ${removed} abandoned guest carts`)
}

export const config = {
  name: "remove-abandoned-carts",
  schedule: "30 3 * * *", // every night at 03:30
}
