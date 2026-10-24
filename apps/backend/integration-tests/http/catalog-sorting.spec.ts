import { join } from "node:path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow, createPriceListsWorkflow, createProductsWorkflow, createProductCategoriesWorkflow, createSalesChannelsWorkflow, updatePriceListsWorkflow, updateProductVariantsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { refreshCatalog } from "../../src/lib/catalog-ranking-refresh"
import reconcile from "../../src/jobs/reconcile-catalog-ranking"
import { readCatalogState, writeCatalogState } from "../../src/lib/catalog-ranking"

jest.setTimeout(360_000)
medusaIntegrationTestRunner({
  dbName: "vi2-catalog-sorting-test-20261024",
  cwd: join(__dirname, "../.."),
  testSuite: ({ api, getContainer }) => {
    beforeAll(async () => {
      // Let native initial seeding finish before the runner snapshots/closes its template connections.
      for (let n = 0; n < 120; n++) {
        if ((await readCatalogState(getContainer()).catch(() => undefined))?.ready === 1) return
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      throw new Error("Native catalog index did not initialize")
    })
    it("sorts globally before pagination and automatically follows native reservations, prices, visibility and sale boundaries", async () => {
      const container = getContainer()
      const bus = container.resolve(Modules.EVENT_BUS)
      const originalEmit = bus.emit.bind(bus)
      const emittedNames: string[] = []
      jest.spyOn(bus, "emit").mockImplementation(async (events, options) => {
        emittedNames.push(...[events].flat().map((event: any) => event.name))
        return originalEmit(events, options)
      })
      await setupEgyptStore(container)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id", "default_region_id", "default_location_id"] })
      const channel = store.default_sales_channel_id as string, region = store.default_region_id as string
      const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
      const options = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
      const { result: [category] } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name: "Catalog scope", handle: "catalog-scope", is_active: true }] } })
      const { result: [other] } = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: "Hidden channel" }] } })
      const product = (title: string, amount: number, extra: object = {}) => ({
        title, status: "published" as const, sales_channels: [{ id: channel }],
        options: [{ title: "Size", values: ["1"] }],
        variants: [{ title: "1", options: { Size: "1" }, manage_inventory: false, prices: [{ amount, currency_code: "egp" }] }], ...extra,
      })
      const { result: products } = await createProductsWorkflow(container).run({ input: { products: [
        ...Array.from({ length: 107 }, (_, i) => product("Catalog sale " + i, 500 + i, i % 2 ? {} : { category_ids: [category.id] })),
        product("Managed", 10, { variants: [{ title: "1", options: { Size: "1" }, manage_inventory: true, prices: [{ amount: 10, currency_code: "egp" }] }] }),
        product("Backorder", 11, { variants: [{ title: "1", options: { Size: "1" }, manage_inventory: true, allow_backorder: true, prices: [{ amount: 11, currency_code: "egp" }] }] }),
        product("Unpriced", 0, { variants: [{ title: "1", options: { Size: "1" }, manage_inventory: false, prices: [] }] }),
        product("Bulk", 500), product("Private", 500), product("Override", 500),
        product("Hidden", 1, { sales_channels: [{ id: other.id }] }), product("Draft", 1, { status: "draft" }),
      ] } })
      const byTitle = new Map(products.map(p => [p.title, p]))
      const managed = byTitle.get("Managed")!
      const { data: [v] } = await query.graph({ entity: "product_variant", fields: ["inventory_items.inventory_item_id"], filters: { id: managed.variants[0].id } })
      const inventoryId = v.inventory_items?.[0]?.inventory_item_id
      if (!inventoryId) throw new Error("Managed fixture has no inventory item")
      await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: [{ inventory_item_id: inventoryId, location_id: store.default_location_id as string, stocked_quantity: 1 }] } })
      const { result: lists } = await createPriceListsWorkflow(container).run({ input: { price_lists_data: [
        { title: "Public sale", description: "Test", status: "active", prices: products.slice(0,107).map((p,i) => ({ variant_id: p.variants[0].id, currency_code: "egp", amount: 100 + i })) },
        { title: "Bulk", description: "Test", status: "active", prices: [{ variant_id: byTitle.get("Bulk")!.variants[0].id, currency_code: "egp", amount: 1, min_quantity: 5 }] },
        { title: "Private", description: "Test", status: "active", rules: { "customer.groups.id": ["cusgroup_private"] }, prices: [{ variant_id: byTitle.get("Private")!.variants[0].id, currency_code: "egp", amount: 1 }] },
        { title: "Override", description: "Test", status: "active", type: "override", prices: [{ variant_id: byTitle.get("Override")!.variants[0].id, currency_code: "egp", amount: 300 }] },
      ] as never } })
      await refreshCatalog(container)
      const reads: number[] = []
      const find = async (extra = "") => {
        const started = performance.now()
        const response = await api.get("/store/catalog?region_id=" + region + extra, options)
        if (response.status === 200) reads.push(performance.now() - started)
        return response
      }
      const waitFor = async (extra: string, check: (body: any) => boolean | Promise<boolean>) => {
        for (let n = 0; n < 120; n++) {
          const result = await find(extra)
          if (result.status === 200 && await check(result.data)) return result.data
          await new Promise(r => setTimeout(r, 250))
        }
        const last = await find(extra)
        console.log("CATALOG_WAIT_FAILURE", extra, last.status, last.data.count, await readCatalogState(container), [...new Set(emittedNames)])
        const diagnostic = await query.graph({entity: "price_list", fields: ["id", "status", "type"]})
        console.log("CATALOG_PRICE_LIST_STATE", diagnostic.data)
        throw new Error("Catalog did not reach expected state")
      }
      const docs = async () => (await container.resolve(Modules.SEARCH).search({ entity: "product", filters: { record_type: "product" }, pagination: { take: 200 } })).hits.map(hit => hit.document)
      const first = await waitFor("&sort=price_asc", r => r.count === 113)
      expect(first.ids[0]).toBe(managed.id)
      // Hold one real native projection open while polling the HTTP route.
      let release!: () => void
      let entered!: () => void
      const projecting = new Promise<void>(resolve => { entered = resolve })
      const proceed = new Promise<void>(resolve => { release = resolve })
      const originalGraph = query.graph.bind(query)
      const graphSpy = jest.spyOn(query, "graph").mockImplementation(async (...args: any[]) => {
        if (args[0].entity === "product" && args[0].fields?.includes("variants.variant_rank")) {
          entered()
          await proceed
        }
        return originalGraph(...args as Parameters<typeof originalGraph>)
      })
      const incremental = refreshCatalog(container, [managed.id])
      let projectionTimer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([projecting, new Promise((_, reject) => projectionTimer = setTimeout(() => reject(new Error("Incremental projection did not start")), 10000))])
        for (let n = 0; n < 5; n++) expect((await find("&sort=price_asc")).status).toBe(200)
      } finally {
        clearTimeout(projectionTimer)
        release()
        try { await incremental } finally { graphSpy.mockRestore() }
      }
      expect((await find("&sort=price_asc")).status).toBe(200)
      const hydration = await api.get("/store/catalog-products?region_id=" + region + "&id=" + managed.id + "&limit=1&fields=id,variants.calculated_price,variants.inventory_quantity", options)
      expect(hydration.status).toBe(200)
      expect(hydration.headers["cache-control"]).toBe("no-store")
      const localizedHydration = await api.get("/store/catalog-products?region_id=" + region + "&id=" + products[0].id + "&fields=id,brand.id,categories.id,categories.name", { ...options, headers: { ...options.headers, "x-medusa-locale": "ar-EG" } })
      expect(localizedHydration.status).toBe(200)
      expect(localizedHydration.data.products[0].categories).toEqual([expect.objectContaining({ id: category.id })])
      expect(hydration.data.products[0].id).toBe(managed.id)
      expect(hydration.data.products[0].variants[0].calculated_price.calculated_amount).toBe(10)
      expect((await api.get("/store/catalog-products?region_id=" + region, options)).status).toBe(400)
      expect((await api.get("/store/catalog-products?region_id=" + region + "&id=" + managed.id + "&offset=24", options)).status).toBe(400)
      const hiddenIds = [byTitle.get("Hidden")!.id, byTitle.get("Draft")!.id]
      expect((await api.get("/store/catalog-products?region_id=" + region + hiddenIds.map(id => "&id[]=" + id).join(""), options)).data.products).toEqual([])
      expect((await find("&q=catalog&sort=price_asc")).data.count).toBe(107)
      const sortedIds: string[] = []
      for (let offset = 0; offset < 113; offset += 24) {
        const page = await waitFor("&sort=price_asc&offset=" + offset, r => r.count === 113)
        expect(page.ids.length).toBeLessThanOrEqual(24)
        sortedIds.push(...page.ids)
      }
      expect(new Set(sortedIds).size).toBe(113)
      expect(sortedIds.at(-1)).toBe(byTitle.get("Unpriced")!.id)
      const documents = new Map((await docs()).map(row => [row.id, row]))
      const prices = sortedIds.filter(id => documents.get(id)!.catalog_priced).map(id => documents.get(id)!.catalog_price)
      expect(prices).toEqual([...prices].sort((a,b) => Number(a) - Number(b)))
      const desc = await waitFor("&sort=price_desc", r => r.count === 113)
      expect(desc.ids[0]).toBe(byTitle.get("Bulk")!.id < byTitle.get("Private")!.id ? byTitle.get("Bulk")!.id : byTitle.get("Private")!.id)
      expect((await find("&deals=true&offset=96&sort=price_asc")).data).toMatchObject({ count: 107, ids: expect.any(Array) })
      expect((await find("&deals=true&offset=96")).data.ids).toHaveLength(11)
      expect((await find("&category_id=" + category.id)).data.count).toBe(54)
      for (const name of ["Bulk", "Private"]) expect(documents.get(byTitle.get(name)!.id)!.catalog_price).toBe(500)
      expect(documents.get(byTitle.get("Override")!.id)!.deal).toBe(0)
      const native = await api.get("/store/products?region_id=" + region + "&id=" + managed.id + "&fields=id,variants.calculated_price,variants.inventory_quantity", options)
      expect(native.data.products[0].variants[0].calculated_price.calculated_amount).toBe(documents.get(managed.id)!.catalog_price)
      const inventory = container.resolve(Modules.INVENTORY)
      const reservation = await inventory.createReservationItems({ inventory_item_id: inventoryId, location_id: store.default_location_id as string, quantity: 1 })
      // No explicit ingestion: the real native event must update availability.
      await waitFor("&sort=in_stock&offset=96", async () => (await docs()).find(p => p.id === managed.id)!.catalog_available === 0)
      expect((await docs()).find(p => p.id === managed.id)!.catalog_available).toBe(0)
      expect((await docs()).find(p => p.id === byTitle.get("Backorder")!.id)!.catalog_available).toBe(1)
      await inventory.deleteReservationItems(reservation.id)
      await waitFor("&sort=in_stock&offset=96", async () => (await docs()).find(p => p.id === managed.id)!.catalog_available === 1)
      await updatePriceListsWorkflow(container).run({ input: { price_lists_data: [{ id: lists[0].id, status: "draft" as never }] } })
      await waitFor("&deals=true", r => r.count === 0)
      expect((await docs()).find(p => p.id === products[0].id)!.catalog_price).toBe(500)
      await updateProductsWorkflow(container).run({ input: { products: [{ id: products[0].id, status: "draft" }] } })
      await waitFor("", r => r.count === 112)
      expect((await find("&sort=quantity")).status).toBe(400)
      expect((await api.get("/store/catalog?region_id=reg_other", options)).status).toBe(409)
      // An expired snapshot is unavailable until the scheduled worker repairs it.
      await writeCatalogState(container, 1, Date.now() - 1)
      expect((await find("&sort=price_asc")).status).toBe(503)
      await reconcile(container)
      expect((await find("&sort=price_asc")).status).toBe(200)
      const starts = new Date(Date.now() + 5000)
      const ends = new Date(starts.getTime() + 5000)
      await createPriceListsWorkflow(container).run({ input: { price_lists_data: [{
        title: "Scheduled sale", description: "Test", status: "active", starts_at: starts, ends_at: ends,
        prices: [{ variant_id: byTitle.get("Bulk")!.variants[0].id, currency_code: "egp", amount: 70 }],
      }] as never } })
      await waitFor("&deals=true", r => r.count === 0)
      expect((await readCatalogState(container))!.valid_until).toBeLessThanOrEqual(starts.getTime())
      // Clock time crosses real native starts/ends; GET requests only, no explicit ingestion.
      await waitFor("&deals=true", r => r.count === 1 && r.ids[0] === byTitle.get("Bulk")!.id)
      await waitFor("&deals=true", r => r.count === 0)
      await updateProductVariantsWorkflow(container).run({ input: { product_variants: [{
        id: byTitle.get("Bulk")!.variants[0].id, prices: [{ currency_code: "egp", amount: 900 }],
      }] } })
      await waitFor("&sort=price_desc", async result => result.ids[0] === byTitle.get("Bulk")!.id && (await docs()).find(p => p.id === byTitle.get("Bulk")!.id)!.catalog_price === 900)
      const { result: multi } = await createProductsWorkflow(container).run({ input: { products: ["Unpriced first", "Sold-out first"].map((title, index) => product(title, 0, {
        options: [{ title: "Size", values: ["first", "second"] }],
        variants: [
          { title: "first", variant_rank: 0, options: { Size: "first" }, manage_inventory: index === 1, prices: index === 0 ? [] : [{ amount: 10, currency_code: "egp" }] },
          { title: "second", variant_rank: 1, options: { Size: "second" }, manage_inventory: false, prices: [{ amount: 50, currency_code: "egp" }] },
        ],
      })) } })
      await waitFor("&sort=in_stock", async result => result.count === 114 && (await docs()).filter(row => multi.some(p => p.id === row.id) && row.catalog_available === 1).length === 2)
      for (const p of multi) {
        const document = (await docs()).find(row => row.id === p.id)
        expect(document).toMatchObject({ catalog_price: 50, catalog_priced: 1, catalog_available: 1, display_variant_id: p.variants.find(v => v.title === "second")!.id })
      }
      console.log("CATALOG_QUERY_MS", { first: reads[0], last: reads.at(-1), max: Math.max(...reads), samples: reads.length })
      console.log("CATALOG_SORTING: 113 visible products, 107 deals, 24/page, native mutation refresh, unhealthy recovery")
    })
  },
})
