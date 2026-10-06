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

export default defineMiddlewares({
  routes: [
    ...emailPassRoutes,
    { matcher: "/store/products", middlewares: [allowFields("brand.name", "brand.status")] },
    { matcher: "/store/products/:id", middlewares: [allowFields("brand.name", "brand.status")] },
    {
      matcher: "/admin/*",
      middlewares: [
        unlessInviteAcceptance(authenticate("user", ["session", "bearer"])),
        unlessInviteAcceptance(adminAccess),
        managerLayoutView,
      ],
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
