import { absoluteBase, escapeHtml, tokenFingerprint } from "./email-html"

type AdminLocation = { backendUrl?: string, path?: string }

// The dashboard builds the same link for "Copy invite link". An email needs an
// absolute address, and Medusa's default backendUrl is "/", so MEDUSA_BACKEND_URL
// must be set for invite emails to be sent.
export function inviteUrl({ backendUrl, path }: AdminLocation, token: string): string | null {
  const base = absoluteBase(backendUrl)
  if (!base) return null
  const adminPath = path && path !== "/" ? path : ""
  return `${base}${adminPath}/invite?token=${encodeURIComponent(token)}`
}

// A resent invite gets a new token, so it gets a new key and a new email. A
// redelivered event for the same token reuses the key and is not sent twice.
export function inviteEmailKey(inviteId: string, token: string) {
  return `invite-email:${inviteId}:${tokenFingerprint(token)}`
}

export function inviteEmailContent(url: string, expiresAt: Date) {
  const expiry = expiresAt.toUTCString()
  return {
    subject: "You have been invited to the store admin",
    text: `You have been invited to the store admin.\n\nAccept the invite and choose your password:\n${url}\n\nThe link expires on ${expiry}.`,
    html: `<p>You have been invited to the store admin.</p>`
      + `<p><a href="${escapeHtml(url)}">Accept the invite and choose your password</a></p>`
      + `<p>The link expires on ${escapeHtml(expiry)}.</p>`,
  }
}
