import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductTagsWorkflow } from "@medusajs/medusa/core-flows"

// The storefront filters by these exact tag values (apps/storefront/src/lib/health-goals.ts
// and the homepage bundles), so staff pick them from the list instead of typing them.
// Creates only the missing ones, so it is safe to rerun:
//   npx medusa exec ./src/scripts/setup-merchandising-tags.ts
export const MERCHANDISING_TAGS = [
  "immune-support", "gut-health", "energy-fitness", "muscle-recovery", "heart-health", "stress-sleep",
  "bundle",
]

export default async function setupMerchandisingTags({ container }: ExecArgs) {
  const existing = await container.resolve(Modules.PRODUCT).listProductTags({ value: MERCHANDISING_TAGS })
  const missing = MERCHANDISING_TAGS.filter((value) => !existing.some((tag) => tag.value === value))
  if (missing.length) await createProductTagsWorkflow(container).run({ input: { product_tags: missing.map((value) => ({ value })) } })
  container.resolve(ContainerRegistrationKeys.LOGGER).info(`Product tags ready; created: ${missing.join(", ") || "none"}`)
}
