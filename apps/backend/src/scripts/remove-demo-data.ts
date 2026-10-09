import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MathBN, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  deleteFulfillmentSetsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  deleteRegionsWorkflow,
  deleteShippingOptionsWorkflow,
  deleteStockLocationsWorkflow,
  deleteTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { STARTER_DEMO_DATA } from "../lib/egypt-store"

// Removes what Medusa's starter seed created (Europe region and taxes, the
// European warehouse with its shipping options, demo categories and products),
// matched only by the exact names in STARTER_DEMO_DATA. Run it once, by hand:
//   npx medusa exec ./src/scripts/remove-demo-data.ts
// It refuses to delete a warehouse that still holds or reserves stock, and keeps
// a demo category that real products use.

type DemoLocation = { id: string, name: string, fulfillment_sets?: { id: string, service_zones?: { id: string }[] }[] }

async function locationsToRemove(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "fulfillment_sets.id", "fulfillment_sets.service_zones.id"],
    filters: { name: [...STARTER_DEMO_DATA.stockLocationNames] },
  })
  const locations = data as DemoLocation[]
  if (!locations.length) return []
  const levels = await container.resolve(Modules.INVENTORY).listInventoryLevels({ location_id: locations.map((location) => location.id) })
  const holding = levels.filter((level) => MathBN.gt(level.stocked_quantity, 0) || MathBN.gt(level.reserved_quantity, 0))
  if (holding.length) {
    const names = locations.filter((location) => holding.some((level) => level.location_id === location.id)).map((location) => location.name)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Not removing ${names.join(", ")}: it still holds or reserves stock. Move or clear that stock first.`)
  }
  return locations
}

async function removeLocations(container: MedusaContainer, locations: DemoLocation[]) {
  if (!locations.length) return
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const sets = locations.flatMap((location) => location.fulfillment_sets ?? []).filter(Boolean)
  const zoneIds = sets.flatMap((set) => set.service_zones ?? []).filter(Boolean).map((zone) => zone.id)
  if (zoneIds.length) {
    const { data: options } = await query.graph({ entity: "shipping_option", fields: ["id"], filters: { service_zone_id: zoneIds } })
    if (options.length) await deleteShippingOptionsWorkflow(container).run({ input: { ids: options.map((option) => option.id as string) } })
  }
  if (sets.length) await deleteFulfillmentSetsWorkflow(container).run({ input: { ids: sets.map((set) => set.id) } })
  await deleteStockLocationsWorkflow(container).run({ input: { ids: locations.map((location) => location.id) } })
}

async function removeCategories(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "product_category", fields: ["id", "name", "products.id"], filters: { name: [...STARTER_DEMO_DATA.categoryNames] } })
  const categories = data as { id: string, name: string, products?: { id: string }[] }[]
  const unused = categories.filter((category) => !category.products?.length)
  for (const id of unused.map((category) => category.id)) await deleteProductCategoriesWorkflow(container).run({ input: [id] })
  return { removed: unused.map((category) => category.name), kept: categories.filter((category) => category.products?.length).map((category) => category.name) }
}

export async function removeDemoData(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  // Checked before anything is deleted, so a refusal leaves the database as it was.
  const locations = await locationsToRemove(container)
  await removeLocations(container, locations)

  const { data: regions } = await query.graph({ entity: "region", fields: ["id"], filters: { name: [...STARTER_DEMO_DATA.regionNames] } })
  if (regions.length) await deleteRegionsWorkflow(container).run({ input: { ids: regions.map((region) => region.id as string) } })

  // Country-level only; deleting one also removes its province tax regions.
  const taxRegions = (await container.resolve(Modules.TAX).listTaxRegions({ country_code: [...STARTER_DEMO_DATA.taxCountryCodes] }))
    .filter((region) => !region.parent_id)
  if (taxRegions.length) await deleteTaxRegionsWorkflow(container).run({ input: { ids: taxRegions.map((region) => region.id) } })

  const { data: products } = await query.graph({ entity: "product", fields: ["id"], filters: { handle: [...STARTER_DEMO_DATA.productHandles] } })
  if (products.length) await deleteProductsWorkflow(container).run({ input: { ids: products.map((product) => product.id as string) } })

  const categories = await removeCategories(container)
  logger.info(`Demo data removed: ${locations.length} warehouse(s), ${regions.length} region(s), ${taxRegions.length} tax region(s), ${products.length} product(s), categories [${categories.removed.join(", ")}].`
    + (categories.kept.length ? ` Kept categories still used by products: [${categories.kept.join(", ")}].` : ""))
  return { locations: locations.length, regions: regions.length, taxRegions: taxRegions.length, products: products.length, categories }
}

export default async function removeDemoDataScript({ container }: ExecArgs) {
  await removeDemoData(container)
}
