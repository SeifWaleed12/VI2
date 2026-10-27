import { randomUUID } from "node:crypto"
import type { MedusaContainer, SearchContainer, SearchDocument } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, getVariantAvailability, Modules, MedusaError, QueryContext } from "@medusajs/framework/utils"
import { ARABIC_FIELDS, ARABIC_LOCALE, SOURCE_FIELDS, toSearchDocument, type ArabicSource, type SearchSource } from "./product-search"
import { kitProductIds } from "./bundle-product-ids"

export const CATALOG_STATE = "__catalog_state"
export const CATALOG_LOCK = "search:seed:product"
export const CATALOG_BATCH = 100
export const CATALOG_MAX_AGE = 300_000
export const CATALOG_SORTS = ["default", "price_asc", "price_desc", "in_stock", "newest"] as const
export type CatalogSort = typeof CATALOG_SORTS[number]
type Query = Omit<SearchContainer["query"], symbol>

export async function catalogContext(query: Query) {
  const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id", "default_region_id"] })
  const regionId = store?.default_region_id as string | undefined
  const channelId = store?.default_sales_channel_id as string | undefined
  if (!regionId || !channelId) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Catalog context unavailable")
  const { data: [region] } = await query.graph({ entity: "region", fields: ["currency_code"], filters: { id: regionId } })
  if (region?.currency_code !== "egp") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Catalog supports the public Egypt context")
  return { regionId, channelId }
}

// A page must stop using a projection at a scheduled price boundary, even if a worker is late.
// Medusa 2.21 updatePriceLists_ omits its shared event context. This cheap watermark
// detects that native write too, without scanning products on a listing request.
export async function catalogPriceVersion(query: Query) {
  const { data, metadata } = await query.graph({ entity: "price_list", fields: ["id", "updated_at"],
    pagination: { skip: 0, take: 1, order: { updated_at: "DESC", id: "ASC" } } }, { cache: { enable: false } })
  return JSON.stringify([metadata?.count ?? data.length, data[0]?.id ?? "", data[0]?.updated_at ?? ""])
}

export async function catalogValidUntil(query: Query, now = Date.now()) {
  let until = now + CATALOG_MAX_AGE
  for (let skip = 0; ; skip += CATALOG_BATCH) {
    const { data } = await query.graph({ entity: "price_list", fields: ["id", "starts_at", "ends_at"],
      filters: { status: "active" }, pagination: { skip, take: CATALOG_BATCH, order: { id: "ASC" } } })
    for (const list of data) for (const value of [list.starts_at, list.ends_at]) {
      const time = value ? new Date(value as string).getTime() : 0
      if (time > now) until = Math.min(until, time)
    }
    if (data.length < CATALOG_BATCH) return until
  }
}

type NativeVariant = {
  id: string
  manage_inventory?: boolean
  allow_backorder?: boolean
  price_set?: { id?: string } | null
  inventory_items?: { inventory_item_id?: string }[]
  calculated_price?: {
    calculated_amount?: number | string | null
    original_amount?: number | string | null
    calculated_price?: { price_list_type?: string | null } | null
  } | null
}
const amountOf = (v?: NativeVariant) => Number(v?.calculated_price?.calculated_amount ?? 0)
const priced = (v?: NativeVariant) => Number.isFinite(amountOf(v)) && amountOf(v) > 0
export function dealVariant(variants: NativeVariant[]) {
  return variants.filter(v => priced(v) && v.calculated_price?.calculated_price?.price_list_type === "sale"
    && Number(v.calculated_price.original_amount) > amountOf(v))
    .sort((a, b) => (Number(b.calculated_price!.original_amount) - amountOf(b))
      - (Number(a.calculated_price!.original_amount) - amountOf(a)) || a.id.localeCompare(b.id))[0]
}

