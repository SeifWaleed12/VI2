import { inviteEmailContent, inviteEmailKey, inviteUrl } from "../invite-email"

it("builds the same link as the dashboard's copy invite link", () => {
  expect(inviteUrl({ backendUrl: "https://shop.example.com/", path: "/app" }, "a.b+c")).toBe("https://shop.example.com/app/invite?token=a.b%2Bc")
  expect(inviteUrl({ backendUrl: "http://localhost:9000", path: "/" }, "t")).toBe("http://localhost:9000/invite?token=t")
})

it("refuses to build a link without an absolute server address", () => {
  expect(inviteUrl({ backendUrl: "/", path: "/app" }, "t")).toBeNull()
  expect(inviteUrl({ path: "/app" }, "t")).toBeNull()
  expect(inviteUrl({ backendUrl: "javascript:alert(1)", path: "/app" }, "t")).toBeNull()
})

it("gives a resent invite a new key and a redelivered event the same key", () => {
  expect(inviteEmailKey("invite_1", "first")).toBe(inviteEmailKey("invite_1", "first"))
  expect(inviteEmailKey("invite_1", "first")).not.toBe(inviteEmailKey("invite_1", "second"))
  expect(inviteEmailKey("invite_1", "secret-token")).not.toContain("secret-token")
})

it("puts the link and expiry in both text and html, escaped in html", () => {
  const url = "https://shop.example.com/app/invite?token=x&y=\"z\""
  const content = inviteEmailContent(url, new Date("2026-10-07T10:00:00Z"))
  expect(content.text).toContain(url)
  expect(content.text).toContain("Wed, 07 Oct 2026 10:00:00 GMT")
  expect(content.html).toContain("token=x&amp;y=&quot;z&quot;")
  expect(content.html).not.toContain("\"z\"")
})
