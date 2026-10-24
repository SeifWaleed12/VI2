jest.mock("@medusajs/framework/utils", () => ({ ...jest.requireActual("@medusajs/framework/utils"), getVariantAvailability: jest.fn(async () => ({})) }))
import { catalogDocuments, catalogOrder, dealVariant } from "../catalog-ranking"
import { catalogSchema } from "../../api/validators"

it("orders globally with a stable id tie-breaker and unpriced last", () => {
  expect(catalogOrder("price_desc", false, false)).toEqual({ catalog_priced: "DESC", catalog_price: "DESC", id: "ASC" })
  expect(catalogOrder("price_asc", true, true)).toEqual({ deal_price: "ASC", id: "ASC" })
  expect(catalogOrder("in_stock", true, false)).toEqual({ deal_available: "DESC", id: "ASC" })
  expect(catalogOrder("default", false, true)).toEqual({ _score: "DESC", id: "ASC" })
  expect(catalogOrder("newest", false, true)).toEqual({ created: "DESC", id: "ASC" })
})
it("rejects unsupported sorts, contexts, repeated scalars and unbounded pages", () => {
  for (const bad of [{ sort: "quantity" }, { sort: ["price_asc"] }, { limit: 25 }, { offset: 10001 }, { q: "a".repeat(101) }]) {
    expect(catalogSchema.safeParse({ region_id: "reg_egypt", ...bad }).success).toBe(false)
  }
  expect(catalogSchema.parse({ region_id: "reg_egypt" })).toMatchObject({ sort: "default", limit: 24, deals: false })
})
it("selects only native public one-unit sale reductions, with deterministic variant ties", () => {
  const v = (id: string, type: string, amount: number, original: number) => ({ id,
    calculated_price: { calculated_amount: amount, original_amount: original, calculated_price: { price_list_type: type } } })
  expect(dealVariant([v("override", "override", 1, 500), v("bulk", "sale", 500, 500), v("b", "sale", 100, 300), v("a", "sale", 100, 300)])?.id).toBe("a")
})

it.each(["unpriced", "sold-out"])("indexes the first purchasable option when the first-ranked variant is %s", async state => {
  const native = { id: "prod_1", created_at: "2026-10-24", variants: [
    { id: "second", variant_rank: 1, manage_inventory: false, calculated_price: { calculated_amount: 50 } },
    { id: "first", variant_rank: 0, manage_inventory: state === "sold-out", inventory_items: [],
      calculated_price: state === "unpriced" ? null : { calculated_amount: 10 } },
  ] }
  const graph = jest.fn(async ({ entity, fields }) => ({ data: entity === "store" ? [{ default_region_id: "reg_eg", default_sales_channel_id: "sc_eg" }]
    : entity === "region" ? [{ currency_code: "egp" }] : fields.includes("variants.variant_rank") ? [native] : [] }))
  const [document] = await catalogDocuments({ graph } as never, [{ id: "prod_1", status: "published", title: "Multi", variants: [], sales_channels: [{ id: "sc_eg" }] }] as never)
  expect(document).toMatchObject({ display_variant_id: "second", catalog_price: 50, catalog_priced: 1, catalog_available: 1 })
})
