import { MedusaError } from "@medusajs/framework/utils"
import expire from "../expire-points"
import cleanup from "../remove-abandoned-carts"
import syncStock from "../sync-odoo-stock"

it.each([expire, cleanup, syncStock])("skips only another worker's lock acquisition timeout", async job => {
  const execute = jest.fn().mockRejectedValueOnce(new MedusaError(MedusaError.Types.CONFLICT, "Timed-out acquiring lock."))
  const container = { resolve: () => ({ execute }) } as never
  await expect(job(container)).resolves.toBeUndefined()
  execute.mockRejectedValueOnce(new Error("Redis unavailable"))
  await expect(job(container)).rejects.toThrow("Redis unavailable")
})

it("does not swallow an identical timeout thrown after the job starts", async () => {
  const timeout = new MedusaError(MedusaError.Types.CONFLICT, "Timed-out acquiring lock.")
  const container = { resolve: (key: string) => key === "locking"
    ? { execute: async (_key: string, work: () => Promise<unknown>) => work() }
    : { customerPointPage: async () => { throw timeout } } } as never
  await expect(expire(container)).rejects.toBe(timeout)
})
