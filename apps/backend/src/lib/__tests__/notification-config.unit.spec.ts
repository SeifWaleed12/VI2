import { notificationModule } from "../notification-config"

const providers = (env: NodeJS.ProcessEnv) => notificationModule(env).options.providers

it("keeps the admin feed provider in every environment", () => {
  for (const env of [{}, { NODE_ENV: "production" }, { RESEND_API_KEY: "key", RESEND_FROM: "Vi2 <orders@example.com>" }]) {
    expect(providers(env)[0]).toEqual(expect.objectContaining({ id: "local", options: expect.objectContaining({ channels: expect.arrayContaining(["feed"]) }) }))
  }
})

it("sends email through Resend when both settings are present", () => {
  const list = providers({ NODE_ENV: "production", RESEND_API_KEY: " key ", RESEND_FROM: "Vi2 <orders@example.com>" })
  expect(list[0].options.channels).toEqual(["feed"])
  expect(list[1]).toEqual({ resolve: "./src/modules/resend-notification", id: "resend", options: { channels: ["email"], api_key: "key", from: "Vi2 <orders@example.com>" } })
})

it("logs email locally only outside production", () => {
  expect(providers({ NODE_ENV: "development" }).map((p) => p.options.channels)).toEqual([["feed", "email"]])
  expect(providers({ NODE_ENV: "production" }).map((p) => p.options.channels)).toEqual([["feed"]])
})

it("rejects half-configured Resend settings", () => {
  expect(() => notificationModule({ RESEND_API_KEY: "key" })).toThrow("both")
  expect(() => notificationModule({ RESEND_FROM: "orders@example.com", RESEND_API_KEY: "  " })).toThrow("both")
})
