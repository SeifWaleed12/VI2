import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { CATALOG_BATCH, CATALOG_LOCK, catalogDocuments, catalogPriceVersion, catalogValidUntil, readCatalogRows, readCatalogState, writeCatalogState } from "./catalog-ranking"
import { invalidateStoreCache } from "./store-cache"

type Event = { name: string, data: { id?: string | string[], ids?: string[] } }
const stopped = (signal?: AbortSignal) => { if (signal?.aborted) throw new MedusaError(MedusaError.Types.CONFLICT, "Catalog refresh lost its lock") }

// The same renewable native lock protects seed and every refresh through the final write.
// A full reconciliation also removes orphaned/deleted documents, without loading the catalog.
export async function refreshCatalog(container: MedusaContainer, productIds?: string[], event?: Event) {
  return container.resolve(Modules.LOCKING).execute(CATALOG_LOCK, async signal => {
    stopped(signal)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    if (event?.name === "catalog-ranking.refresh") {
      const state = await readCatalogState(container)
      if (state?.ready === 1 && (state.valid_until ?? 0) > Date.now() && state.price_version === await catalogPriceVersion(query)) return
    } else if (event) productIds = await affectedCatalogProducts(container, event)
    if (productIds?.length === 0) return
    const search = container.resolve(Modules.SEARCH)
    const previous = await readCatalogState(container)
    stopped(signal)
    await writeCatalogState(container, 0, 0)
    {
      const priceVersion = await catalogPriceVersion(query)
      const validUntil = await catalogValidUntil(query)
      if (productIds) {
        for (let index = 0; index < productIds.length; index += CATALOG_BATCH) {
          const ids = productIds.slice(index, index + CATALOG_BATCH)
          const rows = await readCatalogRows(query, { id: ids })
          const documents = await catalogDocuments(query, rows)
          stopped(signal)
          if (documents.length) await search.upsertDocuments({ index: "product", documents })
          const kept = new Set(documents.map(row => row.id))
          const removed = ids.filter(id => !kept.has(id))
          stopped(signal)
          if (removed.length) await search.deleteDocuments({ index: "product", filters: { id: removed } })
        }
      } else {
        // Track old ids in bounded pages, removing only entries no longer published.
        for (let skip = 0; ; skip += CATALOG_BATCH) {
          const rows = await readCatalogRows(query, {}, skip)
          const documents = await catalogDocuments(query, rows)
          stopped(signal)
          if (documents.length) await search.upsertDocuments({ index: "product", documents })
          if (rows.length < CATALOG_BATCH) break
        }
        for (let skip = 0; ;) {
          const page = await search.search({ entity: "product", filters: { record_type: "product" },
            pagination: { skip, take: CATALOG_BATCH, order: { id: "ASC" } } })
          const ids = page.hits.map(hit => hit.id)
          if (!ids.length) break
          const rows = await readCatalogRows(query, { id: ids, status: "published" })
          const kept = new Set(rows.map(row => row.id))
          const removed = ids.filter(id => !kept.has(id))
          stopped(signal)
          if (removed.length) await search.deleteDocuments({ index: "product", filters: { id: removed } })
          skip += ids.length - removed.length
          if (ids.length < CATALOG_BATCH) break
        }
      }
      stopped(signal)
      // A partial retry cannot declare an earlier interrupted full refresh healthy.
      const ready = !productIds || (previous?.ready === 1 && (previous.valid_until ?? 0) > Date.now())
      await writeCatalogState(container, ready ? 1 : 0, productIds ? Math.min(previous?.valid_until ?? 0, validUntil) : validUntil, productIds ? previous?.price_version ?? "" : priceVersion)
      // Optional response-cache invalidation must not hold the ranking lock during a Redis outage.
      void invalidateStoreCache(container)
    }
  }, { timeout: 30, expire: 60 })
}

export async function affectedCatalogProducts(container: MedusaContainer, event: Event): Promise<string[] | undefined> {
  const ids = event.data.ids ?? (event.data.id ? [event.data.id].flat() : [])
  if (!ids.length) return undefined
  if (/^product\.(product\.)?(created|updated|deleted|restored)$/.test(event.name)) return ids
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const find = async (entity: string, fields: string[], filters: Record<string, unknown>) =>
    (await query.graph({ entity, fields, filters }, { cache: { enable: false } })).data as Record<string, unknown>[]
  let filter: Record<string, unknown> | undefined
  if (event.name.includes("product-variant.")) filter = { variant_ids: ids }
  else if (event.name.includes("inventory-item.")) filter = { inventory_ids: ids }
  else if (event.name.includes("reservation-item.") || event.name.includes("inventory-level.")) {
    const entity = event.name.includes("reservation-item.") ? "reservation" : "inventory_level"
    const rows = await find(entity, ["inventory_item_id"], { id: ids })
    if (rows.length) filter = { inventory_ids: rows.map(row => row.inventory_item_id) }
  } else if (event.name.includes("price-set.")) filter = { price_set_ids: ids }
  else if (/^pricing\.price\./.test(event.name)) {
    const rows = await find("price", ["price_set_id"], { id: ids })
    if (rows.length) filter = { price_set_ids: rows.map(row => row.price_set_id) }
  }
  // A deletion may have removed the reverse relation. Full bounded reconciliation
  // is required then; guessing affected ids would leave stale stock/prices.
  if (!filter) return undefined
  const result: string[] = []
  for (let skip = 0; ; skip += CATALOG_BATCH) {
    const page = await container.resolve(Modules.SEARCH).search({ entity: "product",
      filters: { record_type: "product", ...filter }, pagination: { skip, take: CATALOG_BATCH, order: { id: "ASC" } } })
    result.push(...page.hits.map(hit => hit.id))
    if (page.hits.length < CATALOG_BATCH) return result
  }
}
