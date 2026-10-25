import { medusa } from "../client"

it("aborts a stalled public SDK request within its deadline", async () => {
  const original = global.fetch
  global.fetch = jest.fn(async (_input, init) => new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal
    if (!signal) throw new Error("Request has no deadline")
    signal.addEventListener("abort", () => reject(signal.reason), { once: true })
  }))
  try {
    await expect(medusa.client.fetch("/store/products")).rejects.toMatchObject({ name: "TimeoutError" })
  } finally { global.fetch = original }
}, 20000)

it("also respects the caller's cancellation through the SDK", async () => {
  const original = global.fetch, controller = new AbortController()
  global.fetch = jest.fn(async (_input, init) => {
    controller.abort(new Error("search closed"))
    init?.signal?.throwIfAborted()
    return new Response("{}")
  })
  try {
    await expect(medusa.client.fetch("/store/products", { signal: controller.signal })).rejects.toThrow("search closed")
  } finally { global.fetch = original }
})
