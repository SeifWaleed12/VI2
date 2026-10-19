import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { requestPath } from "./admin-access"

// Owner decisions 2026-10-12 and 2026-10-13. In Medusa anyone holding a cart id
// can use the cart, and a cart's customer is picked by the email typed at
// checkout. Here:
// - only a login makes a cart a customer's: signing in to create it, linking
//   it (POST /store/carts/:id/customer), or placing the order;
// - a cart that belongs to a registered customer can only be read, changed or
//   completed with that customer's login;
// - typing an email never attaches an account; the cart stays a guest cart.

type Request = AuthenticatedMedusaRequest<{ email?: unknown, cart_id?: unknown }>

const signedInCustomer = (req: Request) =>
  req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : undefined

async function ownedCart(req: Request, cartId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [cart] } = await query.graph({ entity: "cart", fields: ["id", "email", "completed_at", "customer.id", "customer.has_account"], filters: { id: cartId } })
  if (cart?.customer?.has_account && cart.customer.id !== signedInCustomer(req)) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "This cart belongs to a customer account. Sign in to that account to use it.")
  }
  return cart
}

async function guestCustomerId(req: Request, email: string) {
  const customers = req.scope.resolve(Modules.CUSTOMER)
  const [guest] = await customers.listCustomers({ email, has_account: false })
  return (guest ?? await customers.createCustomers({ email, has_account: false })).id
}

// Medusa's cart workflows and the abandoned-cart job (jobs/remove-abandoned-carts.ts)
// lock a cart by its id; the owner changes here take the same lock, so a cart
// can't be claimed between the job's last check and its deletion.
const withCartLock = (req: Request, cartId: string, job: () => Promise<unknown>) =>
  req.scope.resolve(Modules.LOCKING).execute(cartId, job, { timeout: 5 })

async function cartIdOf(req: Request) {
  const [, , area, id] = requestPath(req).split("/")
  if (area === "carts") return id
  if (!id) return typeof req.body?.cart_id === "string" ? req.body.cart_id : undefined
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [collection] } = await query.graph({ entity: "payment_collection", fields: ["cart.id"], filters: { id } })
  return (collection as { cart?: { id: string } } | undefined)?.cart?.id
}

// Mounted on /store/carts/:id and /store/payment-collections, with every path
// under them.
export async function cartOwnerOnly(req: Request, _res: MedusaResponse, next: MedusaNextFunction) {
  const cartId = await cartIdOf(req)
  const cart = cartId ? await ownedCart(req, cartId) : undefined
  const settingEmail = req.method === "POST" && /^\/store\/carts\/[^/]+$/.test(requestPath(req)) && typeof req.body?.email === "string"
  if (cart && !cart.customer?.has_account && settingEmail) {
    // Medusa keeps the cart's current guest when its email matches, so it
    // does not look the email up among accounts.
    const email = (req.body!.email as string).trim().toLowerCase()
    const guestId = await guestCustomerId(req, email)
    await withCartLock(req, cart.id, () => req.scope.resolve(Modules.CART).updateCarts(cart.id, { customer_id: guestId }))
  }
  return next()
}

// Medusa creates a cart for the email it is given, which may be an account's.
export function noEmailOnNewGuestCart(req: Request, _res: MedusaResponse, next: MedusaNextFunction) {
  if (!signedInCustomer(req) && req.body?.email !== undefined) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Create the cart first, then add the email.")
  }
  return next()
}

// An order belongs to the customer signed in when it is placed; without a
// sign-in it is a guest order. The owner check is repeated here because Medusa
// orders route middlewares by path shape, not by this file.
// shortcut: the customer is switched without repricing, fine while no prices or
// promotions depend on customer groups; use Medusa's transfer before payment
// if they ever do.
export async function assignOrderOwner(req: Request, _res: MedusaResponse, next: MedusaNextFunction) {
  const cart = await ownedCart(req, req.params.id)
  const signedIn = signedInCustomer(req)
  if (cart && !cart.completed_at && signedIn && signedIn !== cart.customer?.id) {
    await withCartLock(req, cart.id, () => req.scope.resolve(Modules.CART).updateCarts(cart.id, { customer_id: signedIn }))
  }
  return next()
}
