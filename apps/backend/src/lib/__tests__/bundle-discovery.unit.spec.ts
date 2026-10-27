import { GET } from "../../api/store/deals/route"
import { bundleProductIds } from "../deals"
import { catalogContext, catalogPriceVersion, readCatalogState } from "../catalog-ranking"
jest.mock("../catalog-ranking", () => ({ catalogContext: jest.fn(), catalogPriceVersion: jest.fn(), readCatalogState: jest.fn() }))
jest.mock("../catalog-refresh-request", () => ({ requestCatalogRefresh: jest.fn() }))
const search = jest.fn(async () => ({ hits: [{ id: "bundle_one" }] }))
const scope = { resolve: (key: string) => key === "search" ? { search } : {} } as never
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(catalogContext).mockResolvedValue({ regionId: "reg_eg", channelId: "sc_eg" })
  jest.mocked(catalogPriceVersion).mockResolvedValue("v")
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 10000, revision: "r", price_version: "v" })
})
it("queries only a bounded visible bundle page without reading inventory links", async () => {
  expect(await bundleProductIds(scope, ["sc_eg"])).toEqual(["bundle_one"])
  expect(search).toHaveBeenCalledWith(expect.objectContaining({ filters: expect.objectContaining({ bundle: 1, channel_id: "sc_eg", sales_channel_ids: ["sc_eg"] }), pagination: { take: 100, order: { id: "ASC" } } }))
})
it("fails honestly for an expired projection or another sales channel", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: 0, price_version: "v" })
  await expect(bundleProductIds(scope, ["sc_eg"])).rejects.toThrow("refreshing")
  await expect(bundleProductIds(scope, ["other"])).rejects.toThrow("channel")
  expect(search).not.toHaveBeenCalled()
})

it("keeps invalid channel errors distinct from a refreshing projection at the HTTP boundary", async () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await expect(GET({ scope, publishable_key_context: { sales_channel_ids: ["other"] } } as never, res as never)).rejects.toThrow("channel")
  expect(res.status).not.toHaveBeenCalled()
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 0, valid_until: 0 })
  await GET({ scope, publishable_key_context: { sales_channel_ids: ["sc_eg"] } } as never, res as never)
  expect(res.status).toHaveBeenCalledWith(503)
})

it("maps a missing native index version to retryable unavailability", async () => {
  const { MedusaError } = require("@medusajs/framework/utils")
  jest.mocked(readCatalogState).mockRejectedValueOnce(new MedusaError(MedusaError.Types.NOT_FOUND, "Search index has no active version"))
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await GET({ scope, publishable_key_context: { sales_channel_ids: ["sc_eg"] } } as never, res as never)
  expect(res.status).toHaveBeenCalledWith(503)
})
