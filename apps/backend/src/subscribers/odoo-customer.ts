import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, CustomerWorkflowEvents } from "@medusajs/framework/utils"
import { pushCustomerToOdoo } from "../lib/odoo-push"

// A registered customer goes to Odoo as a contact and lead. Failures are
// logged without the customer's details and thrown, so the Redis event bus
// retries.
export default async function odooCustomer({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    await pushCustomerToOdoo(container, event.data.id)
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Odoo push of customer ${event.data.id} failed: ${(error as Error).message}`)
    throw error
  }
}

export const config: SubscriberConfig = { event: CustomerWorkflowEvents.CREATED }
