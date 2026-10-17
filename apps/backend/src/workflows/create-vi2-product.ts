import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductsWorkflow, createRemoteLinkStep, createTranslationsWorkflow } from "@medusajs/medusa/core-flows"
import { EGYPT_STORE } from "../lib/egypt-store"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import { setProductEdaWorkflow } from "./product-eda"

// What the "New product (Vi2)" admin page saves in one go.
export type Vi2ProductInput = {
  title: string
  title_ar?: string
  description?: string
  category_ids?: string[]
  status: "draft" | "published"
  weight?: number
  discountable: boolean
  brand_id?: string
  eda?: { registration_number: string, is_approved: boolean }
  images?: string[]
  options: { title: string, values: string[] }[]
  variants: { options: Record<string, string>, sku: string, barcode?: string, price: number }[]
}

type StoreDefaults = { sales_channel_id: string, shipping_profile_id: string }

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

function productData({ input, defaults }: { input: Vi2ProductInput, defaults: StoreDefaults }) {
  return {
    products: [{
      title: input.title,
      description: input.description,
      status: input.status,
      weight: input.weight,
      discountable: input.discountable,
      categories: input.category_ids?.map((id) => ({ id })),
      images: input.images?.map((url) => ({ url })),
      thumbnail: input.images?.[0],
      sales_channels: [{ id: defaults.sales_channel_id }],
      shipping_profile_id: defaults.shipping_profile_id,
      options: input.options,
      variants: input.variants.map((variant) => ({
        title: input.options.map((option) => variant.options[option.title]).join(" / "),
        sku: variant.sku,
        barcode: variant.barcode,
        options: variant.options,
        prices: [{ amount: variant.price, currency_code: EGYPT_STORE.currencyCode }],
        // Odoo owns stock: Medusa tracks it from zero and never oversells.
        manage_inventory: true,
        allow_backorder: false,
      })),
    }],
  }
}

// All or nothing: if a later step fails, the earlier ones are compensated, so
// no product is left without its brand, EDA registration or Arabic name.
export const createVi2ProductWorkflow = createWorkflow(
  "create-vi2-product",
  (input: Vi2ProductInput) => {
    const defaults = prepareVi2ProductStep(input)
    const products = createProductsWorkflow.runAsStep({ input: transform({ input, defaults }, productData) })
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
    when("vi2-product-has-arabic-name", { input }, ({ input }) => !!input.title_ar).then(() => {
      createTranslationsWorkflow.runAsStep({
        input: transform({ input, productId }, ({ input, productId }) => ({
          translations: [{ reference: "product", reference_id: productId, locale_code: "ar-EG", translations: { title: input.title_ar } }],
        })),
      })
    })
    return new WorkflowResponse(productId)
  }
)
