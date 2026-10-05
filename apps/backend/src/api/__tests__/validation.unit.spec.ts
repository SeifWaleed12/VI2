import { brandSchema, quickVariantSchema, registrationSchema } from "../validators"
import { configuredSecret } from "../../lib/secrets"

it.each([null, [], { email: 1 }, { email: "a@example.com", password: [], first_name: {}, last_name: "x" }])("rejects malformed registration %j", (body) => {
  expect(registrationSchema.safeParse(body).success).toBe(false)
})
it("normalizes valid registration without trusting extra identity fields", () => {
  const input = { email: "A@example.com", password: "password", first_name: " A ", last_name: "B" }
  expect(registrationSchema.parse(input)).toMatchObject({ email: "a@example.com", first_name: "A" })
  expect(registrationSchema.safeParse({ ...input, customer_id: "cus_other" }).success).toBe(false)
})
it.each([{ name: [] }, { name: " ", slug: "ok" }, { name: "Brand", slug: "not valid" }, { name: "Brand", slug: "ok", logo: "javascript:alert(1)" }])("rejects malformed brands %j", (body) => {
  expect(brandSchema.safeParse(body).success).toBe(false)
})
it.each([-1, NaN, Infinity, "100"])("rejects invalid variant price %s", (amount) => {
  expect(quickVariantSchema.safeParse({ option_title: "Size", option_value: "M", prices: [{ amount, currency_code: "egp" }] }).success).toBe(false)
})
it("rejects strings pretending to be booleans", () => {
  expect(quickVariantSchema.safeParse({ option_title: "Size", option_value: "M", manage_inventory: "false", prices: [{ amount: 100, currency_code: "egp" }] }).success).toBe(false)
})
it.each([undefined, "", "supersecret", "short", "changeme".repeat(10)])("requires strong production secrets", (JWT_SECRET) => {
  expect(() => configuredSecret("JWT_SECRET", { NODE_ENV: "production", JWT_SECRET })).toThrow()
})
it("accepts configured secrets and permits development fallback only outside production", () => {
  expect(configuredSecret("JWT_SECRET", { NODE_ENV: "production", JWT_SECRET: "a".repeat(48) })).toBe("a".repeat(48))
  expect(configuredSecret("JWT_SECRET", { NODE_ENV: "test" })).toContain("development-only")
})
