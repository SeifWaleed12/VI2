import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPriceListsWorkflow, createProductsWorkflow, updatePriceListsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import setupMerchandisingTags, { MERCHANDISING_TAGS } from "../../src/scripts/setup-merchandising-tags"
import { dealProductIds } from "../../src/lib/deals"

jest.setTimeout(240 * 1000)

// Deals come from sale Price Lists, health goals and bundles from product tags,
// all through Medusa's own store API.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("deals and merchandising tags", () => {
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      let regionId: string
      const ids: Record<string, string> = {}
      const variants: Record<string, string> = {}

      beforeEach(async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        // Run twice: the second run must not fail or duplicate.
        await setupMerchandisingTags({ container, args: [] } as never)
        await setupMerchandisingTags({ container, args: [] } as never)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        const { data: [region] } = await query.graph({ entity: "region", fields: ["id"] })
        storeApi = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
        regionId = region.id as string
        const tags = await container.resolve(Modules.PRODUCT).listProductTags({ value: ["immune-support", "bundle"] })
        const tag = (value: string) => ({ id: tags.find((t) => t.value === value)!.id })

        const product = (title: string, extra: object = {}) => ({
          title, status: "published" as const, sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Size", values: ["1"] }],
          variants: [{ title: "1", options: { Size: "1" }, manage_inventory: false, prices: [{ amount: 1000, currency_code: "egp" }] }],
          ...extra,
        })
        const { result } = await createProductsWorkflow(container).run({ input: { products: [
          product("On sale", { tags: [tag("immune-support")] }), product("Later"), product("Ended"), product("VIP"), product("Override"),
          product("Draft sale"), product("Strength set", { tags: [tag("bundle")] }),
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

      it("creates every merchandising tag once and filters products by tag", async () => {
        const tags = await getContainer().resolve(Modules.PRODUCT).listProductTags({ value: MERCHANDISING_TAGS })
        expect(tags.map((t) => t.value).sort()).toEqual([...MERCHANDISING_TAGS].sort())

        const found = await api.get("/store/product-tags?value[]=immune-support&value[]=bundle&fields=id,value", storeApi)
        expect(found.status).toBe(200)
        const byValue = Object.fromEntries(found.data.product_tags.map((t: { id: string, value: string }) => [t.value, t.id]))
        const tagged = async (value: string) => (await api.get(`/store/products?tag_id=${byValue[value]}&fields=id`, storeApi)).data.products.map((p: { id: string }) => p.id)
        expect(await tagged("immune-support")).toEqual([ids["On sale"]])
        expect(await tagged("bundle")).toEqual([ids["Strength set"]])
      })
    })
  },
})
