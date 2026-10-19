import { cartQueue } from "../cart-queue"

const later = <T,>(value: T, ms: number) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

it("sends changes in click order, even when an earlier one is slower", async () => {
  const run = cartQueue()
  const started: number[] = []
  const answers = await Promise.all([
    run(() => { started.push(2); return later(2, 30) }),
    run(() => { started.push(3); return later(3, 1) }),
  ])
  expect(started).toEqual([2, 3])
  expect(answers).toEqual([{ result: 2, latest: false }, { result: 3, latest: true }])
})

it("keeps going after a failed change", async () => {
  const run = cartQueue()
  const failed = run(() => Promise.reject(new Error("offline")))
  const next = run(() => later("ok", 1))
  await expect(failed).rejects.toThrow("offline")
  await expect(next).resolves.toEqual({ result: "ok", latest: true })
})
