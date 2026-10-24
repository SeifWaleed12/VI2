import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createInventoryItemsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import setupHealthGoalTags, { HEALTH_GOAL_TAGS } from "../../src/scripts/setup-health-goal-tags"
import { invalidateStoreCache } from "../../src/lib/store-cache"

jest.setTimeout(240 * 1000)

// Bundles come from inventory kits and health goals from product tags. Sale
// prices on /deals are the catalog index's job (catalog-sorting.spec.ts).
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("bundles and health goal tags", () => {
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      const ids: Record<string, string> = {}

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
        storeApi = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
        const tags = await container.resolve(Modules.PRODUCT).listProductTags({ value: ["immune-support", "gut-health"] })
        const tag = (value: string) => ({ id: tags.find((t) => t.value === value)!.id })

        const product = (title: string, extra: object = {}) => ({
          title, status: "published" as const, sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Size", values: ["1"] }],
          variants: [{ title: "1", options: { Size: "1" }, manage_inventory: false, prices: [{ amount: 1000, currency_code: "egp" }] }],
          ...extra,
        })
        const { result } = await createProductsWorkflow(container).run({ input: { products: [
          product("Immune", { tags: [tag("immune-support")] }), product("Probiotic", { tags: [tag("gut-health")] }),
        ] } })
        for (const p of result) ids[p.title] = p.id
      })

      it("lists inventory-kit products as bundles, and normal products not", async () => {
        const container = getContainer()
        const { data: [store] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { result: parts } = await createInventoryItemsWorkflow(container).run({ input: { items: [{ sku: "CRE-300", title: "Creatine 300g" }, { sku: "WHEY-2KG", title: "Whey 2kg" }, { sku: "WHEY-TYPO", title: "Whey typo" }] } })
        const { result: [bundle, single] } = await createProductsWorkflow(container).run({ input: { products: [{
          title: "Strength Set", status: "published", sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Set", values: ["One"] }],
          variants: [{ title: "One", options: { Set: "One" }, manage_inventory: true, prices: [{ amount: 1500, currency_code: "egp" }],
            inventory_items: [{ inventory_item_id: parts[0].id, required_quantity: 1 }, { inventory_item_id: parts[1].id, required_quantity: 2 }] }],
        }, {
          // One stock item with a mistyped quantity (Seif's local data had 10,000) is not a bundle.
          title: "Whey Typo", status: "published", sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Size", values: ["2kg"] }],
          variants: [{ title: "2kg", options: { Size: "2kg" }, manage_inventory: true, prices: [{ amount: 900, currency_code: "egp" }],
            inventory_items: [{ inventory_item_id: parts[2].id, required_quantity: 10000 }] }],
        }] } })
        const response = await api.get("/store/deals", storeApi)
        expect(response.data.bundle_ids).toEqual([bundle.id])
        expect(response.data.bundle_ids).not.toContain(single.id)
      })

      it("creates every health goal tag once and filters products by tag", async () => {
        const tags = await getContainer().resolve(Modules.PRODUCT).listProductTags({ value: HEALTH_GOAL_TAGS })
        expect(tags.map((t) => t.value).sort()).toEqual([...HEALTH_GOAL_TAGS].sort())

        const found = await api.get("/store/product-tags?value[]=immune-support&value[]=gut-health&fields=id,value", storeApi)
        expect(found.status).toBe(200)
        const byValue = Object.fromEntries(found.data.product_tags.map((t: { id: string, value: string }) => [t.value, t.id]))
        const tagged = async (value: string) => (await api.get(`/store/products?tag_id=${byValue[value]}&fields=id`, storeApi)).data.products.map((p: { id: string }) => p.id)
        expect(await tagged("immune-support")).toEqual([ids["Immune"]])
        expect(await tagged("gut-health")).toEqual([ids["Probiotic"]])
      })
    })
  },
})
