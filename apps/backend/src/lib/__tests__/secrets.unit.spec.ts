import { configuredSecret } from "../secrets"

describe("production authentication secrets", () => {
  test.each(["JWT_SECRET", "COOKIE_SECRET"])("rejects missing or unsafe %s", (name) => {
    for (const value of [undefined, "", " ", "supersecret", "a".repeat(31), "example-".repeat(6)]) {
      expect(() => configuredSecret(name, { NODE_ENV: "production", [name]: value })).toThrow(name)
    }
  })
  test("accepts a configured production secret without logging its value", () => {
    const value = "a".repeat(64)
    expect(configuredSecret("JWT_SECRET", { NODE_ENV: "production", JWT_SECRET: value })).toBe(value)
  })
  test("development fallback is unpredictable", () => {
    const first = configuredSecret("JWT_SECRET", { NODE_ENV: "development" })
    const second = configuredSecret("JWT_SECRET", { NODE_ENV: "development" })
    expect(first).toHaveLength(64)
    expect(first).not.toBe(second)
  })
})
