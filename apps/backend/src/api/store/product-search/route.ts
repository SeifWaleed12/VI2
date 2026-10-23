import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_SEARCH_INDEX, productSearchFilters } from "../../../lib/product-search"
import { productSearchSchema } from "../../validators"

// Product ids best match first, forgiving typos and matching the last word as a
// prefix while typing. The storefront then reads those products through
// /store/products for prices and translations.
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const parsed = productSearchSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: "Invalid search" })
  const { limit, offset, ...input } = parsed.data
  const salesChannelIds = req.publishable_key_context.sales_channel_ids
  const { data, search_result } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).search({
    entity: PRODUCT_SEARCH_INDEX,
    fields: ["id"],
    filters: productSearchFilters(input, salesChannelIds),
    pagination: { skip: offset, take: limit },
    search_options: { match_strategy: "last", typo_tolerance: true, count: "exact" },
  })
  res.json({ ids: (data as { id: string }[]).map((product) => product.id), count: search_result.metadata.count ?? data.length })
}
