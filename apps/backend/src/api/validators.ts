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
export const emailChangeSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
})

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

// Same id rules as the shop's filters; a single value arrives as a string.
const searchIds = z.union([z.string(), z.array(z.string())])
  .transform((value) => [value].flat())
  .pipe(z.array(z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)).max(50))
export const productSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(24).default(6),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  category_id: searchIds.optional(),
  brand_id: searchIds.optional(),
  tag_id: searchIds.optional(),
}).strict()
