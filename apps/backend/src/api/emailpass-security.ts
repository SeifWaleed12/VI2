import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { requestPath } from "../lib/request-path"
import { limitLoginAttempts, limitResetRequests } from "./login-rate-limit"
import { requireStrongPassword } from "./password-policy"
import { limitRegistrationAttempts } from "./registration-rate-limit"

// Mounted on the native parameter route, including its child routes, so a
// different actor spelling cannot reach the password provider unguarded.
export function secureEmailpass(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const actor = req.params.actor_type
  if (actor !== "user" && actor !== "customer") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Unsupported account type.")
  }
  const action = requestPath(req).split("/")[4]?.toLowerCase()
  if (actor === "customer" && action === "register" && req.method === "POST") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Register through /store/auth/register.")
  }
  if (!action && (req.method === "GET" || req.method === "POST")) return limitLoginAttempts(actor)(req, res, next)
  if (req.method === "POST" && action === "reset-password") return limitResetRequests(actor)(req, res, next)
  if (req.method === "POST" && action === "register") return limitRegistrationAttempts(req, res, () => requireStrongPassword(req, res, next))
  if (req.method === "POST" && action === "update") return requireStrongPassword(req, res, next)
  return next()
}
