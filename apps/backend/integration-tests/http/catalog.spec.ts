import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductCategoriesWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { BRAND_MODULE } from "../../src/modules/brand"
import type BrandModuleService from "../../src/modules/brand/service"
import { setProductEdaWorkflow } from "../../src/workflows/product-eda"

jest.setTimeout(240 * 1000)

// The catalog contract the storefront relies on (docs/CATALOG-CONTRACT.md):
// Medusa's own /store/products, plus our brand_id filter.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("store catalog contract", () => {
      let storeApi: { headers: Record<string, string>, validateStatus: () => boolean }
      let parentId: string
      let childId: string
      let activeBrandId: string
      let inactiveBrandId: string
      let secondBrandId: string
      let zincId: string

      beforeEach(async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        storeApi = { headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true }

        const { result: [parent] } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name: "Vitamins", handle: "vitamins", is_active: true }] } })
        const { result: [child] } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name: "Vitamin C", handle: "vitamin-c", parent_category_id: parent.id, is_active: true }] } })
        parentId = parent.id
        childId = child.id
        const brands = getContainer().resolve<BrandModuleService>(BRAND_MODULE)
        const [active, inactive, second] = await brands.createBrands([{ name: "Optimum", slug: "optimum" }, { name: "Retired", slug: "retired", status: "inactive" }, { name: "Nutrex", slug: "nutrex" }])
        activeBrandId = active.id
        inactiveBrandId = inactive.id
        secondBrandId = second.id

        const product = (title: string, categoryId: string) => ({
          title, status: "published" as const, category_ids: [categoryId],
          sales_channels: [{ id: store.default_sales_channel_id as string }],
          options: [{ title: "Size", values: ["1kg"] }],
          variants: [{ title: "1kg", options: { Size: "1kg" }, manage_inventory: false, prices: [{ amount: 1500, currency_code: "egp" }] }],
        })
        const { result: products } = await createProductsWorkflow(container).run({
          input: { products: [
            ...Array.from({ length: 103 }, (_, i) => product(`Whey ${i + 1}`, childId)),
            product("Old Whey 1", childId), product("Old Whey 2", childId),
            product("Zinc", parentId),
          ] },
        })
        zincId = products[105].id
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        await link.create(products.map((p, i) => ({ [Modules.PRODUCT]: { product_id: p.id }, [BRAND_MODULE]: { brand_id: i < 103 ? activeBrandId : i < 105 ? inactiveBrandId : secondBrandId } })))
      })

      const list = async (params: string) => {
        const response = await api.get(`/store/products?fields=id,title&${params}`, storeApi)
        return { status: response.status, count: response.data.count, ids: (response.data.products ?? []).map((p: { id: string }) => p.id), titles: (response.data.products ?? []).map((p: { title: string }) => p.title) }
      }

      it("pages through a category and its subcategory with an accurate total, past the first 100", async () => {
        const firstPage = await list(`category_id=${parentId}&category_id=${childId}&limit=50&offset=0`)
        expect(firstPage).toEqual(expect.objectContaining({ status: 200, count: 106 }))
        expect(firstPage.ids).toHaveLength(50)
        expect((await list(`category_id=${parentId}&category_id=${childId}&limit=50&offset=100`)).ids).toHaveLength(6)
        expect(await list(`category_id=${parentId}&category_id=${childId}&limit=50&offset=200`)).toEqual(expect.objectContaining({ count: 106, ids: [] }))
        // A category alone does not include its subcategories; the storefront sends both.
        expect(await list(`category_id=${parentId}`)).toEqual(expect.objectContaining({ count: 1, ids: [zincId] }))
      })

      it("combines brand, category and search, and pages past the first 100", async () => {
        const brand = await list(`brand_id=${activeBrandId}&limit=20&offset=100`)
        expect(brand).toEqual(expect.objectContaining({ status: 200, count: 103 }))
        expect(brand.ids).toHaveLength(3)
        expect(await list(`brand_id=${activeBrandId}&category_id=${childId}&q=Whey&limit=1`)).toEqual(expect.objectContaining({ count: 103 }))
        expect((await list(`brand_id=${activeBrandId}&q=Whey 10&limit=50`)).titles.sort()).toEqual(["Whey 10", "Whey 100", "Whey 101", "Whey 102", "Whey 103"])
        expect(await list(`brand_id=${activeBrandId}&category_id=${parentId}`)).toEqual(expect.objectContaining({ count: 0, ids: [] }))
        expect(await list(`brand_id=${activeBrandId}&brand_id=${inactiveBrandId}&limit=1`)).toEqual(expect.objectContaining({ count: 103 }))
      })

      it("matches any of several brands or categories, and all of brand, category and search", async () => {
        expect(await list(`brand_id=${activeBrandId}&brand_id=${secondBrandId}&limit=1`)).toEqual(expect.objectContaining({ count: 104 }))
        expect(await list(`brand_id=${activeBrandId}&brand_id=${secondBrandId}&category_id=${parentId}`)).toEqual(expect.objectContaining({ count: 1, ids: [zincId] }))
        expect(await list(`brand_id=${activeBrandId}&brand_id=${secondBrandId}&category_id=${parentId}&q=Whey`)).toEqual(expect.objectContaining({ count: 0 }))
        expect(await list(`category_id=${parentId}&category_id=${childId}&q=Zinc`)).toEqual(expect.objectContaining({ count: 1, ids: [zincId] }))
      })

      it("answers inactive or unknown brands and unknown categories with an empty page, not an error", async () => {
        for (const params of [`brand_id=${inactiveBrandId}`, "brand_id=brand_missing", "category_id=pcat_missing"]) {
          expect({ params, ...(await list(params)) }).toEqual({ params, status: 200, count: 0, ids: [], titles: [] })
        }
      })

      it("refuses malformed brand filters", async () => {
        expect((await list("brand_id=not%20an%20id")).status).toBe(400)
        expect((await list(Array.from({ length: 51 }, (_, i) => `brand_id=brand_${i}`).join("&"))).status).toBe(400)
      })

      it("gives the product page its brand ID, categories and EDA registration", async () => {
        const { data: [whey] } = await getContainer().resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "product", fields: ["id"], filters: { title: "Whey 1" } })
        await setProductEdaWorkflow(getContainer()).run({ input: { product_id: whey.id, registration_number: "EDA-123", is_approved: true } })
        const fields = "id,brand.id,brand.name,brand.status,categories.id,categories.name,categories.handle,eda_registration.registration_number,eda_registration.is_approved"
        const { status, data } = await api.get(`/store/products/${whey.id}?fields=${fields}`, storeApi)
        expect(status).toBe(200)
        expect(data.product).toEqual(expect.objectContaining({
          brand: expect.objectContaining({ id: activeBrandId, name: "Optimum", status: "active" }),
          categories: [expect.objectContaining({ id: childId, name: "Vitamin C", handle: "vitamin-c" })],
          eda_registration: expect.objectContaining({ registration_number: "EDA-123", is_approved: true }),
        }))
        const listed = await api.get(`/store/products?id=${whey.id}&fields=${fields}`, storeApi)
        expect(listed.data.products[0].categories).toEqual([expect.objectContaining({ id: childId, name: "Vitamin C", handle: "vitamin-c" })])
      })

      it("lists every active brand, past the first 100", async () => {
        await getContainer().resolve<BrandModuleService>(BRAND_MODULE).createBrands(Array.from({ length: 101 }, (_, i) => ({ name: `Brand ${i}`, slug: `brand-${i}` })))
        const { data } = await api.get("/store/brands", storeApi)
        expect(data.brands).toHaveLength(103)
        expect(data.brands.map((b: { id: string }) => b.id)).not.toContain(inactiveBrandId)
      })
    })
  },
})
