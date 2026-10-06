import { resetEmailContent, resetEmailKey, resetPasswordUrl } from "../password-reset-email"

const targets = { storefrontUrl: "https://shop.example.com/", admin: { backendUrl: "https://api.example.com", path: "/app" } }

it("sends customers to the storefront and staff to the dashboard reset page", () => {
  expect(resetPasswordUrl("customer", targets, "a.b+c")).toBe("https://shop.example.com/account/reset-password?token=a.b%2Bc")
  expect(resetPasswordUrl("user", targets, "t")).toBe("https://api.example.com/app/reset-password?token=t")
})

it("refuses to build a link without an absolute address", () => {
  expect(resetPasswordUrl("customer", { ...targets, storefrontUrl: undefined }, "t")).toBeNull()
  expect(resetPasswordUrl("customer", { ...targets, storefrontUrl: "javascript:alert(1)" }, "t")).toBeNull()
  expect(resetPasswordUrl("user", { ...targets, admin: { backendUrl: "/", path: "/app" } }, "t")).toBeNull()
})

it("keys each token once without storing it", () => {
  expect(resetEmailKey("token-1")).toBe(resetEmailKey("token-1"))
  expect(resetEmailKey("token-1")).not.toBe(resetEmailKey("token-2"))
  expect(resetEmailKey("secret-token")).not.toContain("secret-token")
})

it("puts the link in text and escaped html", () => {
  const url = "https://shop.example.com/account/reset-password?token=x&y=\"z\""
  const content = resetEmailContent(url)
  expect(content.text).toContain(url)
  expect(content.html).toContain("token=x&amp;y=&quot;z&quot;")
  expect(content.html).not.toContain("\"z\"")
})
