import { Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateCustomersStep } from "@medusajs/medusa/core-flows"

export type ChangeCustomerEmailInput = {
  login_id: string
  auth_identity_id: string
  // The login's server-only app_metadata; customers cannot write it.
  app_metadata: Record<string, unknown>
  customer_id: string
  from: string
  to: string
}

// Moves the email-and-password login to the new address and records when, in
// the login's app_metadata (email_changed_at), which a link must be newer than.
// Compensation restores both, so a failed customer update never leaves the
// login and the customer's email apart.
const moveLoginEmailStep = createStep(
  "move-login-email",
  async (input: ChangeCustomerEmailInput, { container }) => {
    const auth = container.resolve(Modules.AUTH)
    await auth.updateProviderIdentities([{ id: input.login_id, entity_id: input.to }])
    await auth.updateAuthIdentities([{ id: input.auth_identity_id, app_metadata: { ...input.app_metadata, email_changed_at: Date.now() } }])
    return new StepResponse(undefined, input)
  },
  async (input: ChangeCustomerEmailInput | undefined, { container }) => {
    if (!input) return
    const auth = container.resolve(Modules.AUTH)
    await auth.updateProviderIdentities([{ id: input.login_id, entity_id: input.from }])
    await auth.updateAuthIdentities([{ id: input.auth_identity_id, app_metadata: input.app_metadata }])
  }
)

export const changeCustomerEmailWorkflow = createWorkflow(
  "change-customer-email",
  (input: ChangeCustomerEmailInput) => {
    moveLoginEmailStep(input)
    const customerUpdate = transform({ input }, ({ input }) => ({ selector: { id: input.customer_id }, update: { email: input.to } }))
    updateCustomersStep(customerUpdate)
    return new WorkflowResponse(undefined)
  }
)
