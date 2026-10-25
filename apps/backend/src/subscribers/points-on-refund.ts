import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, PaymentEvents } from "@medusajs/framework/utils"
import { orderPointsLeft, pointsFor, recordPoints } from "../lib/points"

// Points follow the money back (P-8): each refund on a registered customer's
// order removes its amount in points, never more than the order still holds and
// never below a zero balance (P-9). Medusa records a refund on the payment (a
// return's refund_amount stays empty in its own flow), so this reads the
// payment's refunds; each refund is used once (P-10). Failures are thrown so
// the Redis event bus retries.
export default async function pointsOnRefund({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [payment] } = await query.graph({
      entity: "payment",
      fields: ["id", "refunds.id", "refunds.amount", "payment_collection.order.id", "payment_collection.order.customer_id", "payment_collection.order.customer.has_account"],
      filters: { id: event.data.id },
    })
    type Order = { id: string, customer_id: string, customer?: { has_account?: boolean } | null }
    const order = (payment as { payment_collection?: { order?: Order | null } | null } | undefined)?.payment_collection?.order
    if (!order?.customer?.has_account) return
    for (const refund of (payment?.refunds ?? []) as { id: string, amount: unknown }[]) {
      await recordPoints(
        container,
        { customer_id: order.customer_id, kind: "refund", source_id: `${order.id}/${refund.id}` },
        () => -pointsFor(refund.amount),
        context => orderPointsLeft(container, order.id, context),
      )
    }
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Vi2 Points for refunded payment ${event.data.id} failed: ${(error as Error).message}`)
    throw error
  }
}

export const config: SubscriberConfig = { event: PaymentEvents.REFUNDED }
