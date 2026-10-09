import { buildCategoryTree, categoryHref, categoryLinks, filterCategoryTree, findCategory } from "../category-navigation"
import type { StoreCategory } from "../medusa/services/categories"

const categories: StoreCategory[] = [
  { id: "pcat_child", name: "Magnesium", handle: "magnesium", parent_category_id: "pcat_root" },
  { id: "pcat_root", name: "Minerals", handle: "minerals", description: "From Medusa" },
  { id: "pcat_nested", name: "Glycinate", handle: "glycinate", parent_category_id: "pcat_child" },
  { id: "pcat_other", name: "Magnesium", handle: "other-magnesium" },
]

it("uses Medusa parents, including children listed before their parent", () => {
  const tree = buildCategoryTree(categories)
  expect(tree.map((node) => node.id)).toEqual(["pcat_root", "pcat_other"])
  expect(tree[0].description).toBe("From Medusa")
  expect(tree[0].children[0].children[0].id).toBe("pcat_nested")
})

it("uses IDs rather than names or text search, even for duplicate category names", () => {
  const tree = buildCategoryTree(categories)
  expect(categoryLinks(tree[0]).map((item) => item.href)).toEqual([
    "/shop?category_id=pcat_root", "/shop?category_id=pcat_child", "/shop?category_id=pcat_nested",
  ])
  expect(tree[1].href).toBe("/shop?category_id=pcat_other")
  expect(categoryHref("pcat_1&brand=wrong")).toBe("/shop?category_id=pcat_1%26brand%3Dwrong")
})

it("keeps leaf categories accessible and visible children whose parent is not public", () => {
  const tree = buildCategoryTree([{ ...categories[0], parent_category_id: "pcat_hidden" }])
  expect(categoryLinks(tree[0])).toEqual([{ id: "pcat_child", label: "Magnesium", href: "/shop?category_id=pcat_child" }])
})

it("finds grandchildren without including unrelated branches", () => {
  expect(findCategory(buildCategoryTree(categories), "pcat_nested")?.name).toBe("Glycinate")
  expect(findCategory(buildCategoryTree(categories), "pcat_missing")).toBeUndefined()
})

it("searches all levels and preserves the matching category's ancestors", () => {
  const result = filterCategoryTree(buildCategoryTree(categories), "  GLYCINATE  ")
  expect(result).toHaveLength(1)
  expect(result[0].children[0].children[0].id).toBe("pcat_nested")
  expect(filterCategoryTree(buildCategoryTree(categories), "not present")).toEqual([])
})

it("preserves descendants when the parent's name matches", () => {
  expect(categoryLinks(filterCategoryTree(buildCategoryTree(categories), "Minerals")[0])).toHaveLength(3)
  expect(buildCategoryTree([])).toEqual([])
})
