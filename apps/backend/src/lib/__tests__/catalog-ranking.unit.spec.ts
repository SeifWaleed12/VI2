import { catalogOrder, dealVariant } from "../catalog-ranking"
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
