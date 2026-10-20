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

// Each write is its own step, so whichever later step fails, every write made
// before it is undone: the login and the customer's email never end up apart.

// Moves the email-and-password login to the new address.
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

// Records when the email changed, in the login's app_metadata; a link must be
// newer than this to work.
const markEmailChangedStep = createStep(
  "mark-email-changed",
  async (input: ChangeCustomerEmailInput, { container }) => {
    await container.resolve(Modules.AUTH).updateAuthIdentities([{ id: input.auth_identity_id, app_metadata: { ...input.app_metadata, email_changed_at: Date.now() } }])
    return new StepResponse(undefined, input)
  },
  async (input: ChangeCustomerEmailInput | undefined, { container }) => {
    if (!input) return
    await container.resolve(Modules.AUTH).updateAuthIdentities([{ id: input.auth_identity_id, app_metadata: input.app_metadata }])
  }
)

export const changeCustomerEmailWorkflow = createWorkflow(
  "change-customer-email",
  (input: ChangeCustomerEmailInput) => {
    moveLoginEmailStep(input)
    markEmailChangedStep(input)
    const customerUpdate = transform({ input }, ({ input }) => ({ selector: { id: input.customer_id }, update: { email: input.to } }))
    updateCustomersStep(customerUpdate)
    return new WorkflowResponse(undefined)
  }
)
