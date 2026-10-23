import { defineSearchIndex, graphConsume, graphSeed, search } from "@medusajs/framework/utils"
import type { SearchContainer, SearchMutation } from "@medusajs/framework/types"
import { ARABIC_FIELDS, ARABIC_LOCALE, PRODUCT_SEARCH_INDEX, SOURCE_FIELDS, toSearchDocument, type ArabicSource, type SearchSource } from "../lib/product-search"

// Medusa reads the products, then each batch is read again in Arabic and both
// names go into one document. Unpublished products become deletes.
async function withArabic(mutations: SearchMutation[], container: SearchContainer): Promise<SearchMutation[]> {
  const result: SearchMutation[] = []
  for (const mutation of mutations) {
    if (mutation.action !== "upsert") {
      result.push(mutation)
      continue
    }
    const rows = mutation.documents as unknown as SearchSource[]
    const { data } = await container.query.graph({ entity: "product", fields: ARABIC_FIELDS, filters: { id: rows.map((row) => row.id) } }, { locale: ARABIC_LOCALE })
    const arabic = new Map((data as ArabicSource[]).map((row) => [row.id, row]))
    const documents = rows.flatMap((row) => toSearchDocument(row, arabic.get(row.id)) ?? [])
    const removed = rows.filter((row) => !documents.some((doc) => doc.id === row.id)).map((row) => row.id)
    if (documents.length) result.push({ action: "upsert", documents })
    if (removed.length) result.push({ action: "delete", filters: { id: removed } })
  }
  return result
}

const seedFromGraph = graphSeed({ fields: SOURCE_FIELDS })
const consumeFromGraph = graphConsume({ fields: SOURCE_FIELDS })

// Renamed categories or brands, Arabic name edits and variant edits do not emit
// product events; the nightly reindex (jobs/reindex-product-search.ts) picks them up.
export default defineSearchIndex({
  name: PRODUCT_SEARCH_INDEX,
  entity: "product",
  fields: search.define({
    id: search.keyword().filterable(),
    handle: search.keyword(),
    title: search.text().searchable({ weight: 3 }),
    title_ar: search.text().searchable({ weight: 3 }),
    brand: search.text().searchable({ weight: 2 }),
    brand_id: search.keyword().filterable(),
    categories: search.text().array().searchable({ weight: 2 }),
    category_ids: search.keyword().array().filterable(),
    tag_ids: search.keyword().array().filterable(),
    goals: search.text().array().searchable(),
    variants: search.text().array().searchable(),
    sales_channel_ids: search.keyword().array().filterable(),
  }),
  events: ["product.created", "product.updated", "product.deleted"],
  consume: async (event, context) => withArabic(await consumeFromGraph(event, context), context.container),
  seed: async function* (context) {
    for await (const mutations of seedFromGraph(context)) yield await withArabic(mutations, context.container)
  },
})
