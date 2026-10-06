import { EventEmitter } from "node:events"
import { Modules } from "@medusajs/framework/utils"
import { limitLoginAttempts, limitResetRequests } from "../login-rate-limit"
import { requireStrongPassword } from "../password-policy"

function scope() {
  const values = new Map<string, unknown>()
  const services: Record<string, unknown> = {
    [Modules.CACHE]: {
      get: async (key: string) => values.get(key) ?? null,
      set: async (key: string, value: unknown) => { values.set(key, value) },
      invalidate: async (key: string) => { values.delete(key) },
    },
    [Modules.LOCKING]: { execute: (_key: string, job: () => Promise<unknown>) => job() },
    logger: { warn: jest.fn() },
  }
  return { resolve: (name: string) => services[name] }
}

function response() {
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    set(name: string, value: string) { res.headers[name] = value; return res },
    status(code: number) { res.statusCode = code; return res },
    json(body: unknown) { res.body = body; return res },
  })
  return res
}

type Middleware = ReturnType<typeof limitLoginAttempts>

async function attempt(middleware: Middleware, sharedScope: ReturnType<typeof scope>, status: number, body: Record<string, string>) {
  const res = response()
  const next = jest.fn()
  await middleware({ scope: sharedScope, body } as never, res as never, next)
  if (next.mock.calls.length) {
    res.statusCode = status
    res.emit("finish")
    await new Promise((resolve) => setImmediate(resolve))
  }
  return { res, passed: next.mock.calls.length === 1 }
}

const customerLogin = limitLoginAttempts("customer")
const shopper = { email: "shopper@example.com" }

async function failFiveTimes(s: ReturnType<typeof scope>) {
  for (let i = 0; i < 5; i++) expect((await attempt(customerLogin, s, 401, shopper)).passed).toBe(true)
}

it("answers 429 with Retry-After after five attempts on one account", async () => {
  const s = scope()
  await failFiveTimes(s)
  const blocked = await attempt(customerLogin, s, 401, shopper)
  expect(blocked.passed).toBe(false)
  expect(blocked.res.statusCode).toBe(429)
  expect(blocked.res.headers["Retry-After"]).toBe("900")
  expect(blocked.res.body).toEqual(expect.objectContaining({ type: "too_many_requests" }))
})

it("blocks even the right password while locked, and leaves other accounts alone", async () => {
  const s = scope()
  await failFiveTimes(s)
  expect((await attempt(customerLogin, s, 200, shopper)).passed).toBe(false)
  expect((await attempt(customerLogin, s, 401, { email: "other@example.com" })).passed).toBe(true)
  expect((await attempt(limitLoginAttempts("user"), s, 401, shopper)).passed).toBe(true)
})

it("resets the count after a successful sign-in", async () => {
  const s = scope()
  for (let i = 0; i < 4; i++) await attempt(customerLogin, s, 401, shopper)
  await attempt(customerLogin, s, 200, shopper)
  await failFiveTimes(s)
})

it("limits reset-email requests separately and never clears them", async () => {
  const s = scope()
  const resetRequests = limitResetRequests("customer")
  for (let i = 0; i < 5; i++) expect((await attempt(resetRequests, s, 201, { identifier: "shopper@example.com" })).passed).toBe(true)
  expect((await attempt(resetRequests, s, 201, { identifier: "shopper@example.com" })).res.statusCode).toBe(429)
  expect((await attempt(customerLogin, s, 401, shopper)).passed).toBe(true)
})

it("rejects a short password before Medusa stores it", () => {
  const next = jest.fn()
  expect(() => requireStrongPassword({ body: { email: "new@example.com", password: "admin" } } as never, {} as never, next)).toThrow("at least 8")
  expect(next).not.toHaveBeenCalled()
  requireStrongPassword({ body: { password: "eight888" } } as never, {} as never, next)
  expect(next).toHaveBeenCalledTimes(1)
})
