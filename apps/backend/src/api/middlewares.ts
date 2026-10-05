import { allowFields, authenticate, defineMiddlewares } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { adminAccess, unlessInviteAcceptance } from "./admin-access"

export default defineMiddlewares({
  routes: [
    { matcher: "/store/products", middlewares: [allowFields("brand.name", "brand.status")] },
    { matcher: "/store/products/:id", middlewares: [allowFields("brand.name", "brand.status")] },
    {
      matcher: "/admin/*",
      middlewares: [
        unlessInviteAcceptance(authenticate("user", ["session", "bearer"])),
        unlessInviteAcceptance(adminAccess),
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
