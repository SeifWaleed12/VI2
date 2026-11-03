import { z } from "@medusajs/framework/zod"
import { passwordProblem } from "../lib/password-policy"

const text = z.string().trim().min(1).max(255)
export const registrationSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).transform((value) => value.toLowerCase()),
  password: z.string().refine((value) => passwordProblem(value) === null && value.trim().length > 0),
  first_name: text.max(100),
  last_name: text.max(100),
  phone: z.string().trim().max(32).optional(),
}).strict()

export const brandSchema = z.object({
  name: text,
  slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).nullable().optional(),
  logo: z.union([z.literal(""), z.url().refine((url) => ["https:", "http:"].includes(new URL(url).protocol))]).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).strict()

export const quickVariantSchema = z.object({
  option_title: text,
  option_value: text,
  title: text.optional(),
  sku: text.optional(),
  barcode: text.optional(),
  prices: z.array(z.object({ amount: z.number().finite().nonnegative(), currency_code: z.string().regex(/^[a-z]{3}$/) }).strict()).min(1).max(50),
  manage_inventory: z.boolean().optional(),
}).strict()

// The new password's rule is checked by changePassword, which reports the reason.
export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(1024),
  new_password: z.string().max(1024),
}).strict()

// Mirrors Medusa's own reservation body, but the order line is required: it is
// the only kind of reservation a manager may create.
export const allocationSchema = z.object({
  line_item_id: z.string().min(1),
  inventory_item_id: z.string().min(1),
  location_id: z.string().min(1),
  quantity: z.number(),
  description: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
}).strict()

// The number's format is not decided, so it is only trimmed and length-checked.
export const productEdaSchema = z.object({
  registration_number: text.max(100),
  is_approved: z.boolean(),
}).strict()

// The "New product (Vi2)" admin page. Stock fields (inventory items, quantities,
// manage_inventory, allow_backorder) are not accepted: stock comes from Odoo.
// Messages are shown next to the field the issue's path names.
const required = (message: string) => z.string({ error: message }).trim().min(1, message)
export const newProductSchema = z.object({
  title: required("Enter a title").max(255),
  subtitle: text.optional(),
  handle: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes").max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  category_ids: z.array(z.string().min(1)).max(50).optional(),
  status: z.enum(["draft", "published"]),
  weight: z.number().finite().positive("Weight must be more than 0").optional(),
  discountable: z.boolean(),
  brand_id: z.string().min(1).optional(),
  eda: productEdaSchema.optional(),
  images: z.array(z.url().refine((url) => ["https:", "http:"].includes(new URL(url).protocol))).max(20).optional(),
  // Shared options only (Products > Options). new_values are added to the
  // shared option when the product is saved, so every product can use them.
  options: z.array(z.object({
    id: z.string().min(1),
    value_ids: z.array(z.string().min(1)).max(100),
    new_values: z.array(text).max(50).optional(),
  }).strict().refine((option) => option.value_ids.length + (option.new_values?.length ?? 0) > 0, "Choose at least one value"))
    .min(1, "Add at least one option").max(10),
  variants: z.array(z.object({
    options: z.record(z.string(), text),
    sku: required("Enter a SKU").max(100),
    barcode: text.max(100).optional(),
    price: z.number({ error: "Enter a price" }).finite().positive("Price must be more than 0"),
  }).strict()).min(1, "Keep at least one variant").max(100),
}).strict().superRefine((product, ctx) => {
  if (new Set(product.options.map((option) => option.id)).size < product.options.length) {
    ctx.addIssue({ code: "custom", path: ["options"], message: "Each option can be added once" })
  }
  const seen = new Set<string>()
  product.variants.forEach((variant, index) => {
    if (seen.has(variant.sku)) ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: `SKU ${variant.sku} is used twice in this form` })
    seen.add(variant.sku)
  })
})
