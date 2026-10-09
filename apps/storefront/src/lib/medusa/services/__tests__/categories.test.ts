import { getCategoryDirectory } from "../categories"
import { medusa } from "../../client"

jest.mock("../../client", () => ({ medusa: { client: { fetch: jest.fn() } } }))
const fetchCategories = jest.mocked(medusa.client.fetch)
beforeEach(() => jest.resetAllMocks())

it("loads every page with only public category fields and a timeout", async () => {
  fetchCategories.mockResolvedValueOnce({
    product_categories: [{ id: "pcat_parent", name: "Parent" }], count: 2,
  }).mockResolvedValueOnce({
    product_categories: [{ id: "pcat_child", name: "Child", parent_category_id: "pcat_parent" }], count: 2,
  })
  expect((await getCategoryDirectory()).map((category) => category.id)).toEqual(["pcat_parent", "pcat_child"])
  expect(fetchCategories).toHaveBeenNthCalledWith(1, "/store/product-categories", expect.objectContaining({
    method: "GET", signal: expect.any(AbortSignal),
    query: { limit: 100, offset: 0, order: "rank", fields: "id,name,handle,description,parent_category_id,rank" },
  }))
  expect(fetchCategories).toHaveBeenNthCalledWith(2, "/store/product-categories", expect.objectContaining({
    query: expect.objectContaining({ offset: 1 }),
  }))
})

it("returns a real empty catalog without inserting fallback categories", async () => {
  fetchCategories.mockResolvedValue({ product_categories: [], count: 0 })
  expect(await getCategoryDirectory()).toEqual([])
})

it("does not expose provider errors or return a partial directory after an outage", async () => {
  fetchCategories.mockResolvedValueOnce({ product_categories: [{ id: "pcat_1", name: "Real" }], count: 2 })
    .mockRejectedValueOnce(new Error("private credentials and raw provider details"))
  await expect(getCategoryDirectory()).rejects.toThrow(/^Categories temporarily unavailable\.$/)
})

it("stops when pagination cannot advance", async () => {
  fetchCategories.mockResolvedValue({ product_categories: [], count: 3 })
  await expect(getCategoryDirectory()).rejects.toThrow("temporarily unavailable")
  expect(fetchCategories).toHaveBeenCalledTimes(1)
})

it("rejects malformed successful responses rather than treating them as an empty catalog", async () => {
  fetchCategories.mockResolvedValue({ count: 0 })
  await expect(getCategoryDirectory()).rejects.toThrow("temporarily unavailable")
})
