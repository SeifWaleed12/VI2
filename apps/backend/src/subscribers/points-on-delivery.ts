import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, FulfillmentWorkflowEvents } from "@medusajs/framework/utils"
import { earnsPoints, POINTS_ORDER_FIELDS, pointsFor, recordPoints, takeEarlierRefunds } from "../lib/points"

// Vi2 Points are earned when an order is delivered (P-5): marked delivered in
// the admin today, by the Bosta integration later. Failures are logged without
// customer details and thrown, so the Redis event bus retries; a retry never
// counts twice (P-10).
export default async function pointsOnDelivery({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [fulfillment] } = await query.graph({ entity: "fulfillment", fields: ["id", "order.id"], filters: { id: event.data.id } })
    const orderId = (fulfillment as { order?: { id?: string } } | undefined)?.order?.id
    if (!orderId) return
    const { data: [order] } = await query.graph({ entity: "order", fields: POINTS_ORDER_FIELDS, filters: { id: orderId } })
    if (!earnsPoints(order as never)) return
    const customerId = order.customer_id as string
    await recordPoints(container, { customer_id: customerId, kind: "earn", source_id: order.id }, async () =>
      Math.max(0, pointsFor(order.item_total) - await takeEarlierRefunds(container, customerId, order.id)))
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Vi2 Points for delivery ${event.data.id} failed: ${(error as Error).message}`)
    throw error
  }
}

export const config: SubscriberConfig = { event: FulfillmentWorkflowEvents.DELIVERY_CREATED }
