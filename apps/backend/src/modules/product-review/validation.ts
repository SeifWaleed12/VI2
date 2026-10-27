import { z } from "@medusajs/framework/zod"

export const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).refine(value => !value.includes("\u0000")).optional(),
  content: z.string().trim().min(20).max(3000).refine(value => !value.includes("\u0000")),
  version: z.number().int().positive().optional(),
}).strict()
export const reviewVersion = z.object({ version: z.number().int().positive() }).strict()
export const moderationInput = z.object({
  status: z.enum(["approved", "rejected"]),
  version: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
}).strict()
const number = (fallback: number, max: number) => z.coerce.number().int().min(0).max(max).default(fallback)
export const reviewListInput = z.object({
  limit: number(10, 20).refine(n => n > 0), offset: number(0, 100000),
  sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
}).strict()
export const moderationListInput = z.object({
  limit: number(10, 20).refine(n => n > 0), offset: number(0, 100000),
  status: z.enum(["pending", "approved", "rejected", "withdrawn"]).default("pending"),
}).strict()
export type ReviewInput = z.infer<typeof reviewInput>
export type ReviewListInput = z.infer<typeof reviewListInput>
