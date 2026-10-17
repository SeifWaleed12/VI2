import { getJson } from "../get-json"

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
