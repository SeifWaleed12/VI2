import { dirname, join } from "path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow, createUsersWorkflow } from "@medusajs/medusa/core-flows"
import setupCatalogManager from "../../src/scripts/setup-catalog-manager"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { BRAND_MODULE } from "../../src/modules/brand"
import type BrandModuleService from "../../src/modules/brand/service"
import { EDA_MODULE } from "../../src/modules/eda"
import type EdaModuleService from "../../src/modules/eda/service"

const medusaDist = dirname(require.resolve("@medusajs/medusa"))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createSuperAdminRole = require(join(medusaDist, "migration-scripts", "create-super-admin-role")).default

jest.setTimeout(240 * 1000)

const password = "test-password-123"
const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` }, validateStatus: () => true })
type Session = ReturnType<typeof bearer>

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("New product (Vi2) page: POST /admin/vi2-products", () => {
      let admin: Session
      let manager: Session
      let nobody: Session
      let brandId: string
      let categoryId: string
      let flavor: { id: string, values: Record<string, string> }
      let size: { id: string, values: Record<string, string> }

      async function staff(email: string) {
        const container = getContainer()
        const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email }] } })
        const auth = container.resolve(Modules.AUTH)
        const { authIdentity } = await auth.register("emailpass", { body: { email, password } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        return user
      }
      const login = async (email: string) => bearer((await api.post("/auth/user/emailpass", { email, password })).data.token)
      const query = () => getContainer().resolve(ContainerRegistrationKeys.QUERY)
      const brands = () => getContainer().resolve<BrandModuleService>(BRAND_MODULE)

      beforeEach(async () => {
        const container = getContainer()
        await container.resolve(Modules.CACHE).invalidate("login-attempts:*")
        await setupEgyptStore(container)
        const adminUser = await staff("admin@test.dev")
        await createSuperAdminRole({ container })
        await setupCatalogManager({ container, args: [adminUser.id] } as never)
        await (container.resolve(Modules.RBAC) as unknown as { syncRegisteredPolicies(): Promise<void> }).syncRegisteredPolicies()
        const managerUser = await staff("manager@test.dev")
        const [role] = await container.resolve(Modules.RBAC).listRbacRoles({ name: "Catalog Manager" })
        await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.USER]: { user_id: managerUser.id }, [Modules.RBAC]: { rbac_role_id: role.id } })
        await staff("nobody@test.dev")
        admin = await login("admin@test.dev")
        manager = await login("manager@test.dev")
        nobody = await login("nobody@test.dev")
        brandId = (await brands().createBrands({ name: "Optimum", slug: "optimum", status: "active" })).id
        categoryId = (await container.resolve(Modules.PRODUCT).createProductCategories({ name: "Protein", handle: "protein", is_active: true })).id
        const shared = await container.resolve(Modules.PRODUCT).createProductOptions([
          { title: "Flavor", values: ["Chocolate", "Vanilla"], is_exclusive: false },
          { title: "Size", values: ["1 kg", "2.27 kg"], is_exclusive: false },
        ])
        ;[flavor, size] = shared.map((option) => ({ id: option.id, values: Object.fromEntries(option.values.map((value) => [value.value, value.id])) }))
      })

      const flavorValues = async () => {
        const [option] = await getContainer().resolve(Modules.PRODUCT).listProductOptions({ id: flavor.id }, { relations: ["values"] })
        return option.values.map((value) => value.value).sort()
      }

      const body = (overrides: Record<string, unknown> = {}) => ({
        title: "Whey Test",
        subtitle: "Isolate",
        description: "Test product",
        category_ids: [categoryId],
        status: "published",
        weight: 2270,
        discountable: true,
        brand_id: brandId,
        eda: { registration_number: "EDA-123", is_approved: true },
        images: ["http://localhost:9000/static/front.png", "http://localhost:9000/static/back.png"],
        options: [
          { id: flavor.id, value_ids: [flavor.values.Chocolate, flavor.values.Vanilla] } as { id: string, value_ids: string[], new_values?: string[] },
          { id: size.id, value_ids: [size.values["1 kg"], size.values["2.27 kg"]] },
        ],
        variants: [
          { options: { Flavor: "Chocolate", Size: "1 kg" }, sku: "WH-CH-1", barcode: "6221000000011", price: 1500 },
          { options: { Flavor: "Chocolate", Size: "2.27 kg" }, sku: "WH-CH-2", barcode: "6221000000012", price: 3000 },
          { options: { Flavor: "Vanilla", Size: "1 kg" }, sku: "WH-VA-1", price: 1500 },
          { options: { Flavor: "Vanilla", Size: "2.27 kg" }, sku: "WH-VA-2", price: 3000.5 },
        ],
        ...overrides,
      })
      const create = (session: Session, payload: unknown = body()) => api.post("/admin/vi2-products", payload, session)

      async function product(id: string) {
        const { data: [found] } = await query().graph({
          entity: "product",
          fields: ["id", "title", "subtitle", "status", "options.id", "weight", "discountable", "thumbnail", "images.url", "categories.id", "sales_channels.id", "shipping_profile.id",
            "brand.id", "eda_registration.registration_number", "eda_registration.is_approved",
            "variants.sku", "variants.barcode", "variants.title", "variants.manage_inventory", "variants.allow_backorder",
            "variants.prices.amount", "variants.prices.currency_code", "variants.inventory_items.inventory.id"],
          filters: { id },
        })
        return found as Record<string, any>
      }

      // Nothing is left behind: no product, variant, brand link, EDA record or new option value.
      async function expectNothingCreated() {
        const { data: products } = await query().graph({ entity: "product", fields: ["id"], filters: { title: "Whey Test" } })
        expect(products).toEqual([])
        const { data: variants } = await query().graph({ entity: "product_variant", fields: ["id"], filters: { sku: ["WH-CH-2", "WH-VA-1", "WH-VA-2"] } })
        expect(variants).toEqual([])
        const { data: [brand] } = await query().graph({ entity: "brand", fields: ["products.id"], filters: { id: brandId } })
        expect((brand as { products?: unknown[] }).products ?? []).toEqual([])
        expect(await getContainer().resolve<EdaModuleService>(EDA_MODULE).listEdaRegistrations()).toEqual([])
        expect(await flavorValues()).toEqual(["Chocolate", "Vanilla"])
      }

      it("lets an admin create the whole product in one save", async () => {
        const response = await create(admin)
        expect(response.status).toBe(201)
        const saved = await product(response.data.product.id)
        const { data: [store] } = await query().graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { data: [profile] } = await query().graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })

        expect(saved).toEqual(expect.objectContaining({
          title: "Whey Test", subtitle: "Isolate", status: "published", weight: 2270, discountable: true, thumbnail: "http://localhost:9000/static/front.png",
          categories: [expect.objectContaining({ id: categoryId })],
          sales_channels: [expect.objectContaining({ id: store.default_sales_channel_id })],
          shipping_profile: expect.objectContaining({ id: profile.id }),
          brand: expect.objectContaining({ id: brandId }),
          eda_registration: expect.objectContaining({ registration_number: "EDA-123", is_approved: true }),
        }))
        expect(saved.images.map((image: { url: string }) => image.url).sort()).toEqual(["http://localhost:9000/static/back.png", "http://localhost:9000/static/front.png"])
        const variants = [...saved.variants].sort((a, b) => a.sku.localeCompare(b.sku))
        expect(variants.map((variant) => [variant.sku, variant.barcode, variant.title, variant.prices.map((price: { amount: number, currency_code: string }) => [price.amount, price.currency_code])])).toEqual([
          ["WH-CH-1", "6221000000011", "Chocolate / 1 kg", [[1500, "egp"]]],
          ["WH-CH-2", "6221000000012", "Chocolate / 2.27 kg", [[3000, "egp"]]],
          ["WH-VA-1", null, "Vanilla / 1 kg", [[1500, "egp"]]],
          ["WH-VA-2", null, "Vanilla / 2.27 kg", [[3000.5, "egp"]]],
        ])
        // Stock is tracked from zero and never oversold; nothing is stocked here.
        for (const variant of variants) {
          expect(variant).toEqual(expect.objectContaining({ manage_inventory: true, allow_backorder: false }))
        }
        const { data: levels } = await query().graph({ entity: "inventory_level", fields: ["stocked_quantity"], filters: { inventory_item_id: variants.flatMap((variant) => variant.inventory_items.map((item: { inventory: { id: string } }) => item.inventory.id)) } })
        expect(levels).toEqual([])
        // The product uses the shared options; it gets no option of its own.
        expect(saved.options.map((option: { id: string }) => option.id).sort()).toEqual([flavor.id, size.id].sort())
      })

      it("lets a manager create it too, adding a new flavor", async () => {
        const payload = body()
        payload.options[0].new_values = ["Mango"]
        payload.variants.push({ options: { Flavor: "Mango", Size: "1 kg" }, sku: "WH-MA-1", price: 1500 })
        const response = await create(manager, payload)
        expect(response.status).toBe(201)
        expect((await product(response.data.product.id)).variants).toHaveLength(5)
        expect(await flavorValues()).toEqual(["Chocolate", "Mango", "Vanilla"])
      })

      it("adds new flavors to the shared option and reuses one that only differs in case", async () => {
        const response = await create(admin, body({
          options: [{ id: flavor.id, value_ids: [flavor.values.Chocolate], new_values: ["Mango", "vanilla"] }],
          variants: [
            { options: { Flavor: "Chocolate" }, sku: "WH-CH-1", price: 1500 },
            { options: { Flavor: "Mango" }, sku: "WH-MA-1", price: 1500 },
            { options: { Flavor: "vanilla" }, sku: "WH-VA-1", price: 1500 },
          ],
        }))
        expect(response.status).toBe(201)
        expect(await flavorValues()).toEqual(["Chocolate", "Mango", "Vanilla"])
        const saved = await product(response.data.product.id)
        expect(saved.variants.map((variant: { title: string }) => variant.title).sort()).toEqual(["Chocolate", "Mango", "Vanilla"])
      })

      it("refuses another product's own option and a value from a different option", async () => {
        const { result: [other] } = await createProductsWorkflow(getContainer()).run({
          input: { products: [{ title: "Other", options: [{ title: "Color", values: ["Red"] }], variants: [{ title: "Red", sku: "OT-1", options: { Color: "Red" }, prices: [{ amount: 100, currency_code: "egp" }] }] }] },
        })
        const { data: [withOptions] } = await query().graph({ entity: "product", fields: ["options.id", "options.values.id"], filters: { id: other.id } })
        const own = withOptions.options[0] as { id: string, values: { id: string }[] }
        const exclusive = await create(admin, body({ options: [{ id: own.id, value_ids: [own.values[0].id] }], variants: [{ options: { Color: "Red" }, sku: "WH-RD-1", price: 1 }] }))
        expect(exclusive.status).toBe(400)
        expect(exclusive.data.message).toBe("Choose a shared option from Products > Options")
        const mixed = await create(admin, body({ options: [{ id: flavor.id, value_ids: [size.values["1 kg"]], new_values: ["Mango"] }], variants: [{ options: { Flavor: "Mango" }, sku: "WH-MA-1", price: 1 }] }))
        expect(mixed.status).toBe(400)
        expect(mixed.data.message).toBe("Choose Flavor values from its list")
        await expectNothingCreated()
      })

      it("refuses a variant with an extra or a missing option, before adding new values", async () => {
        const options = [{ id: flavor.id, value_ids: [], new_values: ["Mango"] }, body().options[1]]
        for (const variantOptions of [{ Flavor: "Mango", Size: "1 kg", Color: "Red" }, { Flavor: "Mango" }]) {
          const response = await create(admin, body({ options, variants: [{ options: variantOptions, sku: "WH-MA-1", price: 1 }] }))
          expect(response.status).toBe(400)
          expect(response.data.message).toBe("Give each variant one value for each option: Flavor, Size")
        }
        await expectNothingCreated()
      })

      it("creates a product with only the required fields", async () => {
        const response = await create(admin, {
          title: "Whey Test", status: "draft", discountable: false,
          options: [{ id: size.id, value_ids: [size.values["1 kg"]] }],
          variants: [{ options: { Size: "1 kg" }, sku: "WH-ONLY-1", price: 900 }],
        })
        expect(response.status).toBe(201)
        const saved = await product(response.data.product.id)
        expect(saved).toEqual(expect.objectContaining({ status: "draft", discountable: false }))
        expect(saved.brand ?? null).toBeNull()
        expect(saved.eda_registration ?? null).toBeNull()
      })

      it("refuses a SKU the store already has, before creating anything", async () => {
        await createProductsWorkflow(getContainer()).run({
          input: { products: [{ title: "Existing", options: [{ title: "Size", values: ["1kg"] }], variants: [{ title: "1kg", sku: "WH-CH-1", options: { Size: "1kg" }, prices: [{ amount: 100, currency_code: "egp" }] }] }] },
        })
        const response = await create(admin)
        expect(response.status).toBe(400)
        expect(response.data.message).toBe("SKU WH-CH-1 already exists")
        await expectNothingCreated()
      })

      it("refuses the same SKU twice in one form, naming the row", async () => {
        const payload = body()
        payload.variants[1].sku = "WH-CH-1"
        const response = await create(admin, payload)
        expect(response.status).toBe(400)
        expect(response.data.errors).toEqual({ "variants.1.sku": "SKU WH-CH-1 is used twice in this form" })
      })

      it("names the field for a missing name and a zero price", async () => {
        const payload = body({ title: "" })
        payload.variants[2].price = 0
        const response = await create(admin, payload)
        expect(response.status).toBe(400)
        expect(response.data.errors).toEqual({ title: "Enter a title", "variants.2.price": "Price must be more than 0" })
      })

      it.each([
        ["inactive", async () => (await getContainer().resolve<BrandModuleService>(BRAND_MODULE).createBrands({ name: "Old", slug: "old", status: "inactive" })).id],
        ["unknown", async () => "brand_missing"],
      ])("refuses an %s brand and creates nothing", async (_name, brand) => {
        const response = await create(admin, body({ brand_id: await brand() }))
        expect(response.status).toBe(400)
        expect(response.data.message).toBe("Choose an active brand")
        await expectNothingCreated()
      })

      it("refuses inventory items and stock settings from admins and managers", async () => {
        const linked = body()
        linked.variants[0] = { ...linked.variants[0], inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 1 }] } as never
        const stock = body()
        stock.variants[0] = { ...stock.variants[0], manage_inventory: false, inventory_quantity: 10 } as never
        expect((await create(admin, linked)).status).toBe(400)
        expect((await create(admin, stock)).status).toBe(400)
        expect((await create(manager, linked)).status).toBe(403)
        expect((await create(manager, stock)).status).toBe(400)
        await expectNothingCreated()
      })

      it("denies a staff user without a role", async () => {
        expect((await create(nobody)).status).toBe(403)
        await expectNothingCreated()
      })

      it("removes everything, including a new flavor, when a late step fails", async () => {
        const eda = getContainer().resolve<EdaModuleService>(EDA_MODULE)
        const spy = jest.spyOn(eda, "createEdaRegistrations").mockRejectedValueOnce(new Error("EDA store down"))
        const payload = body()
        payload.options[0].new_values = ["Mango"]
        payload.variants.push({ options: { Flavor: "Mango", Size: "1 kg" }, sku: "WH-MA-1", price: 1500 })
        try {
          expect((await create(admin, payload)).status).toBe(500)
        } finally {
          spy.mockRestore()
        }
        await expectNothingCreated()
      })

      it("shows the product with its brand and EDA registration in the store API", async () => {
        const id = (await create(admin)).data.product.id
        const { data: [key] } = await query().graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
        const response = await api.get(`/store/products?fields=id,title,brand.name,eda_registration.registration_number,eda_registration.is_approved`, {
          headers: { "x-publishable-api-key": key.token as string }, validateStatus: () => true,
        })
        expect(response.status).toBe(200)
        expect(response.data.products).toEqual([expect.objectContaining({
          id, title: "Whey Test",
          brand: expect.objectContaining({ name: "Optimum" }),
          eda_registration: expect.objectContaining({ registration_number: "EDA-123", is_approved: true }),
        })])
      })
    })
  },
})
