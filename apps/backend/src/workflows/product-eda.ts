import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep, dismissRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { EDA_MODULE } from "../modules/eda"
import type EdaModuleService from "../modules/eda/service"

export type ProductEdaInput = { product_id: string, registration_number: string, is_approved: boolean }

type EdaRecord = { id: string, registration_number: string, is_approved: boolean }
type SaveInput = { existingId: string | null, registration_number: string, is_approved: boolean }
type SaveUndo = { createdId: string } | { previous: EdaRecord }

const findProductEdaStep = createStep(
  "find-product-eda",
  async (productId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [product] } = await query.graph({ entity: "product", fields: ["id", "eda_registration.id"], filters: { id: productId } })
    if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product ${productId} was not found`)
    const registration = (product as { eda_registration?: { id: string } | null }).eda_registration
    return new StepResponse(registration?.id ?? null)
  }
)

// Creates the registration, or updates the product's existing one. Compensation
// deletes what it created or restores the previous values.
const saveEdaRegistrationStep = createStep(
  "save-eda-registration",
  async (input: SaveInput, { container }) => {
    const service: EdaModuleService = container.resolve(EDA_MODULE)
    const data = { registration_number: input.registration_number, is_approved: input.is_approved }
    if (!input.existingId) {
      const created = await service.createEdaRegistrations(data)
      return new StepResponse<EdaRecord, SaveUndo>(created as EdaRecord, { createdId: created.id })
    }
    const previous = await service.retrieveEdaRegistration(input.existingId)
    const updated = await service.updateEdaRegistrations({ id: input.existingId, ...data })
    return new StepResponse<EdaRecord, SaveUndo>(updated as EdaRecord, { previous: previous as EdaRecord })
  },
  async (undo: SaveUndo | undefined, { container }) => {
    if (!undo) return
    const service: EdaModuleService = container.resolve(EDA_MODULE)
    if ("createdId" in undo) {
      await service.deleteEdaRegistrations(undo.createdId)
    } else {
      const { id, registration_number, is_approved } = undo.previous
      await service.updateEdaRegistrations({ id, registration_number, is_approved })
    }
  }
)

export const setProductEdaWorkflow = createWorkflow(
  "set-product-eda",
  (input: ProductEdaInput) => {
    const existingId = findProductEdaStep(input.product_id)
    const saveInput = transform({ input, existingId }, ({ input, existingId }) => ({
      existingId,
      registration_number: input.registration_number,
      is_approved: input.is_approved,
    }))
    const registration = saveEdaRegistrationStep(saveInput)
    when("eda-registration-is-new", { existingId }, ({ existingId }) => !existingId).then(() => {
      const link = transform({ input, registration }, ({ input, registration }) => [{
        [Modules.PRODUCT]: { product_id: input.product_id },
        [EDA_MODULE]: { eda_registration_id: registration.id },
      }])
      createRemoteLinkStep(link)
    })
    return new WorkflowResponse(registration)
  }
)

const deleteEdaRegistrationStep = createStep(
  "delete-eda-registration",
  async (id: string, { container }) => {
    const service: EdaModuleService = container.resolve(EDA_MODULE)
    await service.softDeleteEdaRegistrations(id)
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (!id) return
    const service: EdaModuleService = container.resolve(EDA_MODULE)
    await service.restoreEdaRegistrations(id)
  }
)

export const removeProductEdaWorkflow = createWorkflow(
  "remove-product-eda",
  (input: { product_id: string }) => {
    const existingId = findProductEdaStep(input.product_id)
    when("product-has-eda-registration", { existingId }, ({ existingId }) => !!existingId).then(() => {
      const registrationId = transform({ existingId }, ({ existingId }) => existingId as string)
      const link = transform({ input, registrationId }, ({ input, registrationId }) => [{
        [Modules.PRODUCT]: { product_id: input.product_id },
        [EDA_MODULE]: { eda_registration_id: registrationId },
      }])
      dismissRemoteLinkStep(link)
      deleteEdaRegistrationStep(registrationId)
    })
    return new WorkflowResponse(existingId)
  }
)
