import { managerAction } from "../../lib/manager-access"
import { newProductSchema } from "../validators"

const valid = {
  title: "Whey Protein",
  status: "draft",
  discountable: true,
  brand_id: "brand_1",
  category_ids: ["pcat_1"],
  options: [{ id: "opt_flavor", value_ids: ["optval_choc"] }],
  variants: [{ options: { Flavor: "Chocolate" }, sku: "WH-CH-1", price: 1500 }],
}

const issues = (body: unknown) => {
  const result = newProductSchema.safeParse(body)
  return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
}

describe("new product schema", () => {
  it("accepts the smallest valid product and trims text", () => {
    const result = newProductSchema.parse({ ...valid, title: "  Whey Protein ", variants: [{ ...valid.variants[0], sku: " WH-CH-1 " }] })
    expect(result.title).toBe("Whey Protein")
    expect(result.variants[0].sku).toBe("WH-CH-1")
  })

  it.each([
    ["title", { ...valid, title: "  " }, "title", "Enter a title"],
    ["sku", { ...valid, variants: [{ ...valid.variants[0], sku: "" }] }, "variants.0.sku", "Enter a SKU"],
    ["price", { ...valid, variants: [{ ...valid.variants[0], price: undefined }] }, "variants.0.price", "Enter a price"],
    ["zero price", { ...valid, variants: [{ ...valid.variants[0], price: 0 }] }, "variants.0.price", "Price must be more than 0"],
    ["a price within the cap", { ...valid, variants: [{ ...valid.variants[0], price: 1_000_000.01 }] }, "variants.0.price", "Price must be 1,000,000 EGP or less"],
    ["brand", { ...valid, brand_id: undefined }, "brand_id", "Choose a brand"],
    ["categories", { ...valid, category_ids: [] }, "category_ids", "Choose at least one category"],
    ["one variant without options", { ...valid, options: [], variants: [{ ...valid.variants[0], options: {} }, { ...valid.variants[0], options: {}, sku: "WH-2" }] }, "variants", "A product without variants has one variant"],
    ["option values", { ...valid, options: [{ id: "opt_flavor", value_ids: [], new_values: [] }] }, "options.0", "Choose at least one value"],
    ["each option once", { ...valid, options: [valid.options[0], valid.options[0]] }, "options", "Each option can be added once"],
    ["a handle in URL form", { ...valid, handle: "Whey Protein" }, "handle", "Use lowercase letters, numbers and dashes"],
    ["variants", { ...valid, variants: [] }, "variants", "Keep at least one variant"],
  ])("requires %s", (_name, body, path, message) => {
    expect(issues(body)).toContainEqual({ path, message })
  })

  it("accepts a variant title and trims it", () => {
    expect(newProductSchema.parse({ ...valid, variants: [{ ...valid.variants[0], title: " Chocolate tub " }] }).variants[0].title).toBe("Chocolate tub")
  })

  it("accepts a product without variants: no options and one variant", () => {
    expect(issues({ ...valid, options: [], variants: [{ ...valid.variants[0], options: {} }] })).toEqual([])
  })

  it("refuses a SKU used twice in one form, on the second row", () => {
    const body = { ...valid, options: [{ id: "opt_flavor", value_ids: ["optval_choc"], new_values: ["Vanilla"] }], variants: [
      { options: { Flavor: "Chocolate" }, sku: "WH-1", price: 1 },
      { options: { Flavor: "Vanilla" }, sku: "WH-1", price: 1 },
    ] }
    expect(issues(body)).toEqual([{ path: "variants.1.sku", message: "SKU WH-1 is used twice in this form" }])
  })

  it.each([
    ["an unknown top-level field", { ...valid, sales_channels: [{ id: "sc_1" }] }],
    ["inventory items on a variant", { ...valid, variants: [{ ...valid.variants[0], inventory_items: [{ inventory_item_id: "inv_1" }] }] }],
    ["stock settings on a variant", { ...valid, variants: [{ ...valid.variants[0], manage_inventory: false }] }],
    ["a stock quantity", { ...valid, variants: [{ ...valid.variants[0], inventory_quantity: 5 }] }],
    ["a price with its own currency", { ...valid, variants: [{ ...valid.variants[0], prices: [{ amount: 1, currency_code: "usd" }] }] }],
  ])("refuses %s", (_name, body) => {
    expect(newProductSchema.safeParse(body).success).toBe(false)
  })
})

describe("new product route access", () => {
  it("is product create for a manager", () => {
    expect(managerAction("POST", "/admin/vi2-products", valid)).toEqual({ resource: "product", operation: "create" })
  })
})
