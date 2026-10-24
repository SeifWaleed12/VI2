import { refreshCatalog } from "../catalog-ranking-refresh"
import { catalogDocuments, catalogValidUntil, readCatalogRows, readCatalogState, writeCatalogState } from "../catalog-ranking"
import { invalidateStoreCache } from "../store-cache"
jest.mock("../catalog-ranking", () => ({
  CATALOG_BATCH: 100, CATALOG_LOCK: "search:seed:product", catalogDocuments: jest.fn(), catalogPriceVersion: jest.fn(async () => "version"), catalogValidUntil: jest.fn(),
  readCatalogRows: jest.fn(), readCatalogState: jest.fn(), writeCatalogState: jest.fn(),
}))
jest.mock("../store-cache", () => ({ invalidateStoreCache: jest.fn() }))
const search = { upsertDocuments: jest.fn(), deleteDocuments: jest.fn() }
const execute = jest.fn(async (_key, job) => job())
const container = { resolve: (key: string) => key === "locking" ? { execute } : key === "search" ? search : {} } as never
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 300000 })
  jest.mocked(catalogValidUntil).mockResolvedValue(Date.now() + 200000)
  jest.mocked(readCatalogRows).mockResolvedValue([{ id: "p" }] as never)
  jest.mocked(catalogDocuments).mockResolvedValue([{ id: "p", catalog_price: 100 }])
})
it("holds the renewable native seed lock through projection, writing and invalidation", async () => {
  await refreshCatalog(container, ["p"])
  expect(execute).toHaveBeenCalledWith("search:seed:product", expect.any(Function), { timeout: 30, expire: 60 })
  expect(writeCatalogState).toHaveBeenNthCalledWith(1, container, 0, 0)
  expect(search.upsertDocuments).toHaveBeenCalledWith({ index: "product", documents: [{ id: "p", catalog_price: 100 }] })
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 1, expect.any(Number), "")
  expect(invalidateStoreCache).toHaveBeenCalled()
})
it("leaves the persisted state unhealthy after a failed write and never blesses a partial retry", async () => {
  search.upsertDocuments.mockRejectedValueOnce(new Error("database failed"))
  await expect(refreshCatalog(container, ["p"])).rejects.toThrow("database failed")
  expect(writeCatalogState).toHaveBeenCalledTimes(1)
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 0, valid_until: 0 })
  await refreshCatalog(container, ["p"])
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 0, 0, "")
})
it("does not write a projection after losing its lease", async () => {
  const signal = AbortSignal.abort()
  execute.mockImplementationOnce(async (_key, job) => job(signal))
  await expect(refreshCatalog(container, ["p"])).rejects.toThrow("lost its lock")
  expect(search.upsertDocuments).not.toHaveBeenCalled()
})

it("stops before writing when its lease is lost during native projection", async () => {
  const controller = new AbortController()
  execute.mockImplementationOnce(async (_key, job) => job(controller.signal))
  jest.mocked(catalogDocuments).mockImplementationOnce(async () => { controller.abort(); return [{ id: "p" }] })
  await expect(refreshCatalog(container, ["p"])).rejects.toThrow("lost its lock")
  expect(search.upsertDocuments).not.toHaveBeenCalled()
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 0, 0)
})
