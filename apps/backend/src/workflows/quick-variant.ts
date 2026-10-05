import type { IProductModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createAndLinkProductOptionsToProductWorkflow,
  createProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

export type QuickVariantInput = {
  product_id: string
  option_title: string
  option_value: string
  title?: string
  sku?: string
  barcode?: string
  prices: { amount: number; currency_code: string }[]
  manage_inventory?: boolean
}

type ProductOption = { id: string; title: string; values?: { value: string }[] }

type OptionChange =
  | { add: { title: string; values: string[] }[] }
  | { update: { product_option_id: string; add: { value: string }[] }[] }

// What the product's options need before the variant can reference the value.
// `change` is null when both the option and the value already exist.
export type OptionPlan = { option_title: string; option_value: string; change: OptionChange | null }

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Reuses the stored spelling of an existing option or value so the variant's
// option map always matches what the product already holds.
export function planOptionChange(options: ProductOption[], optionTitle: string, optionValue: string): OptionPlan {
  const option = options.find((candidate) => sameText(candidate.title, optionTitle))
  if (!option) {
    return {
      option_title: optionTitle,
      option_value: optionValue,
      change: { add: [{ title: optionTitle, values: [optionValue] }] },
    }
  }
  const value = (option.values ?? []).find((candidate) => sameText(candidate.value, optionValue))
  if (value) return { option_title: option.title, option_value: value.value, change: null }
  return {
    option_title: option.title,
    option_value: optionValue,
    change: { update: [{ product_option_id: option.id, add: [{ value: optionValue }] }] },
  }
}

export type AddedOptionValue = { option_id: string; value: string }

// The value this request will create on an already existing option. It is
// absent for a new option (Medusa removes the whole option on rollback) and when
// the value already exists (nothing is created, so nothing may be removed).
export function addedOptionValue(plan: OptionPlan): AddedOptionValue | null {
  if (!plan.change || !("update" in plan.change)) return null
  const [update] = plan.change.update
  return { option_id: update.product_option_id, value: update.add[0].value }
}

type OptionValueStore = Pick<IProductModuleService, "listProductOptionValues" | "deleteProductOptionValues">

// Medusa's rollback unlinks a value it added to an existing option but leaves the
// value itself behind, so the leftover is removed here.
export async function removeAddedOptionValue(store: OptionValueStore, added: AddedOptionValue) {
  const values = await store.listProductOptionValues({ option_id: added.option_id, value: added.value }, { select: ["id"] })
  if (values.length) await store.deleteProductOptionValues(values.map((value) => value.id))
}

// Does nothing going forward. It runs before the option change, so on rollback
// its compensation runs after Medusa has unlinked the value.
const cleanupAddedOptionValueStep = createStep(
  "cleanup-added-option-value",
  async (added: AddedOptionValue) => new StepResponse(undefined, added),
  async (added, { container }) => {
    if (!added) return
    await removeAddedOptionValue(container.resolve(Modules.PRODUCT), added)
  }
)

// Read-only, so it needs no compensation.
const planQuickVariantOptionStep = createStep(
  "plan-quick-variant-option",
  async (input: QuickVariantInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: ["id", "options.id", "options.title", "options.values.value"],
      filters: { id: input.product_id },
    })
    if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product ${input.product_id} was not found`)
    const options = (product.options ?? []).filter((option): option is NonNullable<typeof option> => !!option)
    return new StepResponse(planOptionChange(options as ProductOption[], input.option_title, input.option_value))
  }
)

// The option change and the variant are composed in one workflow so a failed
// variant rolls the new option or value back through Medusa's own compensation.
export const createQuickVariantWorkflow = createWorkflow(
  "create-quick-variant",
  (input: QuickVariantInput) => {
    const plan = planQuickVariantOptionStep(input)

    const added = transform({ plan }, ({ plan }) => addedOptionValue(plan))
    when("value-added-to-existing-option", { added }, ({ added }) => added !== null).then(() => {
      cleanupAddedOptionValueStep(added as AddedOptionValue)
    })

    when("option-needs-change", { plan }, ({ plan }) => plan.change !== null).then(() => {
      const optionInput = transform({ input, plan }, ({ input, plan }) => ({
        product_id: input.product_id,
        ...plan.change,
      }))
      createAndLinkProductOptionsToProductWorkflow.runAsStep({ input: optionInput })
    })

    const variantInput = transform({ input, plan }, ({ input, plan }) => ({
      product_variants: [{
        product_id: input.product_id,
        title: input.title || plan.option_value,
        sku: input.sku || undefined,
        barcode: input.barcode || undefined,
        manage_inventory: input.manage_inventory ?? true,
        options: { [plan.option_title]: plan.option_value },
        prices: input.prices,
      }],
    }))

    return new WorkflowResponse(createProductVariantsWorkflow.runAsStep({ input: variantInput }))
  }
)
