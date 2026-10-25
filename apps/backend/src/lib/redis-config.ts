import { MedusaError } from "@medusajs/framework/utils"

// Medusa uses memory for its cache, locks, events and workflows unless told
// otherwise. With Redis, sign-in attempt counts, cached store answers, locks,
// events and running workflows survive restarts and are shared by every
// server. Tests always use memory so they never depend on a running Redis.
export const EVENT_RETRY = {
  attempts: 5, backoff: { type: "exponential", delay: 10_000 },
  removeOnFail: { age: 7 * 86400, count: 5000 },
}

export function redisModules(env: NodeJS.ProcessEnv = process.env) {
  const redisUrl = env.REDIS_URL?.trim()
  if (env.NODE_ENV === "production" && !redisUrl) throw new MedusaError(MedusaError.Types.INVALID_DATA, "REDIS_URL is required in production")
  if (!redisUrl || env.NODE_ENV === "test") return []
  return [
    // Optional cache commands must not accumulate during an outage or a stalled socket.
    { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl, redisOptions: {
      enableOfflineQueue: false, maxRetriesPerRequest: 0, commandTimeout: 250,
      socketTimeout: 500, autoResendUnfulfilledCommands: false,
    } } },
    // A subscriber that throws (for example an email send during a provider
    // outage) is retried with growing waits; subscribers that succeeded are not rerun.
    { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl, jobOptions: EVENT_RETRY } },
    { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl } } },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [{ resolve: "@medusajs/medusa/locking-redis", id: "locking-redis", is_default: true, options: { redisUrl } }],
      },
    },
  ]
}
