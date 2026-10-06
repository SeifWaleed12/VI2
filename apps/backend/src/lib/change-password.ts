import type { IAuthModuleService } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { attemptKey, type ActorType, type AttemptLimiter } from "./login-attempts"
import { passwordProblem } from "./password-policy"

export type ChangePasswordInput = {
  actorType: ActorType
  email: string
  currentPassword: string
  newPassword: string
}

export type ChangePasswordOutcome =
  | { outcome: "changed" }
  | { outcome: "invalid", message: string }
  | { outcome: "wrong_password" }
  | { outcome: "locked" }

type Dependencies = {
  auth: Pick<IAuthModuleService, "authenticate" | "updateProvider">
  limiter: AttemptLimiter
}

// Checking the current password is a password guess, so it uses the same
// per-account budget as signing in: guessing here cannot bypass the login limit.
export async function changePassword({ auth, limiter }: Dependencies, input: ChangePasswordInput): Promise<ChangePasswordOutcome> {
  const problem = passwordProblem(input.newPassword)
  if (problem) return { outcome: "invalid", message: problem }
  const key = attemptKey("login-attempts", input.actorType, input.email)
  if (!await limiter.reserve(key)) return { outcome: "locked" }
  const check = await auth.authenticate("emailpass", { body: { email: input.email, password: input.currentPassword } })
  if (!check.success) return { outcome: "wrong_password" }
  const update = await auth.updateProvider("emailpass", { entity_id: input.email, password: input.newPassword })
  if (!update.success) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The password could not be changed.")
  await limiter.clear(key)
  return { outcome: "changed" }
}
