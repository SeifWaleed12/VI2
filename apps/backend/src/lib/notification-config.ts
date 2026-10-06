import { MedusaError } from "@medusajs/framework/utils"

// Listing the notification module replaces Medusa's default entry, so the
// local provider on the "feed" channel (the admin's in-app notifications) is
// kept here.
//
// Email goes through SendGrid, which ships with Medusa, once both variables are
// set. Without them, outside production, the local provider also takes "email"
// so invites and password resets run end to end and the server log records
// each send (without the link). In production without SendGrid no email
// provider exists: sends fail and are logged, admins share invite and reset
// links from the dashboard, and customer reset emails are not delivered.
export function notificationModule(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.SENDGRID_API_KEY?.trim()
  const from = env.SENDGRID_FROM?.trim()
  if (Boolean(apiKey) !== Boolean(from)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set both SENDGRID_API_KEY and SENDGRID_FROM, or neither.")
  }
  const sendsEmail = Boolean(apiKey && from)
  const localChannels = !sendsEmail && env.NODE_ENV !== "production" ? ["feed", "email"] : ["feed"]
  return {
    resolve: "@medusajs/medusa/notification",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/notification-local",
          id: "local",
          options: { name: "Local Notification Provider", channels: localChannels },
        },
        ...(sendsEmail
          ? [{
            resolve: "@medusajs/medusa/notification-sendgrid",
            id: "sendgrid",
            options: { channels: ["email"], api_key: apiKey, from },
          }]
          : []),
      ],
    },
  }
}
