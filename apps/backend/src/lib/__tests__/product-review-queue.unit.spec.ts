import { GET } from "../../api/admin/product-reviews/route"
const list = jest.fn(async () => [[], 0])
const scope = { resolve: () => ({ listAndCountProductReviews: list }) }
const response = () => ({ setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })
beforeEach(() => jest.clearAllMocks())
it("shows pending reviews oldest first in bounded pages", async () => {
  const res = response()
  await GET({ query: {}, scope } as never, res as never)
  expect(list).toHaveBeenCalledWith({ status: "pending" }, { take: 10, skip: 0, order: { updated_at: "ASC", id: "ASC" } })
  expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
})
it("keeps published history newest first", async () => {
  await GET({ query: { status: "approved", offset: "10" }, scope } as never, response() as never)
  expect(list).toHaveBeenCalledWith({ status: "approved" }, { take: 10, skip: 10, order: { updated_at: "DESC", id: "ASC" } })
})
it("rejects unsupported status values before querying", async () => {
  const res = response()
  await GET({ query: { status: "unknown" }, scope } as never, res as never)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(list).not.toHaveBeenCalled()
})
