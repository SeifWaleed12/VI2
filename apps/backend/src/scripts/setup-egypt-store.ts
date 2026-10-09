import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createLocationFulfillmentSetWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
  updateStockLocationsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { EGYPT_STORE } from "../lib/egypt-store"

// Applies src/lib/egypt-store.ts. Every step finds what exists and only creates
// or corrects what is missing, so it is safe to run on a new database (the
// initial-data-seed migration script calls it) and on an existing one:
//   npx medusa exec ./src/scripts/setup-egypt-store.ts
// It never deletes anything; src/scripts/remove-demo-data.ts does that.

function queryOf(container: MedusaContainer) {
  return container.resolve(ContainerRegistrationKeys.QUERY)
}

async function ensureDefaultSalesChannel(container: MedusaContainer, storeChannelId: string | null) {
  if (storeChannelId) return storeChannelId
  const { data } = await queryOf(container).graph({ entity: "sales_channel", fields: ["id"], filters: { name: "Default Sales Channel" } })
  if (data[0]) return data[0].id as string
  const { result: [channel] } = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: "Default Sales Channel" }] } })
  return channel.id
}

// Adopts the region that already sells in EGP to Egypt, so its id (which the
// storefront's NEXT_PUBLIC_MEDUSA_REGION_ID points to) does not change.
async function ensureRegion(container: MedusaContainer) {
  const { data } = await queryOf(container).graph({ entity: "region", fields: ["id", "name", "currency_code", "countries.iso_2"] })
  const regions = data as { id: string, name: string, currency_code: string, countries?: { iso_2: string }[] }[]
  const existing = regions.find((region) => region.countries?.some((country) => country?.iso_2 === EGYPT_STORE.countryCode))
  if (existing) {
    if (existing.currency_code !== EGYPT_STORE.currencyCode) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Region ${existing.name} sells to Egypt in ${existing.currency_code}; change it to EGP in the admin first.`)
    }
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: existing.id }, update: { name: EGYPT_STORE.regionName, is_tax_inclusive: EGYPT_STORE.pricesIncludeTax } },
    })
    return existing.id
  }
  const { result: [region] } = await createRegionsWorkflow(container).run({
    input: { regions: [{ name: EGYPT_STORE.regionName, currency_code: EGYPT_STORE.currencyCode, countries: [EGYPT_STORE.countryCode], payment_providers: [...EGYPT_STORE.paymentProviders], is_tax_inclusive: EGYPT_STORE.pricesIncludeTax }] },
  })
  return region.id
}

// No tax rate is set: Egyptian VAT on these products is an open business decision.
async function ensureTaxRegion(container: MedusaContainer) {
  // Country-level only; a province tax region has a parent.
  const existing = await container.resolve(Modules.TAX).listTaxRegions({ country_code: EGYPT_STORE.countryCode })
  if (existing.some((region) => !region.parent_id)) return
  await createTaxRegionsWorkflow(container).run({ input: [{ country_code: EGYPT_STORE.countryCode, provider_id: EGYPT_STORE.taxProvider }] })
}

type Location = {
  id: string
  name: string
  address?: { country_code?: string | null } | null
  sales_channels?: { id: string }[]
  fulfillment_providers?: { id: string }[]
  fulfillment_sets?: { id: string, type: string, service_zones?: ServiceZone[] }[]
}

type ServiceZone = { id: string, name: string, geo_zones?: { type: string, country_code: string }[] }

async function listLocations(container: MedusaContainer) {
  const { data } = await queryOf(container).graph({
    entity: "stock_location",
    fields: ["id", "name", "address.country_code", "sales_channels.id", "fulfillment_providers.id", "fulfillment_sets.id", "fulfillment_sets.type", "fulfillment_sets.service_zones.id", "fulfillment_sets.service_zones.name", "fulfillment_sets.service_zones.geo_zones.type", "fulfillment_sets.service_zones.geo_zones.country_code"],
  })
  return data as Location[]
}

// Uses the Cairo warehouse if it exists, otherwise the one stock location in
// Egypt (keeping its stock), otherwise creates it. Two unnamed Egyptian
// locations are ambiguous, so the script stops rather than guess.
async function ensureWarehouse(container: MedusaContainer) {
  const locations = await listLocations(container)
  const named = locations.find((location) => location.name === EGYPT_STORE.warehouse.name)
  const inEgypt = locations.filter((location) => location.address?.country_code?.toLowerCase() === EGYPT_STORE.countryCode)
  if (!named && inEgypt.length > 1) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Several stock locations are in Egypt (${inEgypt.map((location) => location.name).join(", ")}); rename the warehouse to "${EGYPT_STORE.warehouse.name}" in the admin and run again.`)
  }
  const adopted = named ?? inEgypt[0]
  if (adopted) {
    await updateStockLocationsWorkflow(container).run({
      input: { selector: { id: adopted.id }, update: { name: EGYPT_STORE.warehouse.name, address: { ...EGYPT_STORE.warehouse.address } } },
    })
    return adopted.id
  }
  const { result: [created] } = await createStockLocationsWorkflow(container).run({
    input: { locations: [{ name: EGYPT_STORE.warehouse.name, address: { ...EGYPT_STORE.warehouse.address } }] },
  })
  return created.id
}

