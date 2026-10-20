import { cartQueue } from "../cart-queue"

type Cart = { quantity: number, total: number }
const later = <T,>(value: T, ms: number) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))
const failLater = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Not enough stock")), ms))
const cart = (quantity: number): Cart => ({ quantity, total: quantity * 1500 })

it("sends changes in click order and shows only the newest answer", async () => {
  const queue = cartQueue<Cart>()
  const started: number[] = []
  const answers = await Promise.all([
    queue.run(() => { started.push(2); return later(cart(2), 30) }),
    queue.run(() => { started.push(3); return later(cart(3), 1) }),
  ])
  expect(started).toEqual([2, 3])
  expect(answers).toEqual([{ show: null, latest: false }, { show: cart(3), latest: true }])
})

it("after a failed middle change, shows the cart from the change that followed", async () => {
  const queue = cartQueue<Cart>()
  const [, middle, last] = await Promise.all([
    queue.run(() => later(cart(2), 5)),
    queue.run(() => failLater(5)),
    queue.run(() => later(cart(4), 5)),
  ])
  expect(middle).toEqual(expect.objectContaining({ show: null, error: expect.any(Error) }))
  expect(last).toEqual({ show: cart(4), latest: true })
})

it("after a failed last change, shows Medusa's last confirmed cart, not the one from before the burst", async () => {
  const queue = cartQueue<Cart>()
  queue.confirm(cart(1))
  const [, last] = await Promise.all([
    queue.run(() => later(cart(2), 5)),
    queue.run(() => failLater(5)),
  ])
  // Medusa kept quantity 2 (3,000 EGP); the view must not go back to 1 (1,500 EGP).
  expect(last).toEqual(expect.objectContaining({ show: cart(2), latest: true, error: expect.any(Error) }))
})

it("shows nothing to restore when Medusa never confirmed a cart, so the caller rolls back", async () => {
  const queue = cartQueue<Cart>()
  await expect(queue.run(() => failLater(1))).resolves.toEqual(expect.objectContaining({ show: null, latest: true }))
})
