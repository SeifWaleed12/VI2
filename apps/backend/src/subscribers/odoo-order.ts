import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { pushOrderToOdoo } from "../lib/odoo-push"

// A placed order goes to Odoo as a sales order. It runs after the order is
// placed, so a failure never affects the order. Failures are logged without
// the customer's details and thrown, so the Redis event bus retries.
export default async function odooOrder({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    await pushOrderToOdoo(container, event.data.id)
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Odoo push of order ${event.data.id} failed: ${(error as Error).message}`)
    throw error
  }
}

export const config: SubscriberConfig = { event: OrderWorkflowEvents.PLACED }
