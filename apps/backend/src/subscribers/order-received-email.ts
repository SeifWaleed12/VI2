import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { orderReceivedContent, orderReceivedKey, type ReceivedOrder } from "../lib/order-received-email"

// Medusa computes order totals from the items and shipping methods it loads
// (without item quantities the totals come back empty), so all their fields
// are loaded.
export const ORDER_FIELDS = [
  "id", "display_id", "email", "currency_code", "original_item_total", "original_shipping_total", "discount_total", "total",
  "items.*", "shipping_methods.*",
  "shipping_address.first_name", "shipping_address.address_1", "shipping_address.city",
]

// Emails the shopper that the order was received. It runs after the order is
// placed, so a failure never affects the order. A failure is logged without the
// customer's details and thrown, so the Redis event bus retries this subscriber
// (attempts in redis-config.ts). Each attempt is a new notification; an order
// already emailed is skipped, and Resend's idempotency key stops a second
// delivery if an earlier attempt did arrive.
export default async function orderReceivedEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [order] } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: event.data.id } })
    if (!order?.email) return
    const notifications = container.resolve(Modules.NOTIFICATION)
    const earlier = await notifications.listNotifications({ template: "order-received", resource_id: order.id })
    if (earlier.some((notification) => notification.status === "success")) return
    await notifications.createNotifications({
      to: order.email as string,
      channel: "email",
      template: "order-received",
      trigger_type: event.name,
      resource_id: order.id,
      resource_type: "order",
      idempotency_key: orderReceivedKey(order.id, earlier.length),
      content: orderReceivedContent(order as unknown as ReceivedOrder),
    })
  } catch (error) {
    logger.error(`Order ${event.data.id} received email failed: ${(error as Error).message}`)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
