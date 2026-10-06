import { attemptKey, createLoginAttemptLimiter } from "../login-attempts"

function fakeStores() {
  const values = new Map<string, unknown>()
  const ttls: number[] = []
  let queue = Promise.resolve()
  return {
    ttls,
    cache: {
      get: async <T>(key: string) => (values.get(key) as T) ?? null,
      set: async (key: string, value: unknown, ttl?: number) => { values.set(key, value); ttls.push(ttl ?? 0) },
      invalidate: async (key: string) => { values.delete(key) },
    },
    // Runs jobs one after another, like a real lock on a single key.
    locking: {
      execute: <T>(_keys: string | string[], job: () => Promise<T>) => {
        const run = queue.then(job)
        queue = run.then(() => undefined, () => undefined)
        return run
      },
    },
  }
}

const policy = { maxAttempts: 5, windowSeconds: 900 }

it("allows five attempts, then blocks for the window", async () => {
  const stores = fakeStores()
  const limiter = createLoginAttemptLimiter(stores as never, policy)
  const results: boolean[] = []
  for (let i = 0; i < 6; i++) results.push(await limiter.reserve("k"))
  expect(results).toEqual([true, true, true, true, true, false])
  expect(new Set(stores.ttls)).toEqual(new Set([900]))
})

it("does not let parallel attempts get past the limit", async () => {
  const limiter = createLoginAttemptLimiter(fakeStores() as never, policy)
  const results = await Promise.all(Array.from({ length: 20 }, () => limiter.reserve("k")))
  expect(results.filter(Boolean)).toHaveLength(5)
})

it("starts again after a successful sign-in clears the count", async () => {
  const limiter = createLoginAttemptLimiter(fakeStores() as never, policy)
  for (let i = 0; i < 5; i++) await limiter.reserve("k")
  await limiter.clear("k")
  expect(await limiter.reserve("k")).toBe(true)
})

it("keys by account only, with separate counters per actor and purpose", () => {
  const key = attemptKey("login-attempts", "customer", " Shopper@Example.com ")
  expect(key).toBe(attemptKey("login-attempts", "customer", "shopper@example.com"))
  expect(key).not.toBe(attemptKey("login-attempts", "user", "shopper@example.com"))
  expect(key).not.toBe(attemptKey("reset-requests", "customer", "shopper@example.com"))
  expect(key).not.toBe(attemptKey("login-attempts", "customer", "other@example.com"))
})

it("never stores the email or a cache wildcard in the key", () => {
  const key = attemptKey("login-attempts", "user", "a*b@example.com")
  expect(key).not.toContain("example")
  expect(key).not.toContain("*")
  expect(attemptKey("login-attempts", "user", undefined)).toMatch(/^login-attempts:[0-9a-f]{64}$/)
})
