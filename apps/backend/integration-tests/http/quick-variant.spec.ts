import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { createQuickVariantWorkflow, removeCreatedOptionValue } from "../../src/workflows/quick-variant"

jest.setTimeout(120 * 1000)

const prices = [{ amount: 10, currency_code: "egp" }]

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("quick variant workflow", () => {
      const productService = () => getContainer().resolve(Modules.PRODUCT)

      // Size has Large (with a variant) and, optionally, Medium (linked to the
      // product but without any variant).
      async function createProduct(title: string, sku: string, extraValues: string[] = []) {
        const { result } = await createProductsWorkflow(getContainer()).run({
          input: { products: [{ title, options: [{ title: "Size", values: ["Large", ...extraValues] }], variants: [{ title: "Large", sku, options: { Size: "Large" }, prices }] }] },
        })
        return result[0]
      }
      const run = (product_id: string, input: { option_title: string, option_value: string, sku?: string }) =>
        createQuickVariantWorkflow(getContainer()).run({ input: { product_id, prices, ...input }, throwOnError: false })
      const failureMessage = (errors: { error: { message?: string } }[]) => errors.map((entry) => entry.error?.message).join(" | ")
      const globalValues = async (optionTitle: string) => {
        const options = await productService().listProductOptions({ title: optionTitle }, { relations: ["values"] })
        return options.flatMap((option) => option.values.map((value) => value.value)).sort()
      }
      const optionTitles = async () => (await productService().listProductOptions({})).map((option) => option.title).sort()

      it("creates a variant on a new value of an existing option", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        const { errors } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-SMALL" })
        expect(errors).toEqual([])
        expect(await globalValues("Size")).toEqual(["Large", "Small"])
      })

      it("reuses an existing value and its stored spelling instead of creating another", async () => {
        const product = await createProduct("Product", "QV-LARGE", ["Medium"])
        const [medium] = await productService().listProductOptionValues({ value: "Medium" })
        const { errors, result } = await run(product.id, { option_title: "size", option_value: "MEDIUM", sku: "QV-MEDIUM" })
        expect(errors).toEqual([])
        expect(result[0].title).toBe("Medium")
        expect(await globalValues("Size")).toEqual(["Large", "Medium"])
        const [stillThere] = await productService().listProductOptionValues({ value: "Medium" })
        expect(stillThere.id).toBe(medium.id)
      })

      it("keeps a pre-existing value when the variant for it fails", async () => {
        const product = await createProduct("Product", "QV-LARGE", ["Medium"])
        const { errors } = await run(product.id, { option_title: "Size", option_value: "Medium", sku: "QV-LARGE" })
        expect(failureMessage(errors)).toMatch(/QV-LARGE/)
        expect(await globalValues("Size")).toEqual(["Large", "Medium"])
      })

      it("keeps a global value that exists but is not linked to the product when the variant fails", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        const [option] = await productService().listProductOptions({ title: "Size" }, { relations: ["values"] })
        await productService().updateProductOptions(option.id, { values: ["Large", "Small"] })
        expect(await globalValues("Size")).toEqual(["Large", "Small"])

        const { errors } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-LARGE" })
        expect(failureMessage(errors)).toMatch(/QV-LARGE/)
        expect(await globalValues("Size")).toEqual(["Large", "Small"])
      })

      it("removes the new value it added to an existing option when the variant fails", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        const { errors } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-LARGE" })
        expect(failureMessage(errors)).toMatch(/QV-LARGE/)
        expect(await globalValues("Size")).toEqual(["Large"])
      })

      it("accepts the same value again after a failed attempt removed it", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-LARGE" })
        const { errors } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-SMALL" })
        expect(errors).toEqual([])
        expect(await globalValues("Size")).toEqual(["Large", "Small"])
      })

      it("removes the new option it created when the variant that needs it is rejected", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        const { errors } = await run(product.id, { option_title: "Flavor", option_value: "Vanilla", sku: "QV-FLAVOR" })
        expect(errors.length).toBeGreaterThan(0)
        expect(await optionTitles()).toEqual(["Size"])
      })

      it("never strips the option from a variant that exists when a stale cleanup runs", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        const { errors, result } = await run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-SMALL" })
        expect(errors).toEqual([])
        const [option] = await productService().listProductOptions({ title: "Size" })

        // A snapshot that does not list Small makes it look created by this request.
        await removeCreatedOptionValue(productService(), { option_id: option.id, value: "Small", existing_ids: [] })

        const variant = await productService().retrieveProductVariant(result[0].id, { relations: ["options"] })
        expect(variant.options.map((value) => value.value)).toEqual(["Small"])
        expect(await globalValues("Size")).toEqual(["Large", "Small"])
      })

      it("keeps the successful variant when a failing request for the same new value runs at the same time", async () => {
        const product = await createProduct("Product", "QV-LARGE")
        const [failing, succeeding] = await Promise.all([
          run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-LARGE" }),
          run(product.id, { option_title: "Size", option_value: "Small", sku: "QV-SMALL" }),
        ])
        expect(failureMessage(failing.errors)).toMatch(/QV-LARGE/)
        expect(succeeding.errors).toEqual([])
        const variants = await productService().listProductVariants({ product_id: product.id }, { relations: ["options"] })
        const small = variants.find((variant) => variant.sku === "QV-SMALL")
        expect(small?.options.map((value) => value.value)).toEqual(["Small"])
        expect(await globalValues("Size")).toEqual(["Large", "Small"])
      })

      it("writes nothing when the product does not exist", async () => {
        const { errors } = await run("prod_missing", { option_title: "Size", option_value: "Small" })
        expect(failureMessage(errors)).toMatch(/not found/i)
        expect(await optionTitles()).toEqual([])
      })
    })
  },
})
