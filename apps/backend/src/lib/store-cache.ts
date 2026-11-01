import { createHash } from "node:crypto"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ICacheService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Purpose: answer public catalog reads from Redis instead of Postgres.
// Source of truth: Postgres. A cached answer is only a copy that expires.
// Cart, checkout and payment routes are never cached (see api/middlewares.ts).
const PREFIX = "store-cache:"

// With Redis stopped, the Redis client queues commands and never answers, so the
// read must give up on its own. Every request pays this wait while Redis is down.
const READ_TIMEOUT_MS = 250
const FILL_TIMEOUT = Symbol("fill timeout")
const invalidations = new WeakMap<ICacheService, Promise<void>>()
const fills = new Map<string, { promise: Promise<unknown>, finish: (body?: unknown) => void }>()
let revision = 0

function withinReadTimeout<T>(read: Promise<T>) {
  let timer: NodeJS.Timeout
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("cache read timed out")), READ_TIMEOUT_MS) })
  return Promise.race([read, timeout]).finally(() => clearTimeout(timer))
}

// The answer depends on the publishable key (sales channel), the locale and the
// region/fields already in the URL. Leaving the locale out would show Arabic
// names to English visitors.
export function storeCacheKey(req: Pick<MedusaRequest, "originalUrl" | "headers">) {
  const { headers } = req
  const url = new URL(req.originalUrl, "http://cache.invalid")
  url.searchParams.sort()
  const keys = [...new Set(String(headers["x-publishable-api-key"] ?? "").split(",").map(key => key.trim()))].sort().join(",")
  const parts = [url.pathname + url.search, keys, headers["x-medusa-locale"], headers["accept-language"]]
  return PREFIX + createHash("sha256").update(parts.map((part) => String(part ?? "")).join("\n")).digest("hex")
}

// Signed-in requests can carry customer-group prices, so only anonymous reads are shared.
const isAnonymousRead = (req: Pick<MedusaRequest, "method" | "headers">) =>
  req.method === "GET" && !req.headers.authorization && !req.headers.cookie

export const MAX_CACHED_BODY_BYTES = 128 * 1024
function hasCacheableQuery(req: Pick<MedusaRequest, "originalUrl" | "headers">) {
  const url = new URL(req.originalUrl, "http://cache.invalid")
  // Only query-free catalog representations have a bounded, source-owned key
  // space. Search, filters and pagination still work through the native handler.
  if (url.search || !/^\/store\/(products|product-categories|collections|regions|brands|product-tags|deals)(\/[a-z0-9_]+)?$/.test(url.pathname) || /[#%\\]/.test(req.originalUrl) || req.originalUrl.length > 1024) return false
  if (![undefined, "en", "ar"].includes(req.headers["x-medusa-locale"] as string | undefined)) return false
  return [undefined, "en", "ar", "en-US", "ar-EG"].includes(req.headers["accept-language"] as string | undefined)
}

// A cache that is down or slow must never break the store: any cache error
// falls through to the normal handler.
export function cacheStoreGet(ttlSeconds: number) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (!isAnonymousRead(req) || !hasCacheableQuery(req)) return next()
    let cache: ICacheService
    const key = storeCacheKey(req)
    try {
      cache = req.scope.resolve<ICacheService>(Modules.CACHE)
      const hit = await withinReadTimeout(cache.get<unknown>(key))
      if (hit) return res.json(hit)
    } catch {
      return next()
    }
    const pending = fills.get(key)
    if (pending) {
      const body = await pending.promise
      if (body === undefined) return next()
      if (body !== FILL_TIMEOUT) return res.json(body)
      res.setHeader("Retry-After", "1")
      return res.status(503).json({ message: "Catalog temporarily busy. Retry shortly." })
    }
    // Bound both coordination lifetime and cardinality. Cross-process requests
    // still use Redis; this combines only duplicate work within one server.
    if (fills.size >= 256) return next()
    const started = revision
    let finish!: (body?: unknown) => void
    const promise = new Promise<unknown>(resolve => { finish = resolve })
    const timer = setTimeout(() => complete(FILL_TIMEOUT), 2000)
    const complete = (body?: unknown) => {
      if (fills.get(key)?.promise !== promise) return
      fills.delete(key)
      clearTimeout(timer)
      finish(body)
    }
    fills.set(key, { promise, finish: complete })
    res.on("finish", () => complete())
    res.on("close", () => complete())
    const send = res.json.bind(res)
    res.json = (body) => {
      const withinSize = Buffer.byteLength(JSON.stringify(body) ?? "", "utf8") <= MAX_CACHED_BODY_BYTES
      if (res.statusCode === 200 && started === revision && withinSize) {
        cache.set(key, body, ttlSeconds).catch(() => {})
        complete(body)
      } else complete()
      return send(body)
    }
    try { return next() } catch (error) { complete(); throw error }
  }
}

// Called after any successful admin write, so a changed product, price, brand or
// category shows up at once instead of after the expiry time.
export function invalidateStoreCacheAfterWrite(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (req.method !== "GET") {
    res.on("finish", () => {
      if (res.statusCode >= 400) return
      void invalidateStoreCache(req.scope)
    })
  }
  return next()
}

export async function invalidateStoreCache(scope: MedusaRequest["scope"]) {
  revision++
  let cache: ICacheService
  try { cache = scope.resolve<ICacheService>(Modules.CACHE) } catch { return }
  const pending = invalidations.get(cache)
  if (pending) return pending
  const work = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const requested = revision
        await cache.invalidate(`${PREFIX}*`)
        if (requested === revision) return
      } catch {
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
    // Failures and concurrent writes share this budget; after three scans TTL is the final bound.
  })()
  invalidations.set(cache, work)
  try { await work } finally { invalidations.delete(cache) }
}
