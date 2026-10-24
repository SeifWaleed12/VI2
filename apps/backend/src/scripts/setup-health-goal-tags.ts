import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductTagsWorkflow } from "@medusajs/medusa/core-flows"

// The storefront's health goal filter uses these exact tag values
// (apps/storefront/src/lib/health-goals.ts), so staff pick them instead of typing them.
// Creates only the missing ones, so it is safe to rerun:
//   npx medusa exec ./src/scripts/setup-health-goal-tags.ts
export const HEALTH_GOAL_TAGS = [
  "immune-support", "gut-health", "energy-fitness", "muscle-recovery", "heart-health", "stress-sleep",
]

export default async function setupHealthGoalTags({ container }: ExecArgs) {
  const existing = await container.resolve(Modules.PRODUCT).listProductTags({ value: HEALTH_GOAL_TAGS })
  const missing = HEALTH_GOAL_TAGS.filter((value) => !existing.some((tag) => tag.value === value))
  if (missing.length) await createProductTagsWorkflow(container).run({ input: { product_tags: missing.map((value) => ({ value })) } })
  container.resolve(ContainerRegistrationKeys.LOGGER).info(`Health goal tags ready; created: ${missing.join(", ") || "none"}`)
}
