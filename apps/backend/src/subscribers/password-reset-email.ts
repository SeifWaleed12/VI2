import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AuthWorkflowEvents, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resetEmailContent, resetEmailKey, resetPasswordUrl } from "../lib/password-reset-email"

type PasswordReset = { entity_id: string, actor_type: string, token: string }

// Medusa emits this for "forgot password" requests on both the dashboard and
// the storefront. It only fires for an existing account, and the request route
// answers the same either way, so nobody learns which emails have accounts.
export default async function passwordResetEmail({ event, container }: SubscriberArgs<PasswordReset>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { entity_id: email, actor_type: actorType, token } = event.data
  if (actorType !== "user" && actorType !== "customer") return
  const { admin } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const url = resetPasswordUrl(actorType, { storefrontUrl: process.env.STOREFRONT_URL, admin }, token)
  if (!url) {
    const setting = actorType === "customer" ? "STOREFRONT_URL" : "MEDUSA_BACKEND_URL"
    logger.warn(`A ${actorType} password reset was not emailed: set ${setting} to its public address.`)
    return
  }
  // The link is never logged. A failed send leaves the old password in place.
  try {
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: email,
      channel: "email",
      template: "password-reset",
      trigger_type: event.name,
      resource_type: actorType,
      idempotency_key: resetEmailKey(token),
      content: resetEmailContent(url),
    })
  } catch (error) {
    logger.error(`A ${actorType} password reset email failed: ${(error as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}
