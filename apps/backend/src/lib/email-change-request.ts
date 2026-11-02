import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { confirmEmailContent, confirmEmailUrl, emailChangeNoticeContent, signEmailChange } from "./email-change"
import { tokenFingerprint } from "./email-html"
import { attemptKey, attemptLimiterFrom, EMAIL_CHANGE_POLICY, LOGIN_POLICY } from "./login-attempts"
import { currentCredential, credentialStamp } from "./security-session"

// A signed-in customer asks to change their email. Nothing changes here: a link
// goes to the new address (see /store/email-change/confirm) and a notice to the
// current one. The outcome is the same whether or not another account already
// uses the new address.
export async function requestEmailChange(container: MedusaContainer, customerId: string, next: string, password: string, env: NodeJS.ProcessEnv = process.env) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [customer] } = await query.graph({ entity: "customer", fields: ["id", "email", "has_account"], filters: { id: customerId } })
  if (!customer?.has_account || !customer.email) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in to change your email")
  const current = customer.email as string
  if (next === current) return { status: "same_email" } as const

  const requests = attemptLimiterFrom(container, EMAIL_CHANGE_POLICY)
  // Counted per customer, not per email, so changing the email does not reset it.
  if (!await requests.reserve(attemptKey("email-change-requests", "customer", customer.id))) return { status: "too_many", policy: EMAIL_CHANGE_POLICY } as const
  // The password check is a password guess, so it uses the sign-in budget.
  const logins = attemptLimiterFrom(container, LOGIN_POLICY)
  const loginKey = attemptKey("login-attempts", "customer", current)
  if (!await logins.reserve(loginKey)) return { status: "too_many", policy: LOGIN_POLICY } as const
  const auth = container.resolve(Modules.AUTH)
  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const [provider] = await auth.listProviderIdentities({ provider: "emailpass", entity_id: current })
  const hash = provider?.provider_metadata?.password
  if (typeof hash !== "string" || !provider.auth_identity_id) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in again")
  const stamp = credentialStamp(hash, http.jwtSecret as string)
  const check = await auth.authenticate("emailpass", { body: { email: current, password } })
  if (!check.success) return { status: "wrong_password" } as const
  await logins.clear(loginKey)

  if (stamp !== await currentCredential(container, provider.auth_identity_id)) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Your credentials changed. Sign in again.")
  const token = signEmailChange({ customer_id: customer.id, from: current, to: next, credential_stamp: stamp }, http.jwtSecret as string)
  const url = confirmEmailUrl(env.STOREFRONT_URL, token)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (!url) {
    logger.warn("An email change was not sent: set STOREFRONT_URL to its public address.")
    return { status: "email_not_sent" } as const
  }
  const taken = await auth.listProviderIdentities({ provider: "emailpass", entity_id: next })
  const key = tokenFingerprint(token)
  const email = (to: string, template: string, content: { subject: string, text: string, html: string }) => ({
    to, channel: "email", template, trigger_type: "email-change", resource_id: customer.id, resource_type: "customer", idempotency_key: `${template}:${key}`, content,
  })
  try {
    await container.resolve(Modules.NOTIFICATION).createNotifications([
      ...(taken.length ? [] : [email(next, "email-change-confirm", confirmEmailContent(url))]),
      email(current, "email-change-notice", emailChangeNoticeContent(next)),
    ])
  } catch (error) {
    // The link is never logged.
    logger.error(`An email change email failed: ${(error as Error).message}`)
    return { status: "email_not_sent" } as const
  }
  // Without a real email provider, development emails only reach the log
  // (notification-local), which shows no content; print the link there so the
  // change can be tested. Never in production.
  if (!taken.length && env.NODE_ENV !== "production" && !env.RESEND_API_KEY) {
    logger.info(`Email change link (development only): ${url}`)
  }
  return { status: "sent" } as const
}
