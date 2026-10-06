import { createHash } from "node:crypto"

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// Links in emails must be absolute; a relative or non-web address is refused.
export function absoluteBase(url: string | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null
  return url.replace(/\/+$/, "")
}

// Idempotency keys for emails that carry a token: a new token means a new
// email, a redelivered event for the same token does not send twice. Only a
// short hash is stored, never the token.
export const tokenFingerprint = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 16)