async function ensureWarehouseLinks(container: MedusaContainer, locationId: string, salesChannelId: string) {
  const location = (await listLocations(container)).find((candidate) => candidate.id === locationId)!
  if (!location.fulfillment_providers?.some((provider) => provider?.id === EGYPT_STORE.fulfillmentProvider)) {
    await container.resolve(ContainerRegistrationKeys.LINK).create({
      [Modules.STOCK_LOCATION]: { stock_location_id: locationId },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: EGYPT_STORE.fulfillmentProvider },
    })
  }
  if (!location.sales_channels?.some((channel) => channel?.id === salesChannelId)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: locationId, add: [salesChannelId] } })
  }
}

async function ensureServiceZone(container: MedusaContainer, locationId: string) {
  const find = async () => {
    const location = (await listLocations(container)).find((candidate) => candidate.id === locationId)!
    const set = location.fulfillment_sets?.find((candidate) => candidate?.type === "shipping")
    return { set, zone: set?.service_zones?.find((candidate) => candidate?.name === EGYPT_STORE.serviceZoneName) }
  }
  let { set, zone } = await find()
  if (!set) {
    await createLocationFulfillmentSetWorkflow(container).run({ input: { location_id: locationId, fulfillment_set_data: { name: EGYPT_STORE.fulfillmentSetName, type: "shipping" } } })
    set = (await find()).set!
  }
  if (!zone) {
    await createServiceZonesWorkflow(container).run({
      input: { data: [{ fulfillment_set_id: set.id, name: EGYPT_STORE.serviceZoneName, geo_zones: [{ type: "country", country_code: EGYPT_STORE.countryCode }] }] },
    })
    zone = (await find()).zone!
  }
  assertCoversOnlyEgypt(zone)
  return zone.id
}

// An existing zone is trusted by its name only if it covers exactly Egypt;
// otherwise the delivery option would be offered elsewhere, or not in Egypt.
// The setup stops rather than change a zone someone configured.
function assertCoversOnlyEgypt(zone: ServiceZone) {
  const geoZones = (zone.geo_zones ?? []).filter(Boolean)
  const onlyEgypt = geoZones.length === 1 && geoZones[0].type === "country" && geoZones[0].country_code?.toLowerCase() === EGYPT_STORE.countryCode
  if (!onlyEgypt) {
    const covers = geoZones.map((geoZone) => `${geoZone.type} ${geoZone.country_code}`).join(", ") || "nothing"
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `The "${zone.name}" delivery zone covers ${covers}, not exactly Egypt. Fix it in the admin (Settings > Locations) and run again.`)
  }
}

async function ensureShippingProfile(container: MedusaContainer) {
  const { data } = await queryOf(container).graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })
  if (data[0]) return data[0].id as string
  const { result: [profile] } = await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: "Default Shipping Profile", type: "default" }] } })
  return profile.id
}

async function ensureShippingOption(container: MedusaContainer, serviceZoneId: string, shippingProfileId: string) {
  const { data } = await queryOf(container).graph({ entity: "shipping_option", fields: ["id"], filters: { service_zone_id: serviceZoneId, name: EGYPT_STORE.shippingOption.name } })
  if (data.length) return
  const option = EGYPT_STORE.shippingOption
  await createShippingOptionsWorkflow(container).run({
    input: [{
      name: option.name,
      price_type: "flat",
      provider_id: EGYPT_STORE.fulfillmentProvider,
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      type: { ...option.type },
      prices: [{ currency_code: EGYPT_STORE.currencyCode, amount: option.amount }],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    }],
  })
}

// The storefront needs a publishable key that sees the store's sales channel.
// An existing linked key (whichever the storefront uses) is left as it is.
async function ensurePublishableKey(container: MedusaContainer, salesChannelId: string) {
  const { data } = await queryOf(container).graph({ entity: "api_key", fields: ["id", "sales_channels.id"], filters: { type: "publishable" } })
  const keys = data as { id: string, sales_channels?: { id: string }[] }[]
  if (keys.some((key) => key.sales_channels?.some((channel) => channel?.id === salesChannelId))) return
  const { result: [key] } = await createApiKeysWorkflow(container).run({ input: { api_keys: [{ title: EGYPT_STORE.publishableKeyTitle, type: "publishable", created_by: "" }] } })
  await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [salesChannelId] } })
}

export async function setupEgyptStore(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: stores } = await queryOf(container).graph({ entity: "store", fields: ["id", "default_sales_channel_id"] })
  const store = stores[0] as { id: string, default_sales_channel_id: string | null } | undefined
  if (!store) throw new MedusaError(MedusaError.Types.NOT_FOUND, "No store exists; run the database migrations first.")
  const salesChannelId = await ensureDefaultSalesChannel(container, store.default_sales_channel_id)
  const regionId = await ensureRegion(container)
  await ensureTaxRegion(container)
  const locationId = await ensureWarehouse(container)
  await ensureWarehouseLinks(container, locationId, salesChannelId)
  const serviceZoneId = await ensureServiceZone(container, locationId)
  await ensureShippingOption(container, serviceZoneId, await ensureShippingProfile(container))
  await ensurePublishableKey(container, salesChannelId)
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: EGYPT_STORE.currencyCode, is_default: true, is_tax_inclusive: EGYPT_STORE.pricesIncludeTax }],
        default_sales_channel_id: salesChannelId,
        default_region_id: regionId,
        default_location_id: locationId,
      },
    },
  })
  logger.info(`Egypt store ready: region ${regionId}, warehouse ${locationId}, "${EGYPT_STORE.shippingOption.name}" at ${EGYPT_STORE.shippingOption.amount} EGP.`)
}

export default async function setupEgyptStoreScript({ container }: ExecArgs) {
  await setupEgyptStore(container)
}
