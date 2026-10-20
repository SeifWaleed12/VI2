import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { orderPointsLeft, pointsFor, recordPoints } from "../lib/points"

// A received return removes the points of what was refunded (P-8), never more
// than the order still holds and never below a zero balance (P-9).
export default async function pointsOnReturn({ event, container }: SubscriberArgs<{ order_id: string, return_id: string }>) {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [received] } = await query.graph({ entity: "return", fields: ["id", "refund_amount"], filters: { id: event.data.return_id } })
    const { data: [order] } = await query.graph({ entity: "order", fields: ["id", "customer_id", "customer.has_account"], filters: { id: event.data.order_id } })
    if (!received || !order?.customer?.has_account) return
    await recordPoints(
      container,
      { customer_id: order.customer_id as string, kind: "return", points: -pointsFor(received.refund_amount), source_id: `${order.id}/${received.id}` },
      () => orderPointsLeft(container, order.id),
    )
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Vi2 Points for return ${event.data.return_id} failed: ${(error as Error).message}`)
    throw error
  }
}

export const config: SubscriberConfig = { event: OrderWorkflowEvents.RETURN_RECEIVED }
