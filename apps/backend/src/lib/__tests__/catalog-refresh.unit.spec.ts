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
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 300000, revision: "full-build" })
  jest.mocked(catalogValidUntil).mockResolvedValue(Date.now() + 200000)
  jest.mocked(readCatalogRows).mockResolvedValue([{ id: "p" }] as never)
  jest.mocked(catalogDocuments).mockResolvedValue([{ id: "p", catalog_price: 100 }])
})
it("holds the renewable native seed lock through projection, writing and invalidation", async () => {
  await refreshCatalog(container, ["p"])
  expect(execute).toHaveBeenCalledWith("search:seed:product", expect.any(Function), { timeout: 30, expire: 60 })
  expect(writeCatalogState).toHaveBeenCalledTimes(1)
  expect(search.upsertDocuments).toHaveBeenCalledWith({ index: "product", documents: [{ id: "p", catalog_price: 100 }] })
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 1, expect.any(Number), "", "full-build")
  expect(invalidateStoreCache).toHaveBeenCalled()
})
it("leaves the persisted state unhealthy after a failed write and never blesses a partial retry", async () => {
  search.upsertDocuments.mockRejectedValueOnce(new Error("database failed"))
  await expect(refreshCatalog(container, ["p"])).rejects.toThrow("database failed")
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 0, 0)
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 0, valid_until: 0 })
  await refreshCatalog(container, ["p"])
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 0, 0, "", undefined)
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
  expect(writeCatalogState).not.toHaveBeenCalled()
})

it("keeps healthy reads available while an incremental projection is in flight", async () => {
  let release!: () => void
  let started!: () => void
  const entered = new Promise<void>(resolve => { started = resolve })
  jest.mocked(catalogDocuments).mockImplementationOnce(async () => {
    started()
    await new Promise<void>(resolve => { release = resolve })
    return [{ id: "p" }]
  })
  const refresh = refreshCatalog(container, ["p"])
  await entered
  expect(writeCatalogState).not.toHaveBeenCalled()
  release()
  await refresh
  expect(writeCatalogState).toHaveBeenCalledWith(container, 1, expect.any(Number), "", "full-build")
})
it("marks a full rebuild unavailable before it writes product documents", async () => {
  const order: string[] = []
  jest.mocked(writeCatalogState).mockImplementationOnce(async () => { order.push("unhealthy") })
  jest.mocked(readCatalogRows).mockImplementationOnce(async () => { order.push("read"); return [] })
  Object.assign(search, { search: jest.fn(async () => ({ hits: [] })) })
  await refreshCatalog(container)
  expect(order).toEqual(["unhealthy", "read"])
  expect(writeCatalogState).toHaveBeenLastCalledWith(container, 1, expect.any(Number), "version", undefined)
})

it("combines a burst of product events into one bounded native write", async () => {
  jest.mocked(readCatalogRows).mockResolvedValue([{ id: "p" }] as never)
  await Promise.all(Array.from({ length: 100 }, (_, i) => refreshCatalog(container, undefined, { name: "product.updated", data: { id: `p${i}` } })))
  expect(execute).toHaveBeenCalledTimes(1)
  expect(readCatalogRows).toHaveBeenCalledWith(expect.anything(), { id: expect.arrayContaining(["p0", "p99"]) })
  expect(search.upsertDocuments).toHaveBeenCalledTimes(1)
})

it("combines broad events into one full reconciliation", async () => {
  jest.mocked(readCatalogRows).mockResolvedValue([])
  Object.assign(search, { search: jest.fn(async () => ({ hits: [] })) })
  await Promise.all(Array.from({ length: 50 }, (_, i) => refreshCatalog(container, undefined, { name: "translation.translation.updated", data: { id: `t${i}` } })))
  expect(execute).toHaveBeenCalledTimes(1)
  expect(writeCatalogState).toHaveBeenCalledTimes(2)
})

it("keeps a still-valid projection readable throughout routine reconciliation", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 30000, price_version: "version", revision: "previous" })
  jest.mocked(readCatalogRows).mockResolvedValue([])
  Object.assign(search, { search: jest.fn(async () => ({ hits: [] })) })
  await refreshCatalog(container, undefined, { name: "catalog-ranking.reconcile", data: {} })
  expect(writeCatalogState).toHaveBeenCalledTimes(1)
  expect(writeCatalogState).toHaveBeenCalledWith(container, 1, expect.any(Number), "version", undefined)
})

it("does not extend or invalidate valid state after a failed routine refresh", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 30000, price_version: "version", revision: "previous" })
  jest.mocked(readCatalogRows).mockRejectedValueOnce(new Error("temporary read failure"))
  await expect(refreshCatalog(container, undefined, { name: "catalog-ranking.reconcile", data: {} })).rejects.toThrow("temporary read failure")
  expect(writeCatalogState).not.toHaveBeenCalled()
})

it("still fails closed during routine reconciliation when the price watermark changed", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 30000, price_version: "old", revision: "previous" })
  jest.mocked(readCatalogRows).mockResolvedValue([])
  Object.assign(search, { search: jest.fn(async () => ({ hits: [] })) })
  await refreshCatalog(container, undefined, { name: "catalog-ranking.reconcile", data: {} })
  expect(writeCatalogState).toHaveBeenNthCalledWith(1, container, 0, 0)
})

it.each([300000, 30000])("separates routine checks from product events with %i ms validity", async remaining => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + remaining, price_version: "version", revision: "previous" })
  Object.assign(search, { search: jest.fn(async () => ({ hits: [] })) })
  await Promise.all([
    refreshCatalog(container, undefined, { name: "catalog-ranking.reconcile", data: {} }),
    refreshCatalog(container, undefined, { name: "product.updated", data: { id: "p" } }),
  ])
  expect(writeCatalogState).toHaveBeenCalledTimes(1)
  expect(jest.mocked(writeCatalogState).mock.calls.some(call => call[1] === 0)).toBe(false)
  if (remaining === 300000) expect(readCatalogRows).toHaveBeenCalledWith(expect.anything(), { id: ["p"] })
})

it("keeps broad mutations fail-closed even when coalesced with a routine check", async () => {
  jest.mocked(readCatalogState).mockResolvedValue({ ready: 1, valid_until: Date.now() + 300000, price_version: "version" })
  jest.mocked(readCatalogRows).mockResolvedValue([])
  Object.assign(search, { search: jest.fn(async () => ({ hits: [] })) })
  await Promise.all([
    refreshCatalog(container, undefined, { name: "catalog-ranking.reconcile", data: {} }),
    refreshCatalog(container, undefined, { name: "translation.translation.updated", data: { id: "t" } }),
  ])
  expect(writeCatalogState).toHaveBeenNthCalledWith(1, container, 0, 0)
})
