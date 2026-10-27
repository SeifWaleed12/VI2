import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { CATALOG_BATCH, CATALOG_LOCK, catalogDocuments, catalogPriceVersion, catalogValidUntil, readCatalogRows, readCatalogState, writeCatalogState } from "./catalog-ranking"
import { invalidateStoreCache } from "./store-cache"

type Event = { name: string, data: { id?: string | string[], ids?: string[] } }
const stopped = (signal?: AbortSignal) => { if (signal?.aborted) throw new MedusaError(MedusaError.Types.CONFLICT, "Catalog refresh lost its lock") }
type PendingRefresh = { ids: Set<string>, events: Map<string, Set<string>>, full: boolean, promise: Promise<void> }
const pending = new WeakMap<MedusaContainer, PendingRefresh>()

// Callers remain attached to this work: failed durable events are still retried.
// Bound retained ids; a larger batch becomes one full reconciliation.
export function refreshCatalog(container: MedusaContainer, productIds?: string[], event?: Event): Promise<void> {
  let batch = pending.get(container)
  if (!batch) {
    batch = { ids: new Set(), events: new Map(), full: false, promise: Promise.resolve() }
    const work = batch
    pending.set(container, work)
    work.promise = Promise.resolve().then(async () => {
      try {
        while (work.full || work.ids.size || work.events.size) {
          const ids = work.full ? undefined : [...work.ids]
          const events = work.full ? [] : [...work.events].map(([name, values]) => ({ name, data: { ids: [...values] } }))
          work.full = false
          work.ids.clear()
          work.events.clear()
          const started = Date.now()
          await runRefresh(container, ids, events)
          container.resolve(ContainerRegistrationKeys.LOGGER).info?.(`Catalog refresh completed in ${Date.now() - started}ms; explicit products=${ids?.length ?? "full"}; event groups=${events.length}`)
        }
        pending.delete(container)
      } catch (error) {
        pending.delete(container)
        throw error
      }
    })
  }
  if (!productIds && !event) batch.full = true
  for (const id of productIds ?? []) batch.ids.add(id)
  if (event) {
    const ids = batch.events.get(event.name) ?? new Set<string>()
    for (const id of event.data.ids ?? (event.data.id ? [event.data.id].flat() : [])) ids.add(id)
    batch.events.set(event.name, ids)
  }
  if (batch.ids.size + [...batch.events.values()].reduce((n, ids) => n + ids.size, 0) > 1000) {
    batch.full = true
    batch.ids.clear()
    batch.events.clear()
  }
  return batch.promise
}

// The same renewable native lock protects seed and every refresh through the final write.
// A full reconciliation also removes orphaned/deleted documents, without loading the catalog.
async function runRefresh(container: MedusaContainer, productIds?: string[], events: Event[] = []) {
  return container.resolve(Modules.LOCKING).execute(CATALOG_LOCK, async signal => {
    stopped(signal)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const previous = await readCatalogState(container)
    const priceVersion = await catalogPriceVersion(query)
    const routines = events.filter(event => ["catalog-ranking.refresh", "catalog-ranking.reconcile"].includes(event.name))
    const mutations = events.filter(event => !routines.includes(event))
    const margin = routines.some(event => event.name === "catalog-ranking.reconcile") ? 60_000 : 0
    const routineNeedsFull = routines.length > 0 && !(previous?.ready === 1 && (previous.valid_until ?? 0) > Date.now() + margin && previous.price_version === priceVersion)
    let broadMutation = false
    if (mutations.length) {
      const ids = new Set(productIds)
      for (const event of mutations) {
        const affected = await affectedCatalogProducts(container, event)
        if (!affected) { productIds = undefined; broadMutation = true; break }
        affected.forEach(id => ids.add(id))
        productIds = [...ids]
      }
    }
    if (routineNeedsFull) productIds = undefined
    if (productIds?.length === 0) return
    const search = container.resolve(Modules.SEARCH)
    // Routine reconciliation may use the still-valid projection, just as
    // incremental refresh does. Known broad mutations and expired state fail closed.
    const keepReadable = !productIds && routines.length > 0 && !broadMutation && previous?.ready === 1
      && (previous.valid_until ?? 0) > Date.now() && previous.price_version === priceVersion
    stopped(signal)
    if (!productIds && !keepReadable) await writeCatalogState(container, 0, 0)
    try {
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
      // Incremental writes keep the full-build revision so readers can span an update.
      // A partial retry cannot declare an earlier interrupted full refresh healthy.
      const ready = !productIds || (previous?.ready === 1 && (previous.valid_until ?? 0) > Date.now())
      await writeCatalogState(container, ready ? 1 : 0, productIds ? Math.min(previous?.valid_until ?? 0, validUntil) : validUntil, productIds ? previous?.price_version ?? "" : priceVersion, productIds ? previous?.revision : undefined)
      // Optional response-cache invalidation must not hold the ranking lock during a Redis outage.
      void invalidateStoreCache(container)
    } catch (error) {
      // Never write after losing ownership: another worker may already hold the lock.
      if (!signal?.aborted && !keepReadable) await writeCatalogState(container, 0, 0)
      throw error
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
