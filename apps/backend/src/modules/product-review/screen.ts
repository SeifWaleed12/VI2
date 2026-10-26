// Detection copies are normalized; the customer's original words are never rewritten.
const normalize = (text: string) => text.normalize("NFKC").toLowerCase()
  .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/gu, "")
  .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
  .replace(/[أإآٱ]/gu, "ا").replace(/ى/gu, "ي")

// shortcut: a deliberately small exact-token list, extend after reviewing real false negatives.
const BLOCKED_TERMS = new Set([
  "fuck", "fucking", "fucked", "motherfucker", "shit", "bullshit", "bitch", "asshole", "cunt",
  "كس", "كسم", "كسمك", "احا", "خول", "شرموط", "شرموطة", "متناك", "زب", "زبي",
])
export const SCREEN_VERSION = 2
export function screenReview(text: string): string[] {
  const normalized = normalize(text)
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? []
  const flags: string[] = []
  if (tokens.some(token => BLOCKED_TERMS.has(token))) flags.push("profanity")
  const links = normalized.replace(/\s*\.\s*|\s+dot\s+/gu, ".")
  const knownDomain = /(?:^|[^\p{L}\p{N}-])(?=[\p{L}\p{N}-]*\p{L})[\p{L}\p{N}-]+\.(?:com|net|org|io|shop|xyz|eg|ly|me|co|link|site|online|store|app|info)(?=$|[^\p{L}\p{N}-])/iu
  const domainWithPath = /(?:^|[^\p{L}\p{N}-])[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.[\p{L}]{2,63}\//iu
  if (/(?:https?:\/\/|www\.)\S+/iu.test(links) || knownDomain.test(links) || domainWithPath.test(links)) flags.push("external_link")
  if (/(.)\1{14,}/u.test(normalized)) flags.push("repeated_characters")
  return flags
}
