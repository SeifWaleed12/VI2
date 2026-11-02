import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestEmailChange } from "../../../../../lib/email-change-request"
import { tooManyAttempts } from "../../../../login-rate-limit"
import { emailChangeSchema } from "../../../../validators"

const REFUSALS = {
  same_email: [400, "This is already your email."],
  wrong_password: [400, "Your current password is not correct."],
  email_not_sent: [503, "We could not send the confirmation email. Try again later."],
} as const

// POST /store/customers/me/email: see lib/email-change-request.ts.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = emailChangeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ code: "invalid_request", message: "Enter a valid email and your current password." })
  const outcome = await requestEmailChange(req.scope, req.auth_context.actor_id, parsed.data.email, parsed.data.password)
  if (outcome.status === "sent") return res.status(200).json({ success: true })
  if (outcome.status === "too_many") return tooManyAttempts(res, outcome.policy)
  const [status, message] = REFUSALS[outcome.status]
  return res.status(status).json({ code: outcome.status, message })
}
