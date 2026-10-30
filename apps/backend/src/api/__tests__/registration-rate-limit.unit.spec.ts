import { Modules } from "@medusajs/framework/utils"
import { limitRegistrationAttempts, registrationVisitor } from "../registration-rate-limit"

it("ignores forged proxy headers without explicit proxy trust", () => {
  const req = { socket: { remoteAddress: "::ffff:127.0.0.1" }, headers: { "cf-connecting-ip": "203.0.113.9" } }
  expect(registrationVisitor(req as never, { NODE_ENV: "test" })).toBe("127.0.0.1")
  expect(() => registrationVisitor(req as never, { NODE_ENV: "production" })).toThrow("trusted visitor IP")
})
it("requires one valid IP from the explicitly trusted proxy header", () => {
  const env = { NODE_ENV: "production", TRUSTED_PROXY_CLIENT_IP_HEADER: "cf-connecting-ip" }
  expect(registrationVisitor({ headers: { "cf-connecting-ip": "203.0.113.9" } } as never, env)).toBe("203.0.113.9")
  expect(() => registrationVisitor({ headers: { "cf-connecting-ip": "203.0.113.9, 203.0.113.10" } } as never, env)).toThrow("valid visitor address")
})
it("bounds registrations per visitor across distinct target emails", async () => {
  const values = new Map<string, number>()
  const cache = { get: async key => values.get(key), set: async (key, value) => values.set(key, value) }
  const locking = { execute: (_key, work) => work() }
  const scope = { resolve: key => key === Modules.CACHE ? cache : locking }
  const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" }, scope, body: { email: "one@example.test" } }
  const res = { set: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }
  const next = jest.fn()
  for (let i = 0; i < 11; i++) await limitRegistrationAttempts({ ...req, body: { email: `${i}@example.test` } } as never, res as never, next)
  expect(next).toHaveBeenCalledTimes(10)
  expect(res.status).toHaveBeenCalledWith(429)
  expect([...values.keys()].join()).not.toContain("127.0.0.1")
  await limitRegistrationAttempts({ ...req, socket: { remoteAddress: "127.0.0.2" } } as never, res as never, next)
  expect(next).toHaveBeenCalledTimes(11)
})
