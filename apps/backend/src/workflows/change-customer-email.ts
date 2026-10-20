import { Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateCustomersStep } from "@medusajs/medusa/core-flows"

export type ChangeCustomerEmailInput = { login_id: string, customer_id: string, from: string, to: string, metadata: Record<string, unknown> }

// Moves the email-and-password login to the new address. Compensation moves it
// back, so a failed customer update never leaves the login and the customer's
// email apart.
const moveLoginEmailStep = createStep(
  "move-login-email",
  async (input: ChangeCustomerEmailInput, { container }) => {
    await container.resolve(Modules.AUTH).updateProviderIdentities([{ id: input.login_id, entity_id: input.to }])
    return new StepResponse(undefined, input)
  },
  async (input: ChangeCustomerEmailInput | undefined, { container }) => {
    if (!input) return
    await container.resolve(Modules.AUTH).updateProviderIdentities([{ id: input.login_id, entity_id: input.from }])
  }
)

export const changeCustomerEmailWorkflow = createWorkflow(
  "change-customer-email",
  (input: ChangeCustomerEmailInput) => {
    moveLoginEmailStep(input)
    const customerUpdate = transform({ input }, ({ input }) => ({ selector: { id: input.customer_id }, update: { email: input.to, metadata: input.metadata } }))
    updateCustomersStep(customerUpdate)
    return new WorkflowResponse(undefined)
  }
)
