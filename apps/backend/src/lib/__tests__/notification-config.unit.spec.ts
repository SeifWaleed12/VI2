import { notificationModule } from "../notification-config"

const providers = (env: NodeJS.ProcessEnv) => notificationModule(env).options.providers

it("keeps the admin feed provider in every environment", () => {
  for (const env of [{}, { NODE_ENV: "production" }, { SENDGRID_API_KEY: "key", SENDGRID_FROM: "admin@example.com" }]) {
    expect(providers(env)[0]).toEqual(expect.objectContaining({ id: "local", options: expect.objectContaining({ channels: expect.arrayContaining(["feed"]) }) }))
  }
})

it("sends email through SendGrid when both settings are present", () => {
  const list = providers({ NODE_ENV: "production", SENDGRID_API_KEY: "key", SENDGRID_FROM: "admin@example.com" })
  expect(list[0].options.channels).toEqual(["feed"])
  expect(list[1]).toEqual({ resolve: "@medusajs/medusa/notification-sendgrid", id: "sendgrid", options: { channels: ["email"], api_key: "key", from: "admin@example.com" } })
})

it("logs email locally only outside production", () => {
  expect(providers({ NODE_ENV: "development" }).map((p) => p.options.channels)).toEqual([["feed", "email"]])
  expect(providers({ NODE_ENV: "production" }).map((p) => p.options.channels)).toEqual([["feed"]])
})

it("rejects half-configured SendGrid settings", () => {
  expect(() => notificationModule({ SENDGRID_API_KEY: "key" })).toThrow("both")
  expect(() => notificationModule({ SENDGRID_FROM: "admin@example.com", SENDGRID_API_KEY: "  " })).toThrow("both")
})
