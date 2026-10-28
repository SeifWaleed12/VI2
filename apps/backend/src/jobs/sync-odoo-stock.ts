import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MathBN, MedusaError, Modules } from "@medusajs/framework/utils"
import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows"
import { EGYPT_STORE } from "../lib/egypt-store"
import { heldThroughout, levelChanges, staleWebsiteDeliveries, websiteStock, type WebsiteReservation } from "../lib/odoo-stock"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService, { OdooError } from "../modules/odoo/service"

// Medusa returns quantities as big-number objects; Number() would give NaN.
const toNumber = (value: unknown) => MathBN.convert(value as number).toNumber()

// Reservations at the location that hold stock for order lines, by SKU.
async function orderReservations(container: MedusaContainer, locationId: string, skuByItem: Map<string, string>): Promise<WebsiteReservation[]> {
  const reservations = await container.resolve(Modules.INVENTORY).listReservationItems({ location_id: locationId })
  const lineIds = [...new Set(reservations.map((reservation) => reservation.line_item_id).filter((id): id is string => Boolean(id)))]
  if (!lineIds.length) return []
  const { data: orders } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["id", "items.id"],
    // Filtering an order by its lines works in Medusa's query engine but is
    // not in its generated filter types (as in allocate-order-line-stock).
    filters: { items: { id: lineIds } } as never,
  })
  const orderByLine = new Map(orders.flatMap((order) => ((order.items ?? []) as { id: string }[]).map((item) => [item.id, order.id as string])))
  return reservations.flatMap((reservation) => {
    const orderId = reservation.line_item_id ? orderByLine.get(reservation.line_item_id) : undefined
    const sku = skuByItem.get(reservation.inventory_item_id)
    return orderId && sku ? [{ orderId, sku, quantity: toNumber(reservation.quantity) }] : []
  })
}

// Sets the website's stock (Cairo Warehouse) from the Odoo warehouse, by the
// rule in docs/ODOO-INTEGRATION-PLAN.md 2.3. Odoo unreachable or refusing:
// Medusa's stock is left as it is and the failure logged.
// shortcut: Medusa can fulfil an order (releasing its reservation) between the
// second reservation read and the write, adding its units back until the next
// run a minute later; take a lock shared with fulfilment if that ever matters.
export async function syncOdooStock(container: MedusaContainer, now = new Date()) {
  if (!container.hasRegistration(ODOO_MODULE)) return
  const odoo = container.resolve<OdooModuleService>(ODOO_MODULE)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { warehouseId, safetyStock } = odoo.stockSettings
  if (!warehouseId) return logger.warn("Odoo stock sync skipped: set ODOO_WAREHOUSE_ID.")

  const [location] = await container.resolve(Modules.STOCK_LOCATION).listStockLocations({ name: EGYPT_STORE.warehouse.name })
  if (!location) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Stock location "${EGYPT_STORE.warehouse.name}" not found; run setup-egypt-store.ts.`)
  const inventory = container.resolve(Modules.INVENTORY)
  const items = await inventory.listInventoryItems({}, { select: ["id", "sku"] })
  const skuByItem = new Map(items.filter((item) => item.sku).map((item) => [item.id, item.sku as string]))

  const before = await orderReservations(container, location.id, skuByItem)
  let odooStock
  try {
    odooStock = await odoo.readWarehouseStock(warehouseId, [...new Set(before.map((reservation) => reservation.orderId))])
  } catch (error) {
    if (!(error instanceof OdooError)) throw error
    return logger.warn(`Odoo stock sync failed (${error.category}); website stock unchanged: ${error.message}`)
  }
  const reservations = heldThroughout(before, await orderReservations(container, location.id, skuByItem))

  const stock = websiteStock(odooStock.onHand, odooStock.moves, reservations, safetyStock)
  const levels = await inventory.listInventoryLevels({ location_id: location.id })
  const changes = levelChanges(skuByItem, levels.map((level) => ({ inventoryItemId: level.inventory_item_id, stocked: toNumber(level.stocked_quantity) })), stock)
  const toInput = ({ inventoryItemId, stocked }: { inventoryItemId: string, stocked: number }) => ({ inventory_item_id: inventoryItemId, location_id: location.id, stocked_quantity: stocked })
  if (changes.create.length || changes.update.length) {
    await batchInventoryItemLevelsWorkflow(container).run({ input: { create: changes.create.map(toInput), update: changes.update.map(toInput) } })
    logger.info(`Odoo stock sync: ${changes.update.length} updated, ${changes.create.length} created at ${location.name}`)
  }
  if (changes.zeroed.length) logger.warn(`Odoo stock sync set to 0 (no SKU, or no stock or moves in the Odoo warehouse): ${changes.zeroed.join(", ")}`)

  // Once an hour, so a forgotten delivery is reported without flooding the log.
  if (now.getUTCMinutes() !== 0) return
  const stale = staleWebsiteDeliveries(odooStock.moves, reservations, now)
  if (!stale.length) return
  const { data: orders } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "order", fields: ["id"], filters: { id: stale } })
  if (orders.length) logger.warn(`Odoo deliveries open for more than 2 days with no Medusa stock held; validate or cancel them in Odoo: ${orders.map((order) => order.id).join(", ")}`)
}

export default async function syncOdooStockJob(container: MedusaContainer) {
  let entered = false
  await container.resolve(Modules.LOCKING).execute("job:sync-odoo-stock", () => {
    entered = true
    return syncOdooStock(container)
  }, { timeout: 1, expire: 120 }).catch((error: unknown) => {
    // Another worker is already running this minute's sync.
    if (!entered && error instanceof MedusaError && error.type === MedusaError.Types.CONFLICT && error.message === "Timed-out acquiring lock.") return
    throw error
  })
}

export const config = {
  name: "sync-odoo-stock",
  schedule: "* * * * *",
}
