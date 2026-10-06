import type { ActorType } from "./login-attempts"
import { absoluteBase, escapeHtml, tokenFingerprint } from "./email-html"

export type ResetLinkTargets = {
  // Where the storefront is served, from STOREFRONT_URL.
  storefrontUrl?: string
  // Where the admin dashboard is served, as Medusa's admin config describes it.
  admin: { backendUrl?: string, path?: string }
}

// Customers reset on the storefront page; staff on the dashboard's own reset
// page, the same one its "Copy reset password link" opens.
export function resetPasswordUrl(actorType: ActorType, { storefrontUrl, admin }: ResetLinkTargets, token: string): string | null {
  const query = `?token=${encodeURIComponent(token)}`
  if (actorType === "customer") {
    const base = absoluteBase(storefrontUrl)
    return base ? `${base}/account/reset-password${query}` : null
  }
  const base = absoluteBase(admin.backendUrl)
  const adminPath = admin.path && admin.path !== "/" ? admin.path : ""
  return base ? `${base}${adminPath}/reset-password${query}` : null
}

export const resetEmailKey = (token: string) => `password-reset-email:${tokenFingerprint(token)}`

// Medusa's reset token expires after 15 minutes.
export function resetEmailContent(url: string) {
  return {
    subject: "Reset your password",
    text: `We received a request to reset your password.\n\nChoose a new password:\n${url}\n\nThe link expires in 15 minutes. If you did not ask for this, ignore this email; your password has not changed.`,
    html: `<p>We received a request to reset your password.</p>`
      + `<p><a href="${escapeHtml(url)}">Choose a new password</a></p>`
      + `<p>The link expires in 15 minutes. If you did not ask for this, ignore this email; your password has not changed.</p>`,
  }
}
