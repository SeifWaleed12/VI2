import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { removeRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { BRAND_MODULE } from "../modules/brand"
import BrandModuleService from "../modules/brand/service"

export type CreateBrandInput = {
  name: string
  slug: string
  description: string | null
  logo: string | null
  country: string | null
  status: string
}

export type UpdateBrandInput = { id: string } & Partial<CreateBrandInput>

const createBrandStep = createStep(
  "create-brand",
  async (input: CreateBrandInput, { container }) => {
    const service: BrandModuleService = container.resolve(BRAND_MODULE)
    const brand = await service.createBrands(input)
    return new StepResponse(brand, brand.id)
  },
  async (id, { container }) => {
    if (!id) return
    const service: BrandModuleService = container.resolve(BRAND_MODULE)
    await service.deleteBrands(id)
  }
)

const updateBrandStep = createStep(
  "update-brand",
  async (input: UpdateBrandInput, { container }) => {
    const service: BrandModuleService = container.resolve(BRAND_MODULE)
    const previous = await service.retrieveBrand(input.id)
    const brand = await service.updateBrands(input)
    return new StepResponse(brand, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const service: BrandModuleService = container.resolve(BRAND_MODULE)
    const { id, name, slug, description, logo, country, status } = previous
    await service.updateBrands({ id, name, slug, description, logo, country, status })
  }
)

const deleteBrandStep = createStep(
  "delete-brand",
  async (id: string, { container }) => {
    const service: BrandModuleService = container.resolve(BRAND_MODULE)
    await service.softDeleteBrands(id)
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (!id) return
    const service: BrandModuleService = container.resolve(BRAND_MODULE)
    await service.restoreBrands(id)
  }
)

export const createBrandWorkflow = createWorkflow(
  "create-brand",
  (input: CreateBrandInput) => new WorkflowResponse(createBrandStep(input))
)

export const updateBrandWorkflow = createWorkflow(
  "update-brand",
  (input: UpdateBrandInput) => new WorkflowResponse(updateBrandStep(input))
)

export const deleteBrandWorkflow = createWorkflow(
  "delete-brand",
  (input: { id: string }) => {
    const id = deleteBrandStep(input.id)
    // Product links are not cascade-deleting, so this removes only the
    // product-brand link rows, never the products.
    removeRemoteLinkStep({ [BRAND_MODULE]: { brand_id: input.id } })
    return new WorkflowResponse(id)
  }
)
