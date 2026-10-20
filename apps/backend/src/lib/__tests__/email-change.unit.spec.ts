import { confirmEmailContent, confirmEmailUrl, emailChangeNoticeContent, signEmailChange, verifyEmailChange } from "../email-change"

const change = { customer_id: "cus_1", from: "sara@test.dev", to: "sara.new@test.dev" }
const secret = "test-secret"
const now = Date.UTC(2026, 9, 20, 12)

it("verifies its own link token within an hour", () => {
  const token = signEmailChange(change, secret, now)
  expect(verifyEmailChange(token, secret, now + 59 * 60 * 1000)).toEqual({ ...change, issued_at: now })
})

it("refuses an expired, tampered, foreign or malformed token", () => {
  const token = signEmailChange(change, secret, now)
  expect(verifyEmailChange(token, secret, now + 60 * 60 * 1000)).toBeNull()
  const [payload, signature] = token.split(".")
  const forged = Buffer.from(JSON.stringify({ purpose: "email-change", exp: now / 1000 + 3600, ...change, to: "attacker@test.dev" })).toString("base64url")
  expect(verifyEmailChange(`${forged}.${signature}`, secret, now)).toBeNull()
  expect(verifyEmailChange(token, "other-secret", now)).toBeNull()
  for (const bad of [undefined, "", payload, `${token}.x`, 42]) expect(verifyEmailChange(bad, secret, now)).toBeNull()
})

it("links to the storefront page only from an absolute address", () => {
  expect(confirmEmailUrl("https://vi2.test/", "a.b")).toBe("https://vi2.test/account/confirm-email?token=a.b")
  expect(confirmEmailUrl(undefined, "a.b")).toBeNull()
  expect(confirmEmailUrl("vi2.test", "a.b")).toBeNull()
})

it("escapes the new address in the notice to the old one", () => {
  const { html, text } = emailChangeNoticeContent("<b>x</b>@test.dev")
  expect(html).not.toContain("<b>x</b>")
  expect(text).toContain("<b>x</b>@test.dev")
  expect(confirmEmailContent("https://vi2.test/account/confirm-email?token=a&b").html).toContain("token=a&amp;b")
})
