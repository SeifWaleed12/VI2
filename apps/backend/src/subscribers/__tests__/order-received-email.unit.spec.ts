import orderReceivedEmail from "../order-received-email"

const order = { id: "order_1", display_id: 7, email: "sara@example.com", total: 100 }
function container(createNotifications: jest.Mock) {
  const logger = { error: jest.fn() }
  const services: Record<string, unknown> = {
    logger,
    query: { graph: jest.fn().mockResolvedValue({ data: [order] }) },
    notification: { createNotifications },
  }
  return { logger, resolve: (key: string) => services[key] }
}
const event = { name: "order.placed", data: { id: "order_1" } }

it("sends one order-received email keyed by the order", async () => {
  const createNotifications = jest.fn().mockResolvedValue([])
  await orderReceivedEmail({ event, container: container(createNotifications) } as never)
  expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "sara@example.com", template: "order-received", idempotency_key: "order-received:order_1" }))
})

it("logs and rethrows a failed send so the event bus retries it", async () => {
  const c = container(jest.fn().mockRejectedValue(new Error("Resend refused the email (503): busy")))
  await expect(orderReceivedEmail({ event, container: c } as never)).rejects.toThrow("503")
  expect(c.logger.error).toHaveBeenCalledWith(expect.stringContaining("order_1"))
  expect(c.logger.error).not.toHaveBeenCalledWith(expect.stringContaining("sara@example.com"))
})
