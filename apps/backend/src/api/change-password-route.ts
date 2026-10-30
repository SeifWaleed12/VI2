import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { changePassword } from "../lib/change-password"
import { attemptLimiterFrom, LOGIN_POLICY, type ActorType } from "../lib/login-attempts"
import { tooManyAttempts } from "./login-rate-limit"
import { changePasswordSchema } from "./validators"
import { withCredentialLock } from "../lib/credential-lock"

// Shared by the staff and customer routes; each only supplies whose account it
// is. A wrong current password is a 400 with a code, not a 401, so clients can
// tell it apart from an expired session.
export async function respondToPasswordChange(req: MedusaRequest, res: MedusaResponse, actorType: ActorType, email: string) {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ code: "invalid_request", message: "Invalid password details." })
  const auth = req.scope.resolve(Modules.AUTH)
  const [provider] = await auth.listProviderIdentities({ provider: "emailpass", entity_id: email })
  if (!provider?.auth_identity_id) return res.status(401).json({ message: "Sign in again." })
  const result = await withCredentialLock(req.scope, provider.auth_identity_id, () => changePassword({
    auth: req.scope.resolve(Modules.AUTH),
    limiter: attemptLimiterFrom(req.scope, LOGIN_POLICY),
  }, {
    actorType,
    email,
    currentPassword: parsed.data.current_password,
    newPassword: parsed.data.new_password,
  }))
  switch (result.outcome) {
    case "changed": return res.status(200).json({ success: true })
    case "invalid": return res.status(400).json({ code: "weak_password", message: result.message })
    case "wrong_password": return res.status(400).json({ code: "wrong_password", message: "Your current password is not correct." })
    case "locked": return tooManyAttempts(res, LOGIN_POLICY)
  }
}
