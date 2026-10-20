import { createHmac, timingSafeEqual } from "node:crypto"
import { absoluteBase, escapeHtml } from "./email-html"

export type EmailChange = { customer_id: string, from: string, to: string }
// When the link was made (ms); a link older than the customer's last email
// change is refused, so a used link never works again (see the confirm route).
export type VerifiedEmailChange = EmailChange & { issued_at: number }

const PURPOSE = "email-change"
export const EMAIL_CHANGE_LINK_MINUTES = 60

// The link token is signed with the server's JWT secret and expires within an
// hour; the token itself is not stored.
const signature = (payload: string, secret: string) =>
  createHmac("sha256", `${PURPOSE}:${secret}`).update(payload).digest("base64url")

export function signEmailChange(change: EmailChange, secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + EMAIL_CHANGE_LINK_MINUTES * 60
  const payload = Buffer.from(JSON.stringify({ purpose: PURPOSE, exp, iat: now, ...change })).toString("base64url")
  return `${payload}.${signature(payload, secret)}`
}

export function verifyEmailChange(token: unknown, secret: string, now = Date.now()): VerifiedEmailChange | null {
  if (typeof token !== "string") return null
  const [payload, given, extra] = token.split(".")
  if (!payload || !given || extra !== undefined) return null
  const expected = Buffer.from(signature(payload, secret))
  const actual = Buffer.from(given)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (data.purpose !== PURPOSE || typeof data.exp !== "number" || typeof data.iat !== "number" || data.exp * 1000 <= now) return null
    if (![data.customer_id, data.from, data.to].every((value) => typeof value === "string" && value)) return null
    return { customer_id: data.customer_id, from: data.from, to: data.to, issued_at: data.iat }
  } catch {
    return null
  }
}

export function confirmEmailUrl(storefrontUrl: string | undefined, token: string): string | null {
  const base = absoluteBase(storefrontUrl)
  return base ? `${base}/account/confirm-email?token=${encodeURIComponent(token)}` : null
}

// Sent to the new address: the link that makes the change.
export function confirmEmailContent(url: string) {
  return {
    subject: "Confirm your new email for Vi2",
    text: `Confirm this email address for your Vi2 account:\n${url}\n\nThe link expires in ${EMAIL_CHANGE_LINK_MINUTES} minutes. If you did not ask for this, ignore this email; nothing changes.`,
    html: `<p>Confirm this email address for your Vi2 account.</p>`
      + `<p><a href="${escapeHtml(url)}">Confirm my new email</a></p>`
      + `<p>The link expires in ${EMAIL_CHANGE_LINK_MINUTES} minutes. If you did not ask for this, ignore this email; nothing changes.</p>`,
  }
}

// Sent to the current address, so the owner notices a change they did not ask for.
export function emailChangeNoticeContent(newEmail: string) {
  return {
    subject: "Your Vi2 email change was requested",
    text: `Someone asked to change your Vi2 account email to ${newEmail}. It changes only after the link sent to that address is opened.\n\nIf this was not you, change your password now.`,
    html: `<p>Someone asked to change your Vi2 account email to <strong>${escapeHtml(newEmail)}</strong>. It changes only after the link sent to that address is opened.</p>`
      + `<p>If this was not you, change your password now.</p>`,
  }
}
