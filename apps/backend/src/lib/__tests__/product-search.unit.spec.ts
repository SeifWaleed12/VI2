import { productSearchFilters, toSearchDocument, withoutArabicArticle } from "../product-search"
import { catalogSchema } from "../../api/validators"

const whey = {
  id: "prod_whey", handle: "whey", status: "published", title: "Whey Protein",
  brand: { id: "brand_on", name: "Optimum Nutrition", status: "active" },
  categories: [{ id: "pcat_protein", name: "Protein" }],
  tags: [{ id: "ptag_muscle", value: "muscle-recovery" }, { id: "ptag_bundle", value: "bundle" }],
  variants: [{ title: "Chocolate 2kg" }, { title: "Vanilla 2kg" }],
  sales_channels: [{ id: "sc_web" }],
}
const arabic = { id: "prod_whey", title: "بروتين واي", categories: [{ name: "بروتين" }], variants: [{ title: "شوكولاتة 2 كجم" }] }

it("puts both languages, brand, categories, flavors and goal words in one document", () => {
  expect(toSearchDocument(whey, arabic)).toEqual({
    id: "prod_whey", handle: "whey", title: "Whey Protein", title_ar: "بروتين واي",
    brand: "Optimum Nutrition", brand_id: "brand_on",
    categories: ["Protein", "بروتين"], category_ids: ["pcat_protein"],
    tag_ids: ["ptag_muscle", "ptag_bundle"], goals: ["muscle recovery", "العضلات والاستشفاء"],
    variants: ["Chocolate 2kg", "Vanilla 2kg", "شوكولاتة 2 كجم"], sales_channel_ids: ["sc_web"],
  })
})

it("leaves out unpublished products, inactive brands and an Arabic name that is only the English one", () => {
  expect(toSearchDocument({ ...whey, status: "draft" }, arabic)).toBeUndefined()
  const doc = toSearchDocument({ ...whey, brand: { ...whey.brand, status: "inactive" } }, { ...arabic, title: "Whey Protein" })!
  expect([doc.brand, doc.brand_id, doc.title_ar]).toEqual(["", "", ""])
})

it("searches only the shopper's sales channels and maps each filter onto the index", () => {
  expect(productSearchFilters({ q: "whey", category_id: ["pcat_a"], brand_id: ["brand_b"], tag_id: ["ptag_c"] }, ["sc_web"]))
    .toEqual({ q: "whey", sales_channel_ids: ["sc_web"], category_ids: ["pcat_a"], brand_id: ["brand_b"], tag_ids: ["ptag_c"] })
  expect(productSearchFilters({ q: "whey", brand_id: [] }, [])).toEqual({ q: "whey", sales_channel_ids: [] })
})

it("accepts a bounded catalog search with optional filters and refuses malformed input", () => {
  expect(catalogSchema.parse({ region_id: "reg_eg", q: "  whey ", brand_id: "brand_b", limit: "6" })).toMatchObject({ q: "whey", brand_id: ["brand_b"], limit: 6, offset: 0 })
  for (const query of [{ region_id: "" }, { q: "x".repeat(101) }, { q: "whey", limit: "25" }, { q: "whey", tag_id: ["bad id"] }, { q: "whey", other: "1" }])
    expect(catalogSchema.safeParse({ region_id: "reg_eg", ...query }).success).toBe(false)
})

it("drops the Arabic article from words, keeping short words and other text", () => {
  expect(withoutArabicArticle("الزنك")).toBe("زنك")
  expect(withoutArabicArticle("أقراص الزنك whey")).toBe("أقراص زنك whey")
  expect(withoutArabicArticle("الم")).toBe("الم")
  expect(withoutArabicArticle("protein")).toBe("protein")
  expect(productSearchFilters({ q: "البروتين" }, []).q).toBe("بروتين")
})
