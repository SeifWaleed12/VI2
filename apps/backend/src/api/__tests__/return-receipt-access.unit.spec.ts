import { ContainerRegistrationKeys, Modules, ChangeActionType } from "@medusajs/framework/utils"
import { withReturnMutation } from "../return-receipt-access"

function fixture(shipped = 1, damaged = 0) {
  let received = 0, queue = Promise.resolve()
  const query = { graph: jest.fn(async ({ entity }) => entity === "return" ? { data: [{ order_id: "order_1" }] }
    : entity === "order_change" ? { data: [{ actions: [{ action: ChangeActionType.RECEIVE_RETURN_ITEM, details: { reference_id: "item_1", quantity: 1 } }] }] }
    : { data: [{ items: [{ id: "item_1", detail: { shipped_quantity: shipped, return_received_quantity: received, return_dismissed_quantity: damaged } }] }] }) }
  const locking = { execute: jest.fn((_key, work) => {
    const run = queue.then(() => work(new AbortController().signal))
    queue = run.then(() => undefined, () => undefined)
    return run
  }) }
  const scope = { resolve: key => key === ContainerRegistrationKeys.QUERY ? query : key === Modules.LOCKING ? locking : undefined }
  const req = { params: { id: "return_1" }, scope } as never
  const res = () => ({ json: jest.fn() })
  const native = jest.fn(async (_req, response) => { received++; response.json({ received: true }) })
  return { req, res, native, locking, received: () => received }
}

it("rejects unshipped receipts before native stock writes", async () => {
  const f = fixture(0)
  await expect(withReturnMutation(f.req, f.res() as never, f.native, true)).rejects.toThrow("shipped")
  expect(f.native).not.toHaveBeenCalled()
})
it("preserves shipped receipt and serializes competing receipts for the order", async () => {
  const f = fixture()
  const results = await Promise.allSettled([withReturnMutation(f.req, f.res() as never, f.native, true), withReturnMutation(f.req, f.res() as never, f.native, true)])
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
  expect(f.native).toHaveBeenCalledTimes(1)
  expect(f.received()).toBe(1)
  expect(f.locking.execute.mock.calls.map(call => call[0])).toEqual(["order-return-receipt:order_1", "order-return-receipt:order_1"])
})
it("counts damaged returns against the same shipped-unit budget", async () => {
  const f = fixture(1, 1)
  await expect(withReturnMutation(f.req, f.res() as never, f.native, true)).rejects.toThrow("Already returned")
  expect(f.native).not.toHaveBeenCalled()
})
it("stops before validation or native writes when its lease is already lost", async () => {
  const f = fixture()
  f.locking.execute.mockImplementationOnce((_key, work) => work(AbortSignal.abort(new Error("lease lost"))))
  await expect(withReturnMutation(f.req, f.res() as never, f.native, true)).rejects.toThrow("lease lost")
  expect(f.native).not.toHaveBeenCalled()
})
