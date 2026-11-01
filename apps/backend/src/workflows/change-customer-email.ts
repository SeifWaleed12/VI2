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

// Only the previous marker enters workflow compensation state, never the
// provider's password hash. The caller holds the credential lock throughout.
const markEmailChangedStep = createStep(
  "mark-email-changed",
  async (input: ChangeCustomerEmailInput, { container }) => {
    const auth = container.resolve(Modules.AUTH)
    const provider = await auth.retrieveProviderIdentity(input.login_id)
    await auth.updateProviderIdentities([{ id: input.login_id, provider_metadata: { ...provider.provider_metadata, email_changed_at: Date.now() } }])
    return new StepResponse(undefined, { login_id: input.login_id, previous: provider.provider_metadata?.email_changed_at ?? null })
  },
  async (input: { login_id: string, previous: unknown } | undefined, { container }) => {
    if (!input) return
    const auth = container.resolve(Modules.AUTH)
    const provider = await auth.retrieveProviderIdentity(input.login_id)
    await auth.updateProviderIdentities([{ id: input.login_id, provider_metadata: { ...provider.provider_metadata, email_changed_at: input.previous } }])
  }
)

const clearLegacyMarkerStep = createStep("clear-legacy-marker", async (input: ChangeCustomerEmailInput, { container }) => {
  await container.resolve(Modules.AUTH).updateAuthIdentities([{ id: input.auth_identity_id, app_metadata: { ...input.app_metadata, email_changed_at: null } }])
  return new StepResponse(undefined, input)
}, async (input: ChangeCustomerEmailInput | undefined, { container }) => {
  if (input) await container.resolve(Modules.AUTH).updateAuthIdentities([{ id: input.auth_identity_id, app_metadata: input.app_metadata }])
})

export const changeCustomerEmailWorkflow = createWorkflow(
  "change-customer-email",
  (input: ChangeCustomerEmailInput) => {
    moveLoginEmailStep(input)
    markEmailChangedStep(input)
    clearLegacyMarkerStep(input)
    const customerUpdate = transform({ input }, ({ input }) => ({ selector: { id: input.customer_id }, update: { email: input.to } }))
    updateCustomersStep(customerUpdate)
    return new WorkflowResponse(undefined)
  }
)
