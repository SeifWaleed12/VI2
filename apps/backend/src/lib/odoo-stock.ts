// Website stock from Odoo, the rule in docs/ODOO-INTEGRATION-PLAN.md 2.3.
// Quantities are in the product's own unit, as Odoo reports them.

// An outgoing Odoo stock move from the website's warehouse. orderRef is its
// sales order's customer reference: the Medusa order id for website orders.
export type OdooMove = {
  sku: string
  quantity: number
  open: boolean
  orderRef?: string
  date?: string
}

// A Medusa reservation that holds stock for a website order.
export type WebsiteReservation = {
  sku: string
  orderId: string
  quantity: number
}

const add = (map: Map<string, number>, key: string, quantity: number) => map.set(key, (map.get(key) ?? 0) + quantity)
const orderSku = (orderId: string, sku: string) => `${orderId}\u0000${sku}`

// Units Medusa should hold as stocked at the website's location, per SKU:
// on-hand − all open outgoing demand + (per website order, the overlap of its
// Medusa reservation and the units Odoo already counts for it) − safety stock.
// Each sale is subtracted once, on whichever side holds it.
export function websiteStock(onHand: Map<string, number>, moves: OdooMove[], reservations: WebsiteReservation[], safetyStock: number): Map<string, number> {
  const demand = new Map<string, number>()
  const counted = new Map<string, number>()
  for (const move of moves) {
    if (move.open) add(demand, move.sku, move.quantity)
    if (move.orderRef) add(counted, orderSku(move.orderRef, move.sku), move.quantity)
  }
  const reserved = new Map<string, number>()
  for (const reservation of reservations) add(reserved, orderSku(reservation.orderId, reservation.sku), reservation.quantity)
  const addBack = new Map<string, number>()
  for (const [key, quantity] of reserved) add(addBack, key.split("\u0000")[1], Math.min(quantity, counted.get(key) ?? 0))

  const stock = new Map<string, number>()
  for (const sku of new Set([...onHand.keys(), ...demand.keys()])) {
    const units = (onHand.get(sku) ?? 0) - (demand.get(sku) ?? 0) + (addBack.get(sku) ?? 0) - safetyStock
    // Whole units only, and never below zero: a part unit cannot be sold.
    stock.set(sku, Math.max(0, Math.floor(units)))
  }
  return stock
}

// Customer references of Odoo deliveries still open after the given age while
// Medusa holds no stock for them. The caller keeps the ones that are Medusa
// orders: website orders fulfilled, or cancelled only in Medusa, that staff
// should validate or cancel in Odoo.
export function staleWebsiteDeliveries(moves: OdooMove[], reservations: WebsiteReservation[], now: Date, maxAgeDays = 2): string[] {
  const held = new Set(reservations.map((reservation) => reservation.orderId))
  const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000
  const stale = moves.filter((move) => move.open && move.orderRef && !held.has(move.orderRef) && move.date && Date.parse(move.date) < cutoff)
  return [...new Set(stale.map((move) => move.orderRef as string))]
}

// Reservations read before and after reading Odoo, kept at the smaller of the
// two: one released meanwhile (an order fulfilled) must not be added back,
// and one made meanwhile is not yet counted by Odoo either.
export function heldThroughout(before: WebsiteReservation[], after: WebsiteReservation[]): WebsiteReservation[] {
  const total = (list: WebsiteReservation[]) => {
    const map = new Map<string, number>()
    for (const reservation of list) add(map, orderSku(reservation.orderId, reservation.sku), reservation.quantity)
    return map
  }
  const earlier = total(before)
  return [...total(after)].flatMap(([key, quantity]) => {
    const [orderId, sku] = key.split("\u0000")
    const held = Math.min(quantity, earlier.get(key) ?? 0)
    return held > 0 ? [{ orderId, sku, quantity: held }] : []
  })
}

export type StockLevel = { inventoryItemId: string, stocked: number }

// What to write to the website's stock location. A level whose item has no
// SKU, or a SKU with no stock or moves in the Odoo warehouse, goes to 0 (fail
// closed) and is reported in zeroed. A missing level is created only for a SKU
// Odoo has.
export function levelChanges(skuByItem: Map<string, string>, levels: StockLevel[], stock: Map<string, number>) {
  const create: StockLevel[] = []
  const update: StockLevel[] = []
  const zeroed: string[] = []
  const hasLevel = new Set(levels.map((level) => level.inventoryItemId))
  for (const level of levels) {
    const sku = skuByItem.get(level.inventoryItemId)
    const stocked = sku === undefined ? undefined : stock.get(sku)
    if (stocked === level.stocked || (stocked === undefined && level.stocked === 0)) continue
    update.push({ inventoryItemId: level.inventoryItemId, stocked: stocked ?? 0 })
    if (stocked === undefined) zeroed.push(sku ?? level.inventoryItemId)
  }
  for (const [inventoryItemId, sku] of skuByItem) {
    const stocked = stock.get(sku)
    if (!hasLevel.has(inventoryItemId) && stocked !== undefined) create.push({ inventoryItemId, stocked })
  }
  return { create, update, zeroed }
}
