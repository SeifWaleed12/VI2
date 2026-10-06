import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, InviteWorkflowEvents, Modules } from "@medusajs/framework/utils"
import { inviteEmailContent, inviteEmailKey, inviteUrl } from "../lib/invite-email"

// Sends the invite link by email. The role chosen in the invite form is linked
// to the invite by Medusa and assigned when the invite is accepted.
export default async function inviteEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [invite] } = await query.graph({
    entity: "invite",
    fields: ["id", "email", "token", "expires_at", "accepted"],
    filters: { id: event.data.id },
  })
  if (!invite || invite.accepted) return
  const { admin } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const url = inviteUrl(admin, invite.token)
  if (!url) {
    logger.warn(`Invite ${invite.id} was not emailed: set MEDUSA_BACKEND_URL to the admin's public address.`)
    return
  }
  // A failed send must not undo the invite; the admin can still copy the link
  // or resend it from the dashboard. The link is never logged.
  try {
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: invite.email,
      channel: "email",
      template: "user-invite",
      trigger_type: event.name,
      resource_id: invite.id,
      resource_type: "invite",
      idempotency_key: inviteEmailKey(invite.id, invite.token),
      content: inviteEmailContent(url, new Date(invite.expires_at)),
    })
  } catch (error) {
    logger.error(`Invite ${invite.id} email failed: ${(error as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: [InviteWorkflowEvents.CREATED, InviteWorkflowEvents.RESENT],
}
