import { kitProductIds } from "../deals"

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
