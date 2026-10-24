import { kitProductIds, saleProductIds, type SalePriceList } from "../deals"

const now = new Date("2026-11-01T12:00:00.000Z")
const price = (productId: string, currency = "egp") => ({ currency_code: currency, price_set: { variant: { product_id: productId } } })
const list = (overrides: Partial<SalePriceList>, ...productIds: string[]): SalePriceList => ({
  starts_at: null, ends_at: null, rules_count: 0, prices: productIds.map((id) => price(id)), ...overrides,
})

it("lists products of a sale running now for everyone, once each", () => {
  expect(saleProductIds([
    list({}, "prod_a", "prod_a", "prod_b"),
    list({ starts_at: "2026-10-31T00:00:00.000Z", ends_at: "2026-11-02T00:00:00.000Z" }, "prod_b", "prod_c"),
  ], now)).toEqual(["prod_a", "prod_b", "prod_c"])
})

it("leaves out sales not started, already ended, or only for a customer group", () => {
  expect(saleProductIds([
    list({ starts_at: "2026-11-02T00:00:00.000Z" }, "prod_later"),
    list({ ends_at: "2026-11-01T12:00:00.000Z" }, "prod_ended"),
    list({ rules_count: 1 }, "prod_vip"),
  ], now)).toEqual([])
})

it("ignores prices in another currency and prices without a product", () => {
  expect(saleProductIds([{ prices: [price("prod_usd", "usd"), null, { currency_code: "egp", price_set: null }] }], now)).toEqual([])
})

it("finds bundles: variants made of two or more different stock items, not one item with a quantity", () => {
  const link = (variant: string, product: string, required = 1) => ({ variant_id: variant, required_quantity: required, variant: { product_id: product } })
  expect(kitProductIds([
    link("v_whey", "prod_whey"),
    link("v_set", "prod_set"), link("v_set", "prod_set"),
    link("v_pack", "prod_pack", 3),
    link("v_set2", "prod_set"), link("v_set2", "prod_set"),
  ])).toEqual(["prod_set"])
  expect(kitProductIds([])).toEqual([])
})
