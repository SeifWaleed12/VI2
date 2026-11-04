import { getAll, getJson } from "../get-json"

const answer = (status: number, body: unknown) => jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }))

afterEach(() => jest.restoreAllMocks())

describe("getJson", () => {
  it("returns the body of a successful answer", async () => {
    answer(200, { brands: [{ id: "brand_1" }] })
    await expect(getJson("/admin/brands")).resolves.toEqual({ brands: [{ id: "brand_1" }] })
  })

  it("rejects an error answer even when it has a JSON body", async () => {
    answer(500, { message: "Failed to list brands" })
    await expect(getJson("/admin/brands")).rejects.toThrow("/admin/brands answered 500")
  })
})

describe("getAll", () => {
  it("reads every page of a list", async () => {
    const rows = [{ id: "pcat_1" }, { id: "pcat_2" }, { id: "pcat_3" }]
    const fetch = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const offset = Number(new URL(String(url), "http://admin").searchParams.get("offset"))
      return new Response(JSON.stringify({ product_categories: rows.slice(offset, offset + 2), count: rows.length }))
    })
    await expect(getAll("/admin/product-categories?limit=2", "product_categories")).resolves.toEqual(rows)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
