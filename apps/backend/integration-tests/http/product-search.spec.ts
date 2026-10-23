import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  batchTranslationsWorkflow, createProductCategoriesWorkflow, createProductsWorkflow, createSalesChannelsWorkflow,
  updateProductsWorkflow, updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import setupHealthGoalTags from "../../src/scripts/setup-health-goal-tags"
import reindexProductSearchJob from "../../src/jobs/reindex-product-search"
import { invalidateStoreCache } from "../../src/lib/store-cache"
import { BRAND_MODULE } from "../../src/modules/brand"
import type BrandModuleService from "../../src/modules/brand/service"

jest.setTimeout(240 * 1000)

// The product search index on Medusa's Search module (Postgres engine), through
// our store route: typos, as-you-type, both languages, filters and visibility.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("product search", () => {
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      const ids: Record<string, string> = {}
      let categoryId: string
      let brandId: string
      let goalTagId: string

      const find = async (params: string) => (await api.get(`/store/product-search?${params}`, storeApi)).data as { ids: string[], count: number }
      // The index fills in the background after product events and rebuilds.
      // Admin saves clear the store cache; these direct workflow calls must do it themselves.
      const until = async (params: string, expected: (result: { ids: string[] }) => boolean) => {
        for (let attempt = 0; attempt < 60; attempt++) {
          await invalidateStoreCache(getContainer() as never)
          const result = await find(params)
          if (expected(result)) return result
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
        return find(params)
      }

      beforeEach(async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        await setupHealthGoalTags({ container, args: [] } as never)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [store] } = await query.graph({ entity: "store", fields: ["id", "default_sales_channel_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        storeApi = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }
        await updateStoresWorkflow(container).run({ input: { selector: { id: store.id as string }, update: { supported_locales: [{ locale_code: "en-US" }, { locale_code: "ar-EG" }] } } })

        const { result: [category] } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name: "Protein", handle: "protein", is_active: true }] } })
        categoryId = category.id
        const [brand] = await container.resolve<BrandModuleService>(BRAND_MODULE).createBrands([{ name: "Optimum Nutrition", slug: "optimum" }])
        brandId = brand.id
        const [goal] = await container.resolve(Modules.PRODUCT).listProductTags({ value: ["muscle-recovery"] })
        goalTagId = goal.id
        const { result: [otherChannel] } = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: "Other shop" }] } })

        const product = (title: string, extra: object = {}) => ({
          title, status: "published" as const, sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Flavor", values: ["Chocolate"] }],
          variants: [{ title: "Chocolate", options: { Flavor: "Chocolate" }, manage_inventory: false, prices: [{ amount: 1000, currency_code: "egp" }] }],
          ...extra,
        })
        const { result } = await createProductsWorkflow(container).run({ input: { products: [
          product("Whey Protein", { category_ids: [categoryId], tag_ids: [goalTagId] }),
          product("Zinc Tablets"),
          product("Creatine Draft", { status: "draft" }),
          product("Hidden Whey", { sales_channels: [{ id: otherChannel.id }] }),
          product("Protein Bar"),
        ] } })
        for (const p of result) ids[p.title] = p.id
        await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.PRODUCT]: { product_id: ids["Whey Protein"] }, [BRAND_MODULE]: { brand_id: brandId } })
        await batchTranslationsWorkflow(container).run({ input: {
          create: [{ reference: "product", reference_id: ids["Zinc Tablets"], locale_code: "ar-EG", translations: { title: "أقراص الزنك" } }],
          update: [], delete: [],
        } })
        // A brand link and an Arabic name emit no product event: the nightly rebuild picks them up.
        await reindexProductSearchJob(container)
        await until(`q=${encodeURIComponent("الزنك")}`, (r) => r.ids.length > 0)
      })

      // One test: the runner empties the database between tests, but the Search
      // module keeps its active index version in memory.
      it("finds products by typo, prefix, Arabic, brand, category, flavor and goal; filters; hides drafts; follows edits", async () => {
        // Typos on real words (a 3-letter word like "wey" is too short to tolerate one).
        expect((await find("q=protien")).ids).toContain(ids["Whey Protein"])
        expect((await find("q=whye")).ids).toEqual([ids["Whey Protein"]])
        expect((await find("q=prot")).ids.sort()).toEqual([ids["Protein Bar"], ids["Whey Protein"]].sort())
        // "الزنك" must not match the Whey's "العضلات" goal word through their shared "ال".
        expect((await find(`q=${encodeURIComponent("الزنك")}`)).ids).toEqual([ids["Zinc Tablets"]])
        expect((await find(`q=${encodeURIComponent("زنك")}`)).ids).toEqual([ids["Zinc Tablets"]])
        expect((await find("q=zinc")).ids).toEqual([ids["Zinc Tablets"]])
        for (const q of ["optimum", "chocolate", "muscle", "العضلات"]) expect((await find(`q=${encodeURIComponent(q)}`)).ids).toContain(ids["Whey Protein"])

        expect((await find(`q=protein&brand_id=${brandId}`)).ids).toEqual([ids["Whey Protein"]])
        expect((await find(`q=protein&category_id=${categoryId}`)).ids).toEqual([ids["Whey Protein"]])
        expect((await find(`q=protein&tag_id=${goalTagId}`)).ids).toEqual([ids["Whey Protein"]])
        expect(await find("q=protein&limit=1")).toEqual({ ids: [expect.any(String)], count: 2 })

        expect((await find("q=creatine")).ids).toEqual([])
        expect((await find("q=whey")).ids).not.toContain(ids["Hidden Whey"])

        expect((await api.get("/store/product-search?q=", storeApi)).status).toBe(400)
        expect((await api.get("/store/product-search?q=whey&limit=500", storeApi)).status).toBe(400)

        const container = getContainer()
        await updateProductsWorkflow(container).run({ input: { selector: { id: ids["Protein Bar"] }, update: { title: "Magnesium Glycinate" } } })
        expect((await until("q=magnesium", (r) => r.ids.length > 0)).ids).toEqual([ids["Protein Bar"]])
        await updateProductsWorkflow(container).run({ input: { selector: { id: ids["Zinc Tablets"] }, update: { status: "draft" } } })
        expect((await until("q=zinc", (r) => r.ids.length === 0)).ids).toEqual([])
      })
    })
  },
})
