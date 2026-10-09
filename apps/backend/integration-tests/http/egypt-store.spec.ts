import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createInventoryItemsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { removeDemoData } from "../../src/scripts/remove-demo-data"

jest.setTimeout(240 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("Egypt store setup", () => {
      const query = () => getContainer().resolve(ContainerRegistrationKeys.QUERY)
      const graph = async (entity: string, fields: string[], filters?: Record<string, unknown>) =>
        (await query().graph({ entity, fields, filters } as never)).data as Record<string, any>[]

      async function stockLocation(name: string, countryCode: string, stocked = 0) {
        const container = getContainer()
        const { result: [location] } = await createStockLocationsWorkflow(container).run({ input: { locations: [{ name, address: { address_1: "", city: "", country_code: countryCode } }] } })
        if (stocked) {
          await createInventoryItemsWorkflow(container).run({ input: { items: [{ sku: `SKU-${name}`, location_levels: [{ location_id: location.id, stocked_quantity: stocked }] }] } })
        }
        return location
      }

      it("sets up a new database as an Egypt store, and running it again changes nothing", async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        await setupEgyptStore(container)

        const [store] = await graph("store", ["supported_currencies.currency_code", "supported_currencies.is_default", "default_region_id", "default_location_id", "default_sales_channel_id"])
        expect(store.supported_currencies).toEqual([expect.objectContaining({ currency_code: "egp", is_default: true })])
        const regions = await graph("region", ["id", "name", "currency_code", "countries.iso_2"])
        expect(regions).toEqual([expect.objectContaining({ id: store.default_region_id, name: "Egypt", currency_code: "egp", countries: [expect.objectContaining({ iso_2: "eg" })] })])
        expect((await container.resolve(Modules.TAX).listTaxRegions({ country_code: "eg" })).filter((region) => !region.parent_id)).toHaveLength(1)

        const locations = await graph("stock_location", ["id", "name", "address.city", "address.country_code", "sales_channels.id", "fulfillment_providers.id"])
        expect(locations).toEqual([expect.objectContaining({ id: store.default_location_id, name: "Cairo Warehouse", address: expect.objectContaining({ city: "Cairo", country_code: "EG" }) })])
        expect(locations[0].sales_channels.map((channel: { id: string }) => channel.id)).toEqual([store.default_sales_channel_id])
        expect(locations[0].fulfillment_providers.map((provider: { id: string }) => provider.id)).toEqual(["manual_manual"])

        const options = await graph("shipping_option", ["name", "price_type", "prices.amount", "prices.currency_code"])
        expect(options).toEqual([expect.objectContaining({ name: "Standard Delivery", price_type: "flat", prices: [expect.objectContaining({ amount: 70, currency_code: "egp" })] })])
        // Prices include tax for both the Egypt region and EGP (VAT rate still open).
        const preferences = await graph("price_preference", ["attribute", "value", "is_tax_inclusive"])
        expect(preferences).toEqual(expect.arrayContaining([
          expect.objectContaining({ attribute: "region_id", value: store.default_region_id, is_tax_inclusive: true }),
          expect.objectContaining({ attribute: "currency_code", value: "egp", is_tax_inclusive: true }),
        ]))
        // Medusa's default store starts with EUR; its leftover preference is
        // unused once EGP is the only currency.
        expect(preferences.filter((preference) => preference.value === "egp" || preference.value === store.default_region_id)).toHaveLength(2)
        const keys = await graph("api_key", ["sales_channels.id"], { type: "publishable" })
        expect(keys).toHaveLength(1)
        expect(keys[0].sales_channels.map((channel: { id: string }) => channel.id)).toEqual([store.default_sales_channel_id])
      })

      it("offers a customer with an Egyptian address one delivery option at 70 EGP", async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        const [store] = await graph("store", ["default_region_id", "default_sales_channel_id"])
        const [profile] = await graph("shipping_profile", ["id"], { type: "default" })
        const [key] = await graph("api_key", ["token"], { type: "publishable" })
        const { result: [product] } = await createProductsWorkflow(container).run({
          input: { products: [{ title: "Whey", status: "published", shipping_profile_id: profile.id, sales_channels: [{ id: store.default_sales_channel_id }], options: [{ title: "Size", values: ["1kg"] }], variants: [{ title: "1kg", options: { Size: "1kg" }, manage_inventory: false, prices: [{ amount: 1500, currency_code: "egp" }] }] }] },
        })
        const storeApi = { headers: { "x-publishable-api-key": key.token } }
        const { data: { cart } } = await api.post("/store/carts", {
          region_id: store.default_region_id,
          shipping_address: { first_name: "Sara", last_name: "Ali", address_1: "Tahrir Square", city: "Cairo", province: "Cairo", country_code: "eg", phone: "01000000000" },
        }, storeApi)
        await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: product.variants[0].id, quantity: 1 }, storeApi)
        const { data } = await api.get(`/store/shipping-options?cart_id=${cart.id}`, storeApi)
        expect(data.shipping_options).toEqual([expect.objectContaining({ name: "Standard Delivery", amount: 70 })])
      })

      it("adopts the existing Egyptian warehouse and keeps its stock", async () => {
        const container = getContainer()
        const existing = await stockLocation("warehouse", "eg", 25)
        await setupEgyptStore(container)
        const locations = await graph("stock_location", ["id", "name"])
        expect(locations).toEqual([expect.objectContaining({ id: existing.id, name: "Cairo Warehouse" })])
        const [level] = await container.resolve(Modules.INVENTORY).listInventoryLevels({ location_id: existing.id })
        expect(level.stocked_quantity).toBe(25)
      })

      it("stops instead of guessing when several unnamed locations are in Egypt", async () => {
        await stockLocation("north", "eg")
        await stockLocation("south", "eg")
        await expect(setupEgyptStore(getContainer())).rejects.toThrow("Several stock locations are in Egypt")
        expect(await graph("shipping_option", ["id"])).toEqual([])
      })

      async function starterDemo(europeanStock = 0) {
        const container = getContainer()
        await createRegionsWorkflow(container).run({ input: { regions: [{ name: "Europe", currency_code: "eur", countries: ["gb", "de"] }] } })
        await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "gb", provider_id: "tp_system" }, { country_code: "de", provider_id: "tp_system" }] })
        const european = await stockLocation("European Warehouse", "dk", europeanStock)
        await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.STOCK_LOCATION]: { stock_location_id: european.id }, [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" } })
        await createLocationFulfillmentSetWorkflow(container).run({ input: { location_id: european.id, fulfillment_set_data: { name: "European Warehouse delivery", type: "shipping" } } })
        const [location] = await graph("stock_location", ["fulfillment_sets.id"], { id: european.id })
        const { result: [zone] } = await createServiceZonesWorkflow(container).run({ input: { data: [{ fulfillment_set_id: location.fulfillment_sets[0].id, name: "Europe", geo_zones: [{ type: "country", country_code: "gb" }] }] } })
        const [profile] = await graph("shipping_profile", ["id"], { type: "default" })
        await createShippingOptionsWorkflow(container).run({ input: [{ name: "Standard Shipping", price_type: "flat", provider_id: "manual_manual", service_zone_id: zone.id, shipping_profile_id: profile.id, type: { label: "Standard", description: "", code: "standard" }, prices: [{ currency_code: "eur", amount: 10 }] }] })
        const { result: categories } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name: "Merch", is_active: true }, { name: "Shirts", is_active: true }] } })
        await createProductsWorkflow(container).run({ input: { products: [{ title: "Real product", category_ids: [categories[1].id], options: [{ title: "Size", values: ["One"] }], variants: [{ title: "One", options: { Size: "One" }, prices: [{ amount: 100, currency_code: "egp" }] }] }] } })
      }

      it("removes the starter demo data but keeps real data and the Egypt setup", async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        await starterDemo()
        await removeDemoData(container)

        expect((await graph("region", ["name"])).map((region) => region.name)).toEqual(["Egypt"])
        expect((await container.resolve(Modules.TAX).listTaxRegions({})).map((region) => region.country_code)).toEqual(["eg"])
        expect((await graph("stock_location", ["name"])).map((location) => location.name)).toEqual(["Cairo Warehouse"])
        expect((await graph("shipping_option", ["name"])).map((option) => option.name)).toEqual(["Standard Delivery"])
        expect((await graph("product_category", ["name"])).map((category) => category.name)).toEqual(["Shirts"])
        expect(await graph("product", ["title"])).toEqual([expect.objectContaining({ title: "Real product" })])
      })

      it("refuses to remove a demo warehouse that still holds stock, and deletes nothing", async () => {
        const container = getContainer()
        await setupEgyptStore(container)
        await starterDemo(5)
        await expect(removeDemoData(container)).rejects.toThrow("still holds or reserves stock")
        expect((await graph("region", ["name"])).map((region) => region.name).sort()).toEqual(["Egypt", "Europe"])
        expect((await graph("stock_location", ["name"])).map((location) => location.name).sort()).toEqual(["Cairo Warehouse", "European Warehouse"])
      })
    })
  },
})
