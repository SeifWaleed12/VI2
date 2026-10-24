import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { catalogSchema } from "../../validators"
import { catalogContext, catalogOrder, catalogPriceVersion, readCatalogState } from "../../../lib/catalog-ranking"
import { requestCatalogRefresh } from "../../../lib/catalog-refresh-request"
import { productSearchFilters } from "../../../lib/product-search"

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const parsed = catalogSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: "Invalid catalog filters" })
  const { limit, offset, sort, region_id, deals, ...input } = parsed.data
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const context = await catalogContext(query)
    if (region_id !== context.regionId || req.publishable_key_context.sales_channel_ids.length !== 1 || req.publishable_key_context.sales_channel_ids[0] !== context.channelId) {
      return res.status(409).json({ message: "Catalog context changed. Retry or browse all products." })
    }
    const state = await readCatalogState(req.scope)
    if (state?.ready !== 1 || (state.valid_until ?? 0) <= Date.now() || state.price_version !== await catalogPriceVersion(query)) {
      void requestCatalogRefresh(req.scope)
      return res.status(503).json({ message: "Catalog order is refreshing. Retry or browse all products." })
    }
    const result = await req.scope.resolve(Modules.SEARCH).search({
      entity: "product",
      filters: { ...productSearchFilters(input, [context.channelId]), record_type: "product",
        region_id, channel_id: context.channelId, ...(deals ? { deal: 1 } : {}) },
      pagination: { skip: offset, take: limit, order: catalogOrder(sort, deals, !!input.q) },
      search_options: { match_strategy: "last", typo_tolerance: true, count: "exact" },
    })
    const current = await readCatalogState(req.scope)
    if (current?.ready !== 1 || current.revision !== state.revision || (current.valid_until ?? 0) <= Date.now() || current.price_version !== await catalogPriceVersion(query)) return res.status(503).json({ message: "Catalog order is refreshing" })
    res.setHeader("Cache-Control", "no-store")
    return res.json({ ids: result.hits.map(hit => hit.id), count: result.metadata.count ?? 0, limit, offset,
      variants: Object.fromEntries(result.hits.map(hit => [hit.id, hit.document[deals ? "deal_variant_id" : "display_variant_id"]])) })
  } catch {
    return res.status(503).json({ message: "Catalog order temporarily unavailable" })
  }
}
