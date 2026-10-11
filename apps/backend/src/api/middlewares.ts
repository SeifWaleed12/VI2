import { allowFields, authenticate, defineMiddlewares } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { ActorType } from "../lib/login-attempts"
import { adminAccess, unlessInviteAcceptance } from "./admin-access"
import { limitLoginAttempts, limitResetRequests } from "./login-rate-limit"
import { managerLayoutView } from "./manager-layouts"
import { requireStrongPassword } from "./password-policy"

// Staff and customers sign in, reset and set passwords through the same
// Medusa routes, so both get the same limits and password rule. Medusa signs in
// through GET as well as POST on the same path, so both methods are limited.
const emailPassRoutes = (["user", "customer"] as ActorType[]).flatMap((actor) => [
  { matcher: `/auth/${actor}/emailpass`, method: ["GET", "POST"] as ("GET" | "POST")[], middlewares: [limitLoginAttempts(actor)] },
  { matcher: `/auth/${actor}/emailpass/reset-password`, method: "POST" as const, middlewares: [limitResetRequests(actor)] },
  { matcher: `/auth/${actor}/emailpass/register`, method: "POST" as const, middlewares: [requireStrongPassword] },
  { matcher: `/auth/${actor}/emailpass/update`, method: "POST" as const, middlewares: [requireStrongPassword] },
])

// Our product data the storefront may request: the brand, and the EDA number
// with its approval (shown to customers by owner decision, 2026-10-09).
const STORE_PRODUCT_EXTRA_FIELDS = ["brand.name", "brand.status", "eda_registration.registration_number", "eda_registration.is_approved"]

export default defineMiddlewares({
  routes: [
    ...emailPassRoutes,
    { matcher: "/store/products", middlewares: [allowFields(...STORE_PRODUCT_EXTRA_FIELDS)] },
    { matcher: "/store/products/:id", middlewares: [allowFields(...STORE_PRODUCT_EXTRA_FIELDS)] },
    {
      matcher: "/admin/*",
      middlewares: [
        unlessInviteAcceptance(authenticate("user", ["session", "bearer"])),
        unlessInviteAcceptance(adminAccess),
        managerLayoutView,
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
      }],
    },
  ],
})
