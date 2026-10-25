import { cacheStoreGet, invalidateStoreCacheAfterWrite, storeCacheKey } from "../store-cache"

function fakeCache() {
  const store = new Map<string, unknown>()
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, data: unknown) => { store.set(key, data) }),
    invalidate: jest.fn(async (pattern: string) => {
      for (const key of [...store.keys()]) if (key.startsWith(pattern.replace("*", ""))) store.delete(key)
    }),
  }
}

function request(cache: unknown, overrides: Record<string, unknown> = {}) {
  return {
    method: "GET",
    originalUrl: "/store/products?limit=5",
    headers: { "x-publishable-api-key": "pk", "x-medusa-locale": "en" } as Record<string, string>,
    scope: { resolve: () => cache },
    ...overrides,
  } as any
}

function response() {
  const res: any = { statusCode: 200, json: jest.fn((body: unknown) => body), on: jest.fn(), setHeader: jest.fn() }
  res.status = jest.fn((code: number) => { res.statusCode = code; return res })
  return res
}

async function run(req: any, res: any, body: unknown = { products: [1] }) {
  const next = jest.fn(() => { res.json(body) })
  await cacheStoreGet(60)(req, res, next)
  return next
}

it("serves the second identical read from the cache", async () => {
  const cache = fakeCache()
  expect(await run(request(cache), response())).toHaveBeenCalledTimes(1)
  const res = response()
  expect(await run(request(cache), res)).not.toHaveBeenCalled()
  expect(res.json).toHaveBeenCalledWith({ products: [1] })
  expect(cache.set).toHaveBeenCalledWith(expect.stringMatching(/^store-cache:/), { products: [1] }, 60)
})

it("combines concurrent cold reads in one server", async () => {
  const cache = fakeCache()
  const middleware = cacheStoreGet(60)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const handler = jest.fn(async (res) => { await gate; res.json({ products: [1] }) })
  const requests = Array.from({ length: 100 }, () => {
    const res = response()
    return middleware(request(cache, { originalUrl: "/store/products?limit=7" }), res, () => handler(res))
  })
  await new Promise(resolve => setImmediate(resolve))
  expect(handler).toHaveBeenCalledTimes(1)
  release()
  await Promise.all(requests)
})

it("canonicalizes query ordering while preserving context", () => {
  expect(storeCacheKey(request(null, { originalUrl: "/store/products?offset=0&limit=7" })))
    .toBe(storeCacheKey(request(null, { originalUrl: "/store/products?limit=7&offset=0" })))
})

it("does not create cache entries for arbitrary cache-busting query keys", async () => {
  const cache = fakeCache()
  await run(request(cache, { originalUrl: "/store/products?limit=5&random_key=123" }), response())
  expect(cache.get).not.toHaveBeenCalled()
  expect(cache.set).not.toHaveBeenCalled()
})

it("bounds followers when a cold handler never produces a response", async () => {
  jest.useFakeTimers()
  try {
    const cache = fakeCache(), req = request(cache, { originalUrl: "/store/products?limit=13" })
    const middleware = cacheStoreGet(60), first = response(), second = response()
    const leader = middleware(req, first, jest.fn())
    const follower = middleware(req, second, jest.fn())
    await jest.advanceTimersByTimeAsync(2001)
    await Promise.all([leader, follower])
    expect(second.status).toHaveBeenCalledWith(503)
    expect(second.setHeader).toHaveBeenCalledWith("Retry-After", "1")
  } finally { jest.useRealTimers() }
})

it("keeps each locale and each publishable key apart", () => {
  const base = request(null)
  const arabic = request(null, { headers: { ...base.headers, "x-medusa-locale": "ar" } })
  const other = request(null, { headers: { ...base.headers, "x-publishable-api-key": "pk2" } })
  expect(new Set([storeCacheKey(base), storeCacheKey(arabic), storeCacheKey(other)]).size).toBe(3)
})

it("does not share signed-in or non-GET requests", async () => {
  const cache = fakeCache()
  const signedIn = request(cache, { headers: { authorization: "Bearer x" } })
  const post = request(cache, { method: "POST" })
  expect(await run(signedIn, response())).toHaveBeenCalled()
  expect(await run(post, response())).toHaveBeenCalled()
  expect(cache.get).not.toHaveBeenCalled()
  expect(cache.set).not.toHaveBeenCalled()
})

it("does not store errors", async () => {
  const cache = fakeCache()
  const res = response()
  res.statusCode = 404
  await run(request(cache), res)
  expect(cache.set).not.toHaveBeenCalled()
})

it("still answers when the cache is down", async () => {
  const broken = { get: jest.fn().mockRejectedValue(new Error("redis down")) }
  const res = response()
  expect(await run(request(broken), res)).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith({ products: [1] })
})

it("still answers when the cache never replies", async () => {
  const stuck = { get: jest.fn(() => new Promise(() => {})), set: jest.fn() }
  const res = response()
  expect(await run(request(stuck), res)).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith({ products: [1] })
  expect(stuck.set).not.toHaveBeenCalled()
})

it("clears the store cache after a successful admin write only", () => {
  const cache = fakeCache()
  cache.store.set("store-cache:abc", { products: [1] })
  const finish = (statusCode: number, method = "POST") => {
    const res = response()
    res.statusCode = statusCode
    invalidateStoreCacheAfterWrite(request(cache, { method }), res, jest.fn())
    return res.on.mock.calls[0]?.[1] as (() => void) | undefined
  }
  expect(finish(200, "GET")).toBeUndefined()
  finish(500)!()
  expect(cache.invalidate).not.toHaveBeenCalled()
  finish(200)!()
  expect(cache.invalidate).toHaveBeenCalledWith("store-cache:*")
})

it.each(["/store/products?limit=5", "/store/regions", "/store/product-categories"])("does not let a public no-cache header bypass %s", async originalUrl => {
  const cache = fakeCache()
  await run(request(cache, { originalUrl }), response())
  const next = await run(request(cache, { originalUrl, headers: { ...request(cache).headers, "cache-control": "no-cache" } }), response())
  expect(next).not.toHaveBeenCalled()
  expect(cache.get).toHaveBeenCalledTimes(2)
})
