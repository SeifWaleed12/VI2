import { allowFields, authenticate, defineMiddlewares, type MedusaNextFunction, type MedusaRequest, type MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { ActorType } from "../lib/login-attempts"
import { adminAccess, unlessInviteAcceptance } from "./admin-access"
import { limitLoginAttempts, limitResetRequests } from "./login-rate-limit"
import { managerLayoutView } from "./manager-layouts"
import { assignOrderOwner, cartOwnerOnly, noEmailOnNewGuestCart } from "./cart-access"
import { filterProductsByBrand } from "./catalog-filters"
import { requireStrongPassword } from "./password-policy"
import { cacheStoreGet, invalidateStoreCacheAfterWrite } from "../lib/store-cache"

// Staff and customers sign in, reset and set passwords through the same
// Medusa routes, so both get the same limits and password rule. Medusa signs in
// through GET as well as POST on the same path, so both methods are limited.
const emailPassRoutes = (["user", "customer"] as ActorType[]).flatMap((actor) => [
  { matcher: `/auth/${actor}/emailpass`, method: ["GET", "POST"] as ("GET" | "POST")[], middlewares: [limitLoginAttempts(actor)] },
  { matcher: `/auth/${actor}/emailpass/reset-password`, method: "POST" as const, middlewares: [limitResetRequests(actor)] },
  { matcher: `/auth/${actor}/emailpass/register`, method: "POST" as const, middlewares: [requireStrongPassword] },
  { matcher: `/auth/${actor}/emailpass/update`, method: "POST" as const, middlewares: [requireStrongPassword] },
])

// Product data the storefront may request beyond Medusa's defaults: the brand,
// the EDA number with its approval (shown to customers by owner decision,
// 2026-10-09), and category fields Medusa only allows as a whole relation.
const STORE_PRODUCT_EXTRA_FIELDS = ["brand.id", "brand.name", "brand.status", "eda_registration.registration_number", "eda_registration.is_approved", "categories.id", "categories.name", "categories.handle"]

// Public catalog reads answered from Redis (lib/store-cache.ts). Products stay
// short because their prices change most; the rest change rarely.
const cachedCatalogRoutes = ([
  ["/store/products", 60],
  ["/store/product-categories", 300],
  ["/store/collections", 300],
  ["/store/regions", 600],
  ["/store/brands", 300],
  ["/store/product-tags", 300],
  ["/store/deals", 60],
] as const).flatMap(([path, ttl]) => [path, `${path}/:id`].map((matcher) => ({ matcher, method: "GET" as const, middlewares: [cacheStoreGet(ttl)] })))

// The store only delivers in Egypt, so saved addresses are Egyptian too. A new
// address must say so; an update may leave the country out.
const egyptOnly = (required: boolean) => (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) => {
  const country = (req.body as { country_code?: unknown } | undefined)?.country_code
  if ((required || country !== undefined) && (typeof country !== "string" || country.trim().toLowerCase() !== "eg")) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "We only deliver in Egypt. Set country_code to \"eg\".")
  }
  return next()
}

// Store cart routes do not read the customer's login on their own.
const customerIfSignedIn = authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })

export default defineMiddlewares({
  routes: [
    ...emailPassRoutes,
    ...cachedCatalogRoutes,
    { matcher: "/store/products", middlewares: [filterProductsByBrand, allowFields(...STORE_PRODUCT_EXTRA_FIELDS)] },
    { matcher: "/store/products/:id", middlewares: [allowFields(...STORE_PRODUCT_EXTRA_FIELDS)] },
    // Without a method these also cover every path under them (src/api/cart-access.ts).
    { matcher: "/store/carts/:id", middlewares: [customerIfSignedIn, cartOwnerOnly] },
    { matcher: "/store/payment-collections", middlewares: [customerIfSignedIn, cartOwnerOnly] },
    { matcher: "/store/carts", method: "POST", middlewares: [customerIfSignedIn, noEmailOnNewGuestCart] },
    { matcher: "/store/customers/me/addresses", method: "POST", middlewares: [egyptOnly(true)] },
    { matcher: "/store/customers/me/addresses/:address_id", method: "POST", middlewares: [egyptOnly(false)] },
    {
      matcher: "/admin/*",
      middlewares: [
        unlessInviteAcceptance(authenticate("user", ["session", "bearer"])),
        unlessInviteAcceptance(adminAccess),
        managerLayoutView,
        // Last, so a refused request never clears the cache.
        invalidateStoreCacheAfterWrite,
      ],
    },
    {
      // Medusa stores export files at a public address (R2, or the local
      // static folder), and order exports hold customer names, emails and
      // addresses. Owner decision 2026-10-11: storage is for images only.
      matcher: "/admin/orders/export",
      method: "POST",
      middlewares: [() => {
        throw new MedusaError(MedusaError.Types.FORBIDDEN, "Order export is turned off because the file would hold customer details at a public address.")
      }],
    },
    {
      matcher: "/store/carts/:id/complete",
      method: "POST",
      middlewares: [(_req, _res, next) => {
        // Remove this gate only when an approved production provider flow is
        // implemented and verified. The system provider is not COD or Paymob.
        if (process.env.NODE_ENV === "production") {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Production checkout is not configured")
        }
        return next()
      }, customerIfSignedIn, assignOrderOwner],
    },
  ],
})
