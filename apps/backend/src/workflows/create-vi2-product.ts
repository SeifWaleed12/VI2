import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateProductOptionValueDTO } from "@medusajs/framework/types"
import { createProductsWorkflow, createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { EGYPT_STORE } from "../lib/egypt-store"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import { setProductEdaWorkflow } from "./product-eda"

// What the "New product (Vi2)" admin page saves in one go.
export type Vi2ProductInput = {
  title: string
  subtitle?: string
  handle?: string
  description?: string
  category_ids?: string[]
  status: "draft" | "published"
  weight?: number
  discountable: boolean
  brand_id?: string
  eda?: { registration_number: string, is_approved: boolean }
  images?: string[]
  // Shared options (Products > Options): the chosen value ids, plus values to add to the option.
  options: { id: string, value_ids: string[], new_values?: string[] }[]
  // Variant options by option title, e.g. { Flavor: "Chocolate" }.
  variants: { options: Record<string, string>, sku: string, barcode?: string, price: number }[]
}

type StoreDefaults = { sales_channel_id: string, shipping_profile_id: string }
type ChosenOption = { id: string, title: string, values: { id: string, value: string }[] }

const sameValue = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Refuses SKUs the store already has and an unknown or inactive brand before
// anything is created, and finds the website's sales channel and the default
// shipping profile (the 70 EGP delivery option uses it).
const prepareVi2ProductStep = createStep(
  "prepare-vi2-product",
  async (input: Vi2ProductInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: taken } = await query.graph({ entity: "product_variant", fields: ["sku"], filters: { sku: input.variants.map((variant) => variant.sku) } })
    if (taken.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, taken.map((variant) => `SKU ${variant.sku} already exists`).join(". "))
    }
    if (input.brand_id) {
      const [brand] = await container.resolve<BrandModuleService>(BRAND_MODULE).listBrands({ id: input.brand_id })
      if (brand?.status !== "active") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose an active brand")
    }
    const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
    const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })
    if (!store?.default_sales_channel_id || !profile) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The store has no default sales channel or shipping profile. Run the Egypt store setup first.")
    }
    return new StepResponse<StoreDefaults>({ sales_channel_id: store.default_sales_channel_id, shipping_profile_id: profile.id })
  }
)

// Checks every option is a shared one, every chosen value belongs to it and
// every variant names exactly these options, then adds the new values to their
// shared option. A new value that matches an existing one (ignoring case) uses
// the existing one. Compensation deletes the values this step added.
const addSharedOptionValuesStep = createStep(
  "add-shared-option-values",
  async ({ options, variants }: Pick<Vi2ProductInput, "options" | "variants">, { container }) => {
    const productModule = container.resolve(Modules.PRODUCT)
    const found = await productModule.listProductOptions({ id: options.map((option) => option.id) }, { relations: ["values"] })
    const chosen: ChosenOption[] = []
    const toCreate: { option_id: string, value: string }[] = []
    for (const option of options) {
      const shared = found.find((candidate) => candidate.id === option.id)
      if (!shared || shared.is_exclusive) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose a shared option from Products > Options")
      const values = option.value_ids.map((id) => {
        const value = shared.values.find((candidate) => candidate.id === id)
        if (!value) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Choose ${shared.title} values from its list`)
        return { id: value.id, value: value.value }
      })
      for (const name of option.new_values ?? []) {
        const existing = shared.values.find((candidate) => sameValue(candidate.value, name))
        if (existing) values.push({ id: existing.id, value: existing.value })
        else if (!toCreate.some((value) => value.option_id === shared.id && sameValue(value.value, name))) toCreate.push({ option_id: shared.id, value: name })
      }
      chosen.push({ id: shared.id, title: shared.title, values })
    }
    // Medusa would drop an extra option and give a blank error for a missing one.
    const titles = chosen.map((option) => option.title)
    if (variants.some((variant) => {
      const keys = Object.keys(variant.options)
      return keys.length !== titles.length || !titles.every((title) => keys.includes(title))
    })) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Give each variant one value for each option: ${titles.join(", ")}`)
    }
    // option_id is a column of the value table, missing from Medusa's create DTO.
    const created = toCreate.length ? await productModule.createProductOptionValues(toCreate as CreateProductOptionValueDTO[]) : []
    created.forEach((value, index) => chosen.find((option) => option.id === toCreate[index].option_id)!.values.push({ id: value.id, value: value.value }))
    for (const option of chosen) option.values = option.values.filter((value, index) => option.values.findIndex((other) => other.id === value.id) === index)
    return new StepResponse(chosen, created.map((value) => value.id))
  },
  async (createdIds, { container }) => {
    if (createdIds?.length) await container.resolve(Modules.PRODUCT).deleteProductOptionValues(createdIds)
  }
)

function productData({ input, defaults, options }: { input: Vi2ProductInput, defaults: StoreDefaults, options: ChosenOption[] }) {
  return {
    products: [{
      title: input.title,
      subtitle: input.subtitle,
      handle: input.handle,
      description: input.description,
      status: input.status,
      weight: input.weight,
      discountable: input.discountable,
      categories: input.category_ids?.map((id) => ({ id })),
      images: input.images?.map((url) => ({ url })),
      thumbnail: input.images?.[0],
      sales_channels: [{ id: defaults.sales_channel_id }],
      shipping_profile_id: defaults.shipping_profile_id,
      options: options.map((option) => ({ id: option.id, value_ids: option.values.map((value) => value.id) })),
      variants: input.variants.map((variant) => {
        // Spelled the way the shared option stores it, so "mango" picks "Mango".
        const values = options.map((option) => {
          const typed = variant.options[option.title] ?? ""
          return [option.title, option.values.find((value) => sameValue(value.value, typed))?.value ?? typed]
        })
        return {
          title: values.map(([, value]) => value).join(" / "),
          sku: variant.sku,
          barcode: variant.barcode,
          options: Object.fromEntries(values),
          prices: [{ amount: variant.price, currency_code: EGYPT_STORE.currencyCode }],
          // Medusa owns stock: it is tracked from zero and never oversold.
          manage_inventory: true,
          allow_backorder: false,
        }
      }),
    }],
  }
}

// All or nothing: if a later step fails, the earlier ones are compensated, so
// no product is left without its brand or EDA registration, and no new option
// value is left behind.
export const createVi2ProductWorkflow = createWorkflow(
  "create-vi2-product",
  (input: Vi2ProductInput) => {
    const defaults = prepareVi2ProductStep(input)
    const options = addSharedOptionValuesStep(transform({ input }, ({ input }) => ({ options: input.options, variants: input.variants })))
    const products = createProductsWorkflow.runAsStep({ input: transform({ input, defaults, options }, productData) })
    const productId = transform({ products }, ({ products }) => products[0].id)

    when("vi2-product-has-brand", { input }, ({ input }) => !!input.brand_id).then(() => {
      createRemoteLinkStep(transform({ input, productId }, ({ input, productId }) => [{
        [Modules.PRODUCT]: { product_id: productId },
        [BRAND_MODULE]: { brand_id: input.brand_id },
      }]))
    })
    when("vi2-product-has-eda", { input }, ({ input }) => !!input.eda).then(() => {
      setProductEdaWorkflow.runAsStep({
        input: transform({ input, productId }, ({ input, productId }) => ({ product_id: productId, ...input.eda! })),
      })
    })
    return new WorkflowResponse(productId)
  }
)
