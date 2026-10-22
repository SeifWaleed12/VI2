import { EVENT_RETRY, redisModules } from "../redis-config"

it("uses Redis for the cache, events, workflows and locks when REDIS_URL is set", () => {
  const modules = redisModules({ REDIS_URL: " redis://cache:6379 " })
  expect(modules).toEqual([
    { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl: "redis://cache:6379" } },
    { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl: "redis://cache:6379", jobOptions: EVENT_RETRY } },
    { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl: "redis://cache:6379" } } },
    {
      resolve: "@medusajs/medusa/locking",
      options: { providers: [{ resolve: "@medusajs/medusa/locking-redis", id: "locking-redis", is_default: true, options: { redisUrl: "redis://cache:6379" } }] },
    },
  ])
})

it("keeps Medusa's in-memory defaults without REDIS_URL and in tests", () => {
  expect(redisModules({})).toEqual([])
  expect(redisModules({ REDIS_URL: "  " })).toEqual([])
  expect(redisModules({ REDIS_URL: "redis://cache:6379", NODE_ENV: "test" })).toEqual([])
})

it("retries failed event subscribers a bounded number of times with growing waits", () => {
  expect(EVENT_RETRY).toEqual({ attempts: 5, backoff: { type: "exponential", delay: 10_000 } })
})
