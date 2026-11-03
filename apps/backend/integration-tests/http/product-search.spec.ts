import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  batchTranslationsWorkflow, createProductCategoriesWorkflow, createProductsWorkflow, createSalesChannelsWorkflow,
  updateProductsWorkflow, updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import setupHealthGoalTags from "../../src/scripts/setup-health-goal-tags"
import { refreshCatalog } from "../../src/lib/catalog-ranking-refresh"
import { readCatalogState } from "../../src/lib/catalog-ranking"
import { BRAND_MODULE } from "../../src/modules/brand"
import type BrandModuleService from "../../src/modules/brand/service"

jest.setTimeout(240 * 1000)

// Text search in the catalog index on Medusa's Search module (Postgres engine),
// through /store/catalog: typos, as-you-type, both languages, filters and visibility.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    beforeAll(async () => {
      // Let native initial seeding finish before the runner snapshots its connections.
      for (let n = 0; n < 120; n++) {
        if ((await readCatalogState(getContainer()).catch(() => undefined))?.ready === 1) return
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      throw new Error("Native catalog index did not initialize")
    })
    describe("product search", () => {
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      const ids: Record<string, string> = {}
      let categoryId: string
      let brandId: string
      let goalTagId: string
      let regionId: string

      const get = (params: string) => api.get(`/store/catalog?region_id=${regionId}&${params}`, storeApi)
      const find = async (params: string) => {
        const { ids, count } = (await get(params)).data as { ids: string[], count: number }
        return { ids, count }
      }
      // The index follows product events in the background, and answers 503 while it refreshes.
      const until = async (params: string, expected: (result: { ids: string[] }) => boolean) => {
        for (let attempt = 0; attempt < 60; attempt++) {
          const result = await find(params)
          if (result.ids && expected(result)) return result
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
        return find(params)
      }

      beforeEach(async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        await setupHealthGoalTags({ container, args: [] } as never)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [store] } = await query.graph({ entity: "store", fields: ["id", "default_sales_channel_id", "default_region_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        regionId = store.default_region_id as string
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
        // A brand link and an Arabic name emit no product event: the reconcile job picks them up.
        await refreshCatalog(container)
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
        expect((await find("q=protein&sort=price_asc")).ids.sort()).toEqual([ids["Protein Bar"], ids["Whey Protein"]].sort())

        expect((await find("q=creatine")).ids).toEqual([])
        expect((await find("q=whey")).ids).not.toContain(ids["Hidden Whey"])

        expect((await get("q=whey&limit=500")).status).toBe(400)
        expect((await get(`q=${"a".repeat(101)}`)).status).toBe(400)

        const container = getContainer()
        await updateProductsWorkflow(container).run({ input: { selector: { id: ids["Protein Bar"] }, update: { title: "Magnesium Glycinate" } } })
        expect((await until("q=magnesium", (r) => r.ids.length > 0)).ids).toEqual([ids["Protein Bar"]])
        await updateProductsWorkflow(container).run({ input: { selector: { id: ids["Zinc Tablets"] }, update: { status: "draft" } } })
        expect((await until("q=zinc", (r) => r.ids.length === 0)).ids).toEqual([])
      })
    })
  },
})
