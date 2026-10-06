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
