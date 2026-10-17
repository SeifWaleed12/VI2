// Medusa uses memory for its cache, locks, events and workflows unless told
// otherwise. With Redis, sign-in attempt counts, cached store answers, locks,
// events and running workflows survive restarts and are shared by every
// server. Tests always use memory so they never depend on a running Redis.
export function redisModules(env: NodeJS.ProcessEnv = process.env) {
  const redisUrl = env.REDIS_URL?.trim()
  if (!redisUrl || env.NODE_ENV === "test") return []
  return [
    { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl } },
    { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
    { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl } } },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [{ resolve: "@medusajs/medusa/locking-redis", id: "locking-redis", is_default: true, options: { redisUrl } }],
      },
    },
  ]
}
