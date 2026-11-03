import orderReceivedEmail from "../order-received-email"

const order = { id: "order_1", display_id: 7, email: "sara@example.com", total: 100 }
function container(createNotifications: jest.Mock, earlier: { status: string }[] = []) {
  const logger = { error: jest.fn() }
  const services: Record<string, unknown> = {
    logger,
    query: { graph: jest.fn().mockResolvedValue({ data: [order] }) },
    notification: { createNotifications, listNotifications: jest.fn().mockResolvedValue(earlier) },
  }
  return { logger, resolve: (key: string) => services[key] }
}
const event = { name: "order.placed", data: { id: "order_1" } }

it("sends one order-received email keyed by the order", async () => {
  const createNotifications = jest.fn().mockResolvedValue([])
  await orderReceivedEmail({ event, container: container(createNotifications) } as never)
  expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "sara@example.com", template: "order-received", idempotency_key: "order-received:order_1:0" }))
})

it("retries after a failed attempt under a new key, and skips an order already emailed", async () => {
  const retry = jest.fn().mockResolvedValue([])
  await orderReceivedEmail({ event, container: container(retry, [{ status: "failure" }]) } as never)
  expect(retry).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: "order-received:order_1:1" }))
  const done = jest.fn()
  await orderReceivedEmail({ event, container: container(done, [{ status: "failure" }, { status: "success" }]) } as never)
  expect(done).not.toHaveBeenCalled()
})

it("logs and rethrows a failed send so the event bus retries it", async () => {
  const c = container(jest.fn().mockRejectedValue(new Error("Resend refused the email (503): busy")))
  await expect(orderReceivedEmail({ event, container: c } as never)).rejects.toThrow("503")
  expect(c.logger.error).toHaveBeenCalledWith(expect.stringContaining("order_1"))
  expect(c.logger.error).not.toHaveBeenCalledWith(expect.stringContaining("sara@example.com"))
})
