import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { catalogContext, catalogPriceVersion, readCatalogState } from "./catalog-ranking"
import { MAX_BUNDLE_PRODUCTS } from "./bundle-product-ids"
import { requestCatalogRefresh } from "./catalog-refresh-request"
export { kitProductIds, MAX_BUNDLE_PRODUCTS, type StockLink } from "./bundle-product-ids"

// Reuse the existing projection; request work does not scan variant/stock links.
export async function bundleProductIds(container: MedusaContainer, channels?: string[]) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const context = await catalogContext(query)
  if (channels && (channels.length !== 1 || channels[0] !== context.channelId)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Unsupported catalog channel")
  const before = await readCatalogState(container)
  if (before?.ready !== 1 || (before.valid_until ?? 0) <= Date.now() || before.price_version !== await catalogPriceVersion(query)) {
    void requestCatalogRefresh(container)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Bundle discovery is refreshing")
  }
  const result = await container.resolve(Modules.SEARCH).search({ entity: "product", filters: {
    record_type: "product", bundle: 1, region_id: context.regionId, channel_id: context.channelId,
    sales_channel_ids: [context.channelId],
  }, pagination: { take: MAX_BUNDLE_PRODUCTS, order: { id: "ASC" } } })
  const after = await readCatalogState(container)
  if (after?.ready !== 1 || after.revision !== before.revision || (after.valid_until ?? 0) <= Date.now() || after.price_version !== await catalogPriceVersion(query)) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Bundle discovery changed. Retry.")
  }
  return result.hits.map(hit => hit.id)
}