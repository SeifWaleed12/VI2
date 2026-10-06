import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  attemptKey,
  attemptLimiterFrom,
  LOGIN_POLICY,
  RESET_REQUEST_POLICY,
  type ActorType,
  type AttemptPurpose,
  type LoginAttemptPolicy,
} from "../lib/login-attempts"

type Guard = {
  purpose: AttemptPurpose
  policy: LoginAttemptPolicy
  emailField: "email" | "identifier"
  clearOnSuccess: boolean
}

export function tooManyAttempts(res: MedusaResponse, policy: LoginAttemptPolicy) {
  res.set("Retry-After", String(policy.windowSeconds))
  return res.status(429).json({
    type: "too_many_requests",
    message: `Too many attempts. Try again in ${Math.ceil(policy.windowSeconds / 60)} minutes.`,
  })
}

function limitAttempts(actorType: ActorType, guard: Guard) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const limiter = attemptLimiterFrom(req.scope, guard.policy)
    const email = (req.body as Record<string, unknown> | undefined)?.[guard.emailField]
    const key = attemptKey(guard.purpose, actorType, email)
    if (!await limiter.reserve(key)) return tooManyAttempts(res, guard.policy)
    if (guard.clearOnSuccess) {
      // A successful sign-in starts the count again. The response is already
      // sent, so a failure here is logged rather than thrown.
      res.on("finish", () => {
        if (res.statusCode !== 200) return
        limiter.clear(key).catch((error: Error) =>
          req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(`Could not reset sign-in attempts: ${error.message}`))
      })
    }
    return next()
  }
}

export const limitLoginAttempts = (actorType: ActorType) =>
  limitAttempts(actorType, { purpose: "login-attempts", policy: LOGIN_POLICY, emailField: "email", clearOnSuccess: true })

export const limitResetRequests = (actorType: ActorType) =>
  limitAttempts(actorType, { purpose: "reset-requests", policy: RESET_REQUEST_POLICY, emailField: "identifier", clearOnSuccess: false })
