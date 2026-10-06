import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { passwordProblem } from "../lib/password-policy"

// Medusa's own routes set a password on register (staff invite acceptance, a
// customer account) and on update (a reset link). All pass through here before
// Medusa hashes the password.
export function requireStrongPassword(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const problem = passwordProblem((req.body as { password?: unknown } | undefined)?.password)
  if (problem) throw new MedusaError(MedusaError.Types.INVALID_DATA, problem)
  return next()
}
