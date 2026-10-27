import { loadReviewQueue, moderateReview, ModerationRequestError } from "../product-reviews"
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
afterEach(() => jest.restoreAllMocks())
it("loads one bounded review page and resolves product names in one native batch", async () => {
  const fetcher = jest.spyOn(global, "fetch").mockResolvedValueOnce(json({ reviews: [{ id: "r1", product_id: "p1" }, { id: "r2", product_id: "p1" }, { id: "r3", product_id: "p2" }], count: 30, limit: 10, offset: 10 })).mockResolvedValueOnce(json({ products: [{ id: "p1", title: "Whey" }] }))
  const page = await loadReviewQueue("pending", 10)
  expect(page.products).toEqual({ p1: "Whey" })
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[0][0]).toContain("limit=10")
  const ids = new URL(String(fetcher.mock.calls[1][0]), "http://localhost").searchParams.getAll("id[]")
  expect(ids).toEqual(["p1", "p2"])
})
it("keeps the moderation queue usable when optional product titles fail", async () => {
  jest.spyOn(global, "fetch").mockResolvedValueOnce(json({ reviews: [{ id: "r1", product_id: "p1" }], count: 1, offset: 0, limit: 10 })).mockRejectedValueOnce(new Error("offline"))
  expect((await loadReviewQueue("pending", 0)).reviews).toHaveLength(1)
})
it("does not fetch products for an empty queue", async () => {
  const fetcher = jest.spyOn(global, "fetch").mockResolvedValue(json({ reviews: [], count: 0, offset: 0, limit: 10 }))
  await loadReviewQueue("pending", 0)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it("sends only the version, decision and reason through the native staff session", async () => {
  const fetcher = jest.spyOn(global, "fetch").mockResolvedValue(json({ review: { id: "r1" } }))
  await moderateReview("r1", 3, "rejected", "External spam link")
  expect(fetcher).toHaveBeenCalledWith("/admin/product-reviews/r1", expect.objectContaining({ credentials: "include", method: "POST", body: JSON.stringify({ version: 3, status: "rejected", reason: "External spam link" }) }))
})
it("preserves a stale-version status for the caller without showing internal messages", async () => {
  jest.spyOn(global, "fetch").mockResolvedValue(json({ message: "private database error" }, 409))
  await expect(moderateReview("r1", 3, "approved", "Context checked")).rejects.toEqual(new ModerationRequestError(409))
})
