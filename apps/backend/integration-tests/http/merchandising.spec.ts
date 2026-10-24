import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createInventoryItemsWorkflow, createPriceListsWorkflow, createProductsWorkflow, updatePriceListsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import setupHealthGoalTags, { HEALTH_GOAL_TAGS } from "../../src/scripts/setup-health-goal-tags"
import { dealProductIds } from "../../src/lib/deals"
import { invalidateStoreCache } from "../../src/lib/store-cache"

jest.setTimeout(240 * 1000)

// Deals come from sale Price Lists and health goals from product tags,
// all through Medusa's own store API.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("deals and health goal tags", () => {
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      let regionId: string
      const ids: Record<string, string> = {}
      const variants: Record<string, string> = {}

      beforeEach(async () => {
        const container = getContainer()
        // The runner empties the database between tests; a cached /store/deals answer would outlive it.
        await invalidateStoreCache(container as never)
        await setupEgyptStore(container)
        // Run twice: the second run must not fail or duplicate.
        await setupHealthGoalTags({ container, args: [] } as never)
        await setupHealthGoalTags({ container, args: [] } as never)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        const { data: [region] } = await query.graph({ entity: "region", fields: ["id"] })
        storeApi = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
        regionId = region.id as string
        const tags = await container.resolve(Modules.PRODUCT).listProductTags({ value: ["immune-support", "gut-health"] })
        const tag = (value: string) => ({ id: tags.find((t) => t.value === value)!.id })

        const product = (title: string, extra: object = {}) => ({
          title, status: "published" as const, sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Size", values: ["1"] }],
          variants: [{ title: "1", options: { Size: "1" }, manage_inventory: false, prices: [{ amount: 1000, currency_code: "egp" }] }],
          ...extra,
        })
        const { result } = await createProductsWorkflow(container).run({ input: { products: [
          product("On sale", { tags: [tag("immune-support")] }), product("Later"), product("Ended"), product("VIP"), product("Override"),
          product("Draft sale"), product("Probiotic", { tags: [tag("gut-health")] }),
        ] } })
        for (const p of result) {
          ids[p.title] = p.id
          variants[p.title] = p.variants[0].id
        }
        const sale = (title: string, extra: object = {}) => ({
          title, description: title, status: "active", prices: [{ amount: 800, currency_code: "egp", variant_id: variants[title] }], ...extra,
        })
        const day = 24 * 60 * 60 * 1000
        await createPriceListsWorkflow(container).run({ input: { price_lists_data: [
          sale("On sale", { ends_at: new Date(Date.now() + day).toISOString() }),
          sale("Later", { starts_at: new Date(Date.now() + day).toISOString() }),
          sale("Ended", { ends_at: new Date(Date.now() - day).toISOString() }),
          sale("VIP", { rules: { "customer.groups.id": ["cusgroup_vip"] } }),
          sale("Override", { type: "override" }),
          sale("Draft sale", { status: "draft" }),
        ] as never } })
      })

      it("lists inventory-kit products as bundles, and normal products not", async () => {
        const container = getContainer()
        const { data: [store] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { result: parts } = await createInventoryItemsWorkflow(container).run({ input: { items: [{ sku: "CRE-300", title: "Creatine 300g" }, { sku: "WHEY-2KG", title: "Whey 2kg" }] } })
        const { result: [bundle] } = await createProductsWorkflow(container).run({ input: { products: [{
          title: "Strength Set", status: "published", sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Set", values: ["One"] }],
          variants: [{ title: "One", options: { Set: "One" }, manage_inventory: true, prices: [{ amount: 1500, currency_code: "egp" }],
            inventory_items: [{ inventory_item_id: parts[0].id, required_quantity: 1 }, { inventory_item_id: parts[1].id, required_quantity: 2 }] }],
        }] } })
        const response = await api.get("/store/deals", storeApi)
        expect(response.data.bundle_ids).toEqual([bundle.id])
        expect(response.data.product_ids).not.toContain(bundle.id)
      })

      it("lists only products with a sale running now for everyone, and shows the sale and normal price", async () => {
        const response = await api.get("/store/deals", storeApi)
        expect(response.status).toBe(200)
        expect(response.data.product_ids).toEqual([ids["On sale"]])

        const products = await api.get(`/store/products?id=${ids["On sale"]}&region_id=${regionId}&fields=id,variants.calculated_price`, storeApi)
        const price = products.data.products[0].variants[0].calculated_price
        expect([price.calculated_amount, price.original_amount]).toEqual([800, 1000])
      })

      it("drops a deal once its price list is no longer active", async () => {
        const container = getContainer()
        const { data: lists } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "price_list", fields: ["id"], filters: { title: "On sale" } })
        await updatePriceListsWorkflow(container).run({ input: { price_lists_data: [{ id: lists[0].id as string, status: "draft" as never }] } })
        expect(await dealProductIds(container)).toEqual([])
      })

      it("creates every health goal tag once and filters products by tag", async () => {
        const tags = await getContainer().resolve(Modules.PRODUCT).listProductTags({ value: HEALTH_GOAL_TAGS })
        expect(tags.map((t) => t.value).sort()).toEqual([...HEALTH_GOAL_TAGS].sort())

        const found = await api.get("/store/product-tags?value[]=immune-support&value[]=gut-health&fields=id,value", storeApi)
        expect(found.status).toBe(200)
        const byValue = Object.fromEntries(found.data.product_tags.map((t: { id: string, value: string }) => [t.value, t.id]))
        const tagged = async (value: string) => (await api.get(`/store/products?tag_id=${byValue[value]}&fields=id`, storeApi)).data.products.map((p: { id: string }) => p.id)
        expect(await tagged("immune-support")).toEqual([ids["On sale"]])
        expect(await tagged("gut-health")).toEqual([ids["Probiotic"]])
      })
    })
  },
})
