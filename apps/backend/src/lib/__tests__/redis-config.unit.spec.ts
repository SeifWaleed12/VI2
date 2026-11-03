import { EVENT_RETRY, redisModules } from "../redis-config"

it("uses Redis for the cache, events, workflows and locks when REDIS_URL is set", () => {
  const modules = redisModules({ REDIS_URL: " redis://cache:6379 " })
  expect(modules).toEqual([
    { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl: "redis://cache:6379", redisOptions: { enableOfflineQueue: false, maxRetriesPerRequest: 0, commandTimeout: 1500, socketTimeout: 2000, autoResendUnfulfilledCommands: false } } },
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
  expect(EVENT_RETRY).toEqual({ attempts: 5, backoff: { type: "exponential", delay: 10_000 }, removeOnFail: { age: 604800, count: 5000 } })
})

it("refuses missing or blank production Redis configuration", () => {
  expect(() => redisModules({ NODE_ENV: "production" })).toThrow("REDIS_URL")
  expect(() => redisModules({ NODE_ENV: "production", REDIS_URL: " " })).toThrow("REDIS_URL")
})
