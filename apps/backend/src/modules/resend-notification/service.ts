import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"

type Options = { api_key: string, from: string }

const RESEND_URL = "https://api.resend.com/emails"
const TIMEOUT_MS = 10_000

// Sends email through Resend's HTTP API (no SDK, so no new dependency).
// Subscribers build the subject, text and HTML; Medusa's notification module
// stops duplicate sends by each notification's idempotency key.
export default class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  private options_: Options

  constructor(_container: unknown, options: Options) {
    super()
    this.options_ = options
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const content = notification.content
    if (!content?.subject || !(content.html || content.text)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Email "${notification.template}" has no subject or body.`)
    }
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options_.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: notification.from?.trim() || this.options_.from,
        to: [notification.to],
        subject: content.subject,
        ...(content.html ? { html: content.html } : {}),
        ...(content.text ? { text: content.text } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const body = await response.json().catch(() => ({})) as { id?: string, message?: string }
    if (!response.ok) {
      // Resend's message names the problem (for example an unverified domain); never the key.
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Resend refused the email (${response.status}): ${body.message ?? "no details"}`)
    }
    return { id: body.id }
  }
}
