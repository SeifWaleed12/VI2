import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Medusa picks a cart's customer by the email typed at checkout, so anyone
// could put an order into another person's account. Owner decision
// 2026-10-12: an order belongs to the signed-in customer who places it, and
// without a sign-in it is a guest order, whatever the email.
// shortcut: the customer is switched without repricing, fine while no prices or
// promotions depend on customer groups; use Medusa's transfer before payment
// if they ever do.
export async function assignOrderOwner(req: AuthenticatedMedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [cart] } = await query.graph({ entity: "cart", fields: ["id", "email", "completed_at", "customer.id", "customer.has_account"], filters: { id: req.params.id } })
  if (!cart || cart.completed_at || !cart.email) return next()

  const signedIn = req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : undefined
  const owner = signedIn ?? (cart.customer?.has_account ? await guestCustomerId(req, cart.email) : cart.customer?.id)
  if (owner && owner !== cart.customer?.id) {
    await req.scope.resolve(Modules.CART).updateCarts(cart.id, { customer_id: owner })
  }
  return next()
}

async function guestCustomerId(req: AuthenticatedMedusaRequest, email: string) {
  const customers = req.scope.resolve(Modules.CUSTOMER)
  const [guest] = await customers.listCustomers({ email, has_account: false })
  return (guest ?? await customers.createCustomers({ email, has_account: false })).id
}
