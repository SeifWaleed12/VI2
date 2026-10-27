import { GET } from "../../api/store/catalog/route"
import { boundCatalogHydration } from "../../api/catalog-products"
import { catalogProductsSchema } from "../../api/validators"
import { catalogContext, catalogPriceVersion, readCatalogState } from "../catalog-ranking"
jest.mock("../catalog-ranking", () => ({ catalogContext: jest.fn(), catalogPriceVersion: jest.fn(), readCatalogState: jest.fn(), catalogOrder: jest.fn(() => ({ id: "ASC" })) }))
jest.mock("../product-search", () => ({ productSearchFilters: jest.fn(() => ({})) }))
const emit = jest.fn(async () => {})
const search = jest.fn(async () => ({ hits: [], metadata: { count: 0 } }))
const scope = { resolve: (key: string) => key === "event_bus" ? { emit } : key === "search" ? { search } : {} }
const req = () => ({ query: { region_id: "reg_eg" }, publishable_key_context: { sales_channel_ids: ["sc_eg"] }, scope }) as never
const res = () => { const r = { status: jest.fn(), json: jest.fn(), setHeader: jest.fn() }; r.status.mockReturnValue(r); return r as any }
const ready = () => ({ ready: 1, valid_until: Date.now() + 300000, price_version: "prices", revision: "full" })
let clock = Date.now()
beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ now: clock += 60000 })
  jest.mocked(catalogContext).mockResolvedValue({ regionId: "reg_eg", channelId: "sc_eg" })
  jest.mocked(catalogPriceVersion).mockResolvedValue("prices")
  jest.mocked(readCatalogState).mockResolvedValue(ready())
})
afterEach(() => jest.useRealTimers())
it("coalesces concurrent unavailable reads into one refresh signal, then permits another after five seconds", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 0 })
  const responses = Array.from({ length: 10 }, res)
  await Promise.all(responses.map(r => GET(req(), r)))
  for (const r of responses) expect(r.status).toHaveBeenCalledWith(503)
  expect(emit).toHaveBeenCalledTimes(1)
  jest.advanceTimersByTime(5000)
  await GET(req(), res())
  expect(emit).toHaveBeenCalledTimes(2)
})
it("retries signalling after an event bus failure", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 0 })
  emit.mockRejectedValueOnce(new Error("bus down") as never)
  await GET(req(), res())
  await GET(req(), res())
  expect(emit).toHaveBeenCalledTimes(2)
})
it("serves reads spanning incremental writes but rejects a full-build revision change", async () => {
  const state = ready()
  jest.mocked(readCatalogState).mockResolvedValueOnce(state).mockResolvedValueOnce({ ...state, valid_until: state.valid_until - 1 })
  const response = res()
  await GET(req(), response)
  expect(response.status).not.toHaveBeenCalled()
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ count: 0 }))
  jest.mocked(readCatalogState).mockResolvedValueOnce(state).mockResolvedValueOnce({ ...state, revision: "another-full-build" })
  const rebuilt = res()
  await GET(req(), rebuilt)
  expect(rebuilt.status).toHaveBeenCalledWith(503)
})
it("reports changed catalog context as retryable rather than invalid filters", async () => {
  jest.mocked(catalogContext).mockResolvedValue({ regionId: "reg_new", channelId: "sc_eg" })
  const response = res()
  await GET(req(), response)
  expect(response.status).toHaveBeenCalledWith(409)
  expect(search).not.toHaveBeenCalled()
})

it("refuses a projection that expires while its query is running", async () => {
  const state = { ...ready(), valid_until: Date.now() + 10 }
  jest.mocked(readCatalogState).mockResolvedValue(state)
  search.mockImplementationOnce(async () => { jest.advanceTimersByTime(20); return { hits: [], metadata: { count: 0 } } })
  const response = res()
  await GET(req(), response)
  expect(response.status).toHaveBeenCalledWith(503)
})
it.each([
  {}, { id: [] }, { id: Array(25).fill("prod_1") }, { id: "bad id" },
  { id: ["prod_1"], limit: 25 }, { id: ["prod_1"], offset: 1 },
  { id: ["prod_1"], q: "arbitrary browsing" }, { id: ["prod_1"], cart_id: "cart_1" },
])("rejects unbounded or non-page hydration input %j", input => {
  expect(catalogProductsSchema.safeParse({ region_id: "reg_eg", ...input }).success).toBe(false)
})
it("allows one explicit page and sets no-store without a public bypass header", () => {
  const response = res(), next = jest.fn()
  boundCatalogHydration({ query: { region_id: "reg_eg", id: ["prod_1"], limit: "1", offset: "0" } } as never, response, next)
  expect(next).toHaveBeenCalledTimes(1)
  expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
})
