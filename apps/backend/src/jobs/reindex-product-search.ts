import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_SEARCH_INDEX } from "../lib/product-search"

// Product events keep the index current; renamed categories and brands, Arabic
// name edits and variant edits are caught by this nightly rebuild. "swap" builds
// a new copy and switches to it, so search keeps working meanwhile.
export default async function reindexProductSearchJob(container: MedusaContainer) {
  const { job_id } = await container.resolve(Modules.SEARCH).reindex({ index: PRODUCT_SEARCH_INDEX, strategy: "swap" })
  container.resolve(ContainerRegistrationKeys.LOGGER).info(`Product search rebuild started (${job_id})`)
}

export const config = {
  name: "reindex-product-search",
  schedule: "0 4 * * *", // every night at 04:00
}