export async function catalogDocuments(query: Query, rows: SearchSource[]): Promise<SearchDocument[]> {
  if (!rows.length) return []
  const { regionId, channelId } = await catalogContext(query)
  const ids = rows.map(row => row.id)
  const [{ data: ar }, { data: native }] = await Promise.all([
    query.graph({ entity: "product", fields: ARABIC_FIELDS, filters: { id: ids } }, { locale: ARABIC_LOCALE }),
    query.graph({ entity: "product", fields: [
      "id", "created_at", "variants.id", "variants.variant_rank", "variants.created_at", "variants.manage_inventory", "variants.allow_backorder",
      "variants.price_set.id", "variants.inventory_items.inventory_item_id", "variants.calculated_price.*",
    ], filters: { id: ids }, context: { variants: { calculated_price: QueryContext({ region_id: regionId, currency_code: "egp", quantity: 1 }) } } },
    { cache: { enable: false } }),
  ])
  const translated = new Map((ar as ArabicSource[]).map(row => [row.id, row]))
  const products = native as unknown as { id: string, created_at: string, variants?: (NativeVariant & { variant_rank?: number, created_at?: string })[] }[]
  const variants = products.flatMap(p => p.variants ?? [])
  const managed = variants.filter(v => v.manage_inventory !== false && v.allow_backorder !== true)
  const availability: Awaited<ReturnType<typeof getVariantAvailability>> = {}
  for (let start = 0; start < managed.length; start += 100) {
    Object.assign(availability, await getVariantAvailability(query, { variant_ids: managed.slice(start, start + 100).map(v => v.id), sales_channel_id: channelId }))
  }
  const buyable = (v?: NativeVariant) => !!v && priced(v) && (v.allow_backorder === true || v.manage_inventory === false || (availability[v.id]?.availability ?? 0) > 0)
  const nativeById = new Map(products.map(p => [p.id, p]))
  return rows.flatMap(row => {
    const base = toSearchDocument(row, translated.get(row.id))
    const p = nativeById.get(row.id)
    if (!base || !p) return []
    // Match the product page: first purchasable option in native rank order, then the first option.
    const ordered = [...(p.variants ?? [])].sort((a, b) => (a.variant_rank ?? 0) - (b.variant_rank ?? 0)
      || String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")) || a.id.localeCompare(b.id))
    const first = ordered.find(buyable) ?? ordered[0]
    const deal = dealVariant(ordered)
    const bundle = kitProductIds(ordered.flatMap(variant => (variant.inventory_items ?? []).map(() => ({ variant_id: variant.id, variant: { product_id: row.id } })))).length > 0
    return [{ ...base, record_type: "product", region_id: regionId, channel_id: channelId,
      bundle: bundle ? 1 : 0,
      catalog_price: priced(first) ? amountOf(first) : 0, catalog_priced: priced(first) ? 1 : 0,
      catalog_available: buyable(first) ? 1 : 0, created: new Date(p.created_at).getTime(),
      deal: deal ? 1 : 0, deal_price: deal ? amountOf(deal) : 0, deal_available: buyable(deal) ? 1 : 0,
      display_variant_id: first?.id ?? "", deal_variant_id: deal?.id ?? "",
      variant_ids: ordered.map(v => v.id),
      inventory_ids: [...new Set(ordered.flatMap(v => (v.inventory_items ?? []).flatMap(i => i.inventory_item_id ? [i.inventory_item_id] : [])))],
      price_set_ids: ordered.flatMap(v => v.price_set?.id ? [v.price_set.id] : []),
    }]
  })
}

export function catalogOrder(sort: CatalogSort, deals: boolean, text: boolean): Record<string, "ASC" | "DESC"> {
  const price = deals ? "deal_price" : "catalog_price"
  if (sort === "price_asc" || sort === "price_desc") return { ...(!deals ? { catalog_priced: "DESC" as const } : {}), [price]: sort === "price_asc" ? "ASC" : "DESC", id: "ASC" }
  if (sort === "in_stock") return { [deals ? "deal_available" : "catalog_available"]: "DESC", id: "ASC" }
  if (sort === "default" && text) return { _score: "DESC", id: "ASC" }
  return { created: "DESC", id: "ASC" }
}

export async function readCatalogState(container: MedusaContainer) {
  const result = await container.resolve(Modules.SEARCH).search({
    entity: "product", filters: { id: CATALOG_STATE }, pagination: { take: 1 },
  })
  return result.hits[0]?.document as { ready?: number, valid_until?: number, price_version?: string, revision?: string } | undefined
}

export async function writeCatalogState(container: MedusaContainer, ready: number, validUntil: number, priceVersion = "", revision: string = randomUUID()) {
  await container.resolve(Modules.SEARCH).upsertDocuments({
    index: "product", documents: [{ id: CATALOG_STATE, record_type: "state", ready, valid_until: validUntil, price_version: priceVersion, revision }],
  })
}

export async function readCatalogRows(query: Query, filters: Record<string, unknown>, skip = 0) {
  return (await query.graph({ entity: "product", fields: SOURCE_FIELDS, filters,
    pagination: { skip, take: CATALOG_BATCH, order: { id: "ASC" } } }, { cache: { enable: false } })).data as unknown as SearchSource[]
}
