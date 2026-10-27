import { randomUUID } from "node:crypto"
import { defineSearchIndex, search } from "@medusajs/framework/utils"
import { CATALOG_STATE, catalogDocuments, catalogPriceVersion, catalogValidUntil, readCatalogRows } from "../lib/catalog-ranking"

// Ingestion is serialized with seeding by catalog-ranking-refresh. Only this private event
// belongs to native automatic ingestion; native commerce events use our retrying subscriber.
export default defineSearchIndex({
  name: "product", entity: "product",
  fields: search.define({
    id: search.keyword().filterable().sortable(), record_type: search.keyword().filterable(),
    ready: search.integer(), valid_until: search.float(), price_version: search.keyword(), revision: search.keyword(),
    region_id: search.keyword().filterable(), channel_id: search.keyword().filterable(),
    catalog_price: search.float().sortable(), catalog_priced: search.integer().sortable(),
    catalog_available: search.integer().sortable(), created: search.float().sortable(),
    deal: search.integer().filterable(), deal_price: search.float().sortable(), deal_available: search.integer().sortable(),
    bundle: search.integer().filterable(),
    display_variant_id: search.keyword(), deal_variant_id: search.keyword(),
    variant_ids: search.keyword().array().filterable(), inventory_ids: search.keyword().array().filterable(),
    price_set_ids: search.keyword().array().filterable(),
    handle: search.keyword(), title: search.text().searchable({ weight: 3 }), title_ar: search.text().searchable({ weight: 3 }),
    brand: search.text().searchable({ weight: 2 }), brand_id: search.keyword().filterable(),
    categories: search.text().array().searchable({ weight: 2 }), category_ids: search.keyword().array().filterable(),
    tag_ids: search.keyword().array().filterable(), goals: search.text().array().searchable(),
    variants: search.text().array().searchable(), sales_channel_ids: search.keyword().array().filterable(),
  }),
  seed: async function* ({ container }) {
    const validUntil = await catalogValidUntil(container.query)
    const priceVersion = await catalogPriceVersion(container.query)
    yield [{ action: "upsert", documents: [{ id: CATALOG_STATE, record_type: "state", ready: 0, valid_until: 0 }] }]
    for (let skip = 0; ; skip += 100) {
      const rows = await readCatalogRows(container.query, {}, skip)
      const documents = await catalogDocuments(container.query, rows)
      if (documents.length) yield [{ action: "upsert", documents }]
      if (rows.length < 100) break
    }
    yield [{ action: "upsert", documents: [{ id: CATALOG_STATE, record_type: "state", ready: 1, valid_until: validUntil, price_version: priceVersion, revision: randomUUID() }] }]
  },
})
