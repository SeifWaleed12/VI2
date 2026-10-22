import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { confirmEmailContent, confirmEmailUrl, emailChangeNoticeContent, signEmailChange } from "../../../../../lib/email-change"
import { tokenFingerprint } from "../../../../../lib/email-html"
import { attemptKey, attemptLimiterFrom, EMAIL_CHANGE_POLICY, LOGIN_POLICY } from "../../../../../lib/login-attempts"
import { tooManyAttempts } from "../../../../login-rate-limit"
import { emailChangeSchema } from "../../../../validators"

// POST /store/customers/me/email: a signed-in customer asks to change their
// email. Nothing changes here: a link goes to the new address (see
// /store/email-change/confirm) and a notice to the current one. The answer is
// the same whether or not another account already uses the new address.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = emailChangeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ code: "invalid_request", message: "Enter a valid email and your current password." })
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [customer] } = await query.graph({ entity: "customer", fields: ["id", "email", "has_account"], filters: { id: req.auth_context.actor_id } })
  if (!customer?.has_account || !customer.email) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in to change your email")
  const current = customer.email as string
  const next = parsed.data.email
  if (next === current) return res.status(400).json({ code: "same_email", message: "This is already your email." })

  const requests = attemptLimiterFrom(req.scope, EMAIL_CHANGE_POLICY)
  // Counted per customer, not per email, so changing the email does not reset it.
  if (!await requests.reserve(attemptKey("email-change-requests", "customer", customer.id))) return tooManyAttempts(res, EMAIL_CHANGE_POLICY)
  // The password check is a password guess, so it uses the sign-in budget.
  const logins = attemptLimiterFrom(req.scope, LOGIN_POLICY)
  const loginKey = attemptKey("login-attempts", "customer", current)
  if (!await logins.reserve(loginKey)) return tooManyAttempts(res, LOGIN_POLICY)
  const auth = req.scope.resolve(Modules.AUTH)
  const check = await auth.authenticate("emailpass", { body: { email: current, password: parsed.data.password } })
  if (!check.success) return res.status(400).json({ code: "wrong_password", message: "Your current password is not correct." })
  await logins.clear(loginKey)

  const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const token = signEmailChange({ customer_id: customer.id, from: current, to: next }, http.jwtSecret as string)
  const url = confirmEmailUrl(process.env.STOREFRONT_URL, token)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  if (!url) {
    logger.warn("An email change was not sent: set STOREFRONT_URL to its public address.")
    return res.status(503).json({ code: "email_not_sent", message: "We could not send the confirmation email. Try again later." })
  }
  const taken = await auth.listProviderIdentities({ provider: "emailpass", entity_id: next })
  const key = tokenFingerprint(token)
  const email = (to: string, template: string, content: { subject: string, text: string, html: string }) => ({
    to, channel: "email", template, trigger_type: "email-change", resource_id: customer.id, resource_type: "customer", idempotency_key: `${template}:${key}`, content,
  })
  try {
    await req.scope.resolve(Modules.NOTIFICATION).createNotifications([
      ...(taken.length ? [] : [email(next, "email-change-confirm", confirmEmailContent(url))]),
      email(current, "email-change-notice", emailChangeNoticeContent(next)),
    ])
  } catch (error) {
    // The link is never logged.
    logger.error(`An email change email failed: ${(error as Error).message}`)
    return res.status(503).json({ code: "email_not_sent", message: "We could not send the confirmation email. Try again later." })
  }
  return res.status(200).json({ success: true })
}
