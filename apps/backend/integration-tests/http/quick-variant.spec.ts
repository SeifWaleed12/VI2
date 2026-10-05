import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { createQuickVariantWorkflow } from "../../src/workflows/quick-variant"

jest.setTimeout(120 * 1000)

const prices = [{ amount: 10, currency_code: "egp" }]

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("quick variant workflow", () => {
      async function createProduct() {
        const { result } = await createProductsWorkflow(getContainer()).run({
          input: { products: [{ title: "Test product", options: [{ title: "Size", values: ["Large"] }], variants: [{ title: "Large", sku: "QV-LARGE", options: { Size: "Large" }, prices }] }] },
        })
        return result[0]
      }
      const run = (product_id: string, input: { option_title: string, option_value: string, sku?: string }) =>
        createQuickVariantWorkflow(getContainer()).run({ input: { product_id, prices, ...input }, throwOnError: false })
      const values = async (optionTitle: string) => {
        const service = getContainer().resolve(Modules.PRODUCT)
        const options = await service.listProductOptions({ title: optionTitle }, { relations: ["values"] })
        return options.flatMap((option) => option.values.map((value) => value.value)).sort()
      }
      const optionTitles = async () => {
        const service = getContainer().resolve(Modules.PRODUCT)
        return (await service.listProductOptions({})).map((option) => option.title).sort()
      }

      it("creates a variant on a new value of an existing option", async () => {
        const product = await createProduct()
        const { errors } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-SMALL" })
        expect(errors).toEqual([])
        expect(await values("Size")).toEqual(["Large", "Small"])
      })

      it("reuses the stored spelling of an existing option and value", async () => {
        const product = await createProduct()
        const { errors, result } = await run(product.id, { option_title: "size", option_value: "Medium", sku: "QV-MEDIUM" })
        expect(errors).toEqual([])
        expect(result[0].options?.map((option) => option.option?.title)).toEqual(["Size"])
        expect(await optionTitles()).toEqual(["Size"])
      })

      it("removes the new value it added to an existing option when the variant fails", async () => {
        const product = await createProduct()
        const { errors } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-LARGE" })
        expect(errors.length).toBeGreaterThan(0)
        expect(await values("Size")).toEqual(["Large"])
      })

      it("removes the new option it created when the variant fails", async () => {
        const product = await createProduct()
        const { errors } = await run(product.id, { option_title: "Flavor", option_value: "Vanilla", sku: "QV-LARGE" })
        expect(errors.length).toBeGreaterThan(0)
        expect(await optionTitles()).toEqual(["Size"])
      })

      it("writes nothing when the product does not exist", async () => {
        const { errors } = await run("prod_missing", { option_title: "Size", option_value: "Small" })
        expect(errors.length).toBeGreaterThan(0)
        expect(await optionTitles()).toEqual([])
      })
    })
  },
})
