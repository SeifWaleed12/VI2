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
      })

      const body = (overrides: Record<string, unknown> = {}) => ({
        title: "Whey Test",
        title_ar: "واي تجربة",
        description: "Test product",
        category_ids: [categoryId],
        status: "published",
        weight: 2270,
        discountable: true,
        brand_id: brandId,
        eda: { registration_number: "EDA-123", is_approved: true },
        images: ["http://localhost:9000/static/front.png", "http://localhost:9000/static/back.png"],
        options: [{ title: "Flavor", values: ["Chocolate", "Vanilla"] }, { title: "Size", values: ["1 kg", "2.27 kg"] }],
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
          fields: ["id", "title", "status", "weight", "discountable", "thumbnail", "images.url", "categories.id", "sales_channels.id", "shipping_profile.id",
            "brand.id", "eda_registration.registration_number", "eda_registration.is_approved",
            "variants.sku", "variants.barcode", "variants.title", "variants.manage_inventory", "variants.allow_backorder",
            "variants.prices.amount", "variants.prices.currency_code", "variants.inventory_items.inventory.id"],
          filters: { id },
        })
        return found as Record<string, any>
      }

      // Nothing is left behind: no product, variant, brand link, EDA record or translation.
      async function expectNothingCreated() {
        const { data: products } = await query().graph({ entity: "product", fields: ["id"], filters: { title: "Whey Test" } })
        expect(products).toEqual([])
        const { data: variants } = await query().graph({ entity: "product_variant", fields: ["id"], filters: { sku: ["WH-CH-2", "WH-VA-1", "WH-VA-2"] } })
        expect(variants).toEqual([])
        const { data: [brand] } = await query().graph({ entity: "brand", fields: ["products.id"], filters: { id: brandId } })
        expect((brand as { products?: unknown[] }).products ?? []).toEqual([])
        expect(await getContainer().resolve<EdaModuleService>(EDA_MODULE).listEdaRegistrations()).toEqual([])
        expect(await getContainer().resolve(Modules.TRANSLATION).listTranslations({ reference: "product" })).toEqual([])
      }

      it("lets an admin create the whole product in one save", async () => {
        const response = await create(admin)
        expect(response.status).toBe(201)
        const saved = await product(response.data.product.id)
        const { data: [store] } = await query().graph({ entity: "store", fields: ["default_sales_channel_id"] })
        const { data: [profile] } = await query().graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })

        expect(saved).toEqual(expect.objectContaining({
          title: "Whey Test", status: "published", weight: 2270, discountable: true, thumbnail: "http://localhost:9000/static/front.png",
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
        const translations = await getContainer().resolve(Modules.TRANSLATION).listTranslations({ reference: "product", reference_id: saved.id })
        expect(translations).toEqual([expect.objectContaining({ locale_code: "ar-EG", translations: { title: "واي تجربة" } })])
      })

      it("lets a manager create it too", async () => {
        const response = await create(manager)
        expect(response.status).toBe(201)
        expect((await product(response.data.product.id)).variants).toHaveLength(4)
      })

      it("creates a product with only the required fields", async () => {
        const response = await create(admin, {
          title: "Whey Test", status: "draft", discountable: false,
          options: [{ title: "Size", values: ["1 kg"] }],
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
        expect(response.data.errors).toEqual({ title: "Enter the English name", "variants.2.price": "Price must be more than 0" })
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

      it("removes everything when a late step fails", async () => {
        const translation = getContainer().resolve(Modules.TRANSLATION)
        const spy = jest.spyOn(translation, "createTranslations").mockRejectedValueOnce(new Error("translation store down"))
        try {
          expect((await create(admin)).status).toBe(500)
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
