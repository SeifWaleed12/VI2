import { createStep, createWorkflow, type WorkflowData, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"
import { discardAuthIdentity } from "../lib/discard-auth-identity"

export type RegisterCustomerInput = {
  authIdentityId: string
  customerData: { email: string, first_name: string, last_name: string, phone?: string }
}

// The identity is created before this workflow, so the password never enters
// workflow state. This step only makes that identity part of the rollback.
const adoptAuthIdentityStep = createStep(
  "adopt-auth-identity",
  async (authIdentityId: string) => new StepResponse(undefined, authIdentityId),
  async (authIdentityId: string | undefined, { container }) => {
    if (authIdentityId) await discardAuthIdentity(container, authIdentityId)
  }
)

export const registerCustomerWorkflow = createWorkflow("register-customer", (input: WorkflowData<RegisterCustomerInput>) => {
  adoptAuthIdentityStep(input.authIdentityId)
  return new WorkflowResponse(createCustomerAccountWorkflow.runAsStep({ input }))
})
