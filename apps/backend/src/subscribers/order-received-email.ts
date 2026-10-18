import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { orderReceivedContent, orderReceivedKey, type ReceivedOrder } from "../lib/order-received-email"

const ORDER_FIELDS = [
  "id", "display_id", "email", "currency_code", "item_total", "shipping_total", "discount_total", "total",
  "items.title", "items.variant_title", "items.quantity", "items.total",
  "shipping_address.first_name", "shipping_address.address_1", "shipping_address.city",
]

// Emails the shopper that the order was received. A failed send never affects
// the order; it is logged without the customer's details.
export default async function orderReceivedEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [order] } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: event.data.id } })
    if (!order?.email) return
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: order.email as string,
      channel: "email",
      template: "order-received",
      trigger_type: event.name,
      resource_id: order.id,
      resource_type: "order",
      idempotency_key: orderReceivedKey(order.id),
      content: orderReceivedContent(order as unknown as ReceivedOrder),
    })
  } catch (error) {
    logger.error(`Order ${event.data.id} received email failed: ${(error as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
