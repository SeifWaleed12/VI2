import ShopPage from "../page"
import { getCategoryDirectory, getProducts } from "@/lib/medusa"

jest.mock("@/lib/medusa", () => ({ getCategoryDirectory: jest.fn(), getProducts: jest.fn() }))
jest.mock("../ShopClient", () => ({ __esModule: true, default: () => null }))
jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))

const categories = [
  { id: "pcat_parent", name: "Nutrition", handle: "nutrition" },
  { id: "pcat_child", name: "Protein", handle: "protein", parent_category_id: "pcat_parent" },
  { id: "pcat_other", name: "Protein", handle: "other-protein" },
]

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(getCategoryDirectory).mockResolvedValue(categories)
  jest.mocked(getProducts).mockResolvedValue([])
})

it("asks Medusa for the selected category and its actual descendants", async () => {
  const page = await ShopPage({ searchParams: Promise.resolve({ category_id: "pcat_parent" }) })
  expect(getProducts).toHaveBeenCalledWith({ category_id: ["pcat_parent", "pcat_child"] })
  expect(page.props.children.props.selectedCategoryId).toBe("pcat_parent")
  expect(page.props.children.props.selectedCategoryName).toBe("Nutrition")
})

it("filters a child by ID even when another category has the same name", async () => {
  await ShopPage({ searchParams: Promise.resolve({ category_id: "pcat_child" }) })
  expect(getProducts).toHaveBeenCalledWith({ category_id: ["pcat_child"] })
})

it.each(["pcat_missing", "", ["pcat_parent", "pcat_other"]])("never falls back to all products for an invalid category %j", async (category_id) => {
  await expect(ShopPage({ searchParams: Promise.resolve({ category_id }) })).rejects.toThrow("NEXT_NOT_FOUND")
  expect(getProducts).not.toHaveBeenCalled()
})

it("keeps the unscoped shop available", async () => {
  await ShopPage({ searchParams: Promise.resolve({}) })
  expect(getProducts).toHaveBeenCalledWith({})
})

it("propagates category outages to the existing route error boundary", async () => {
  jest.mocked(getCategoryDirectory).mockRejectedValue(new Error("Categories temporarily unavailable."))
  await expect(ShopPage({ searchParams: Promise.resolve({ category_id: "pcat_parent" }) })).rejects.toThrow("temporarily unavailable")
  expect(getProducts).not.toHaveBeenCalled()
})
