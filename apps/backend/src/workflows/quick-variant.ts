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
  acquireLockStep,
  createAndLinkProductOptionsToProductWorkflow,
  createProductVariantsWorkflow,
  releaseLockStep,
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

// The value this request may create on an already existing option. It is absent
// for a new option (Medusa removes the whole option on rollback) and when the
// value already exists on the product (nothing is created).
export function addedOptionValue(plan: OptionPlan): AddedOptionValue | null {
  if (!plan.change || !("update" in plan.change)) return null
  const [update] = plan.change.update
  return { option_id: update.product_option_id, value: update.add[0].value }
}

// Ids of every value the option held before this request touched it. A value
// that is not listed here and appears afterwards was created by this request.
export type OptionValueSnapshot = AddedOptionValue & { existing_ids: string[] }

type OptionValueStore = Pick<IProductModuleService, "listProductOptionValues" | "softDeleteProductOptionValues">

export async function snapshotOptionValues(store: OptionValueStore, added: AddedOptionValue): Promise<OptionValueSnapshot> {
  // The option may be shared with other products and hold any number of values.
  const values = await store.listProductOptionValues({ option_id: added.option_id }, { select: ["id"], take: null })
  return { ...added, existing_ids: values.map((value) => value.id) }
}

// Medusa's rollback unlinks a value it added to an existing option but keeps the
// value itself. Only a value absent from the snapshot is removed, so values that
// existed before the request are never touched. The guarded soft delete also
// refuses any value linked to a product, so a variant that exists keeps its option.
export async function removeCreatedOptionValue(store: OptionValueStore, snapshot: OptionValueSnapshot) {
  const values = await store.listProductOptionValues({ option_id: snapshot.option_id, value: snapshot.value }, { select: ["id"], take: null })
  const created = values.map((value) => value.id).filter((id) => !snapshot.existing_ids.includes(id))
  if (!created.length) return
  try {
    await store.softDeleteProductOptionValues(created)
  } catch (error) {
    // Linked to a product by someone else: keep it. Anything else is a real failure.
    if (!(MedusaError.isMedusaError(error) && error.type === MedusaError.Types.INVALID_DATA)) throw error
  }
}

// Forward it only records what exists. It runs before the option change, so on
// rollback its compensation runs last, after Medusa has unlinked the value.
const guardAddedOptionValueStep = createStep(
  "guard-added-option-value",
  async (added: AddedOptionValue, { container }) => {
    const snapshot = await snapshotOptionValues(container.resolve(Modules.PRODUCT), added)
    return new StepResponse(snapshot, snapshot)
  },
  async (snapshot, { container }) => {
    if (!snapshot) return
    await removeCreatedOptionValue(container.resolve(Modules.PRODUCT), snapshot)
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

export const quickVariantLockKey = (productId: string) => `quick-variant:${productId}`

// Seconds. Requests for the same product wait for each other; the lock expires on
// its own if a process dies while holding it.
const LOCK_WAIT_SECONDS = 30
const LOCK_EXPIRE_SECONDS = 120

// The option change and the variant are composed in one workflow so a failed
// variant rolls the new option or value back. The lock serializes requests for
// the same product, so what the plan and the snapshot saw cannot change under it.
export const createQuickVariantWorkflow = createWorkflow(
  "create-quick-variant",
  (input: QuickVariantInput) => {
    const lockKey = transform({ input }, ({ input }) => quickVariantLockKey(input.product_id))
    acquireLockStep({ key: lockKey, timeout: LOCK_WAIT_SECONDS, ttl: LOCK_EXPIRE_SECONDS })

    const plan = planQuickVariantOptionStep(input)

    const added = transform({ plan }, ({ plan }) => addedOptionValue(plan))
    when("value-added-to-existing-option", { added }, ({ added }) => added !== null).then(() => {
      guardAddedOptionValueStep(added as AddedOptionValue)
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

    const variants = createProductVariantsWorkflow.runAsStep({ input: variantInput })
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(variants)
  }
)
