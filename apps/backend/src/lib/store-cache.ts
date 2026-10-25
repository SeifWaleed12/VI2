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
  const parts = [url.pathname + url.search, headers["x-publishable-api-key"], headers["x-medusa-locale"], headers["accept-language"]]
  return PREFIX + createHash("sha256").update(parts.map((part) => String(part ?? "")).join("\n")).digest("hex")
}

// Signed-in requests can carry customer-group prices, so only anonymous reads are shared.
const isAnonymousRead = (req: Pick<MedusaRequest, "method" | "headers">) =>
  req.method === "GET" && !req.headers.authorization && !req.headers.cookie

const CACHE_QUERY_FIELDS = new Set(["limit", "offset", "fields", "region_id", "currency_code", "q", "order", "id", "category_id", "brand_id", "tag_id", "collection_id", "handle", "include_descendants", "parent_category_id"])
function hasCacheableQuery(req: Pick<MedusaRequest, "originalUrl" | "headers">) {
  if (req.originalUrl.length > 8192 || String(req.headers["accept-language"] ?? "").length > 256) return false
  return [...new URL(req.originalUrl, "http://cache.invalid").searchParams.keys()]
    .every(key => CACHE_QUERY_FIELDS.has(key.replace(/\[.*$/, "")))
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
      if (body !== undefined) return res.json(body)
      res.setHeader("Retry-After", "1")
      return res.status(503).json({ message: "Catalog temporarily busy. Retry shortly." })
    }
    // Bound both coordination lifetime and cardinality. Cross-process requests
    // still use Redis; this combines only duplicate work within one server.
    if (fills.size >= 256) return next()
    const started = revision
    let finish!: (body?: unknown) => void
    const promise = new Promise<unknown>(resolve => { finish = resolve })
    const timer = setTimeout(() => complete(), 2000)
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
      if (res.statusCode === 200 && started === revision) {
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
  try {
    await scope.resolve<ICacheService>(Modules.CACHE).invalidate(`${PREFIX}*`)
  } catch {
    // The expiry time still removes the stale copy.
  }
}
