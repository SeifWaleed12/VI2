import { heldThroughout, levelChanges, staleWebsiteDeliveries, websiteStock, type OdooMove, type StockLevel, type WebsiteReservation } from "../odoo-stock"

// The plan's table (docs/ODOO-INTEGRATION-PLAN.md 2.3): on-hand H = 10, other
// channels' open demand o = 2, safety stock s = 1, website order A for w = 3.
// Website availability is stocked minus Medusa's reservations and must be
// H - o - s - w = 4 at every stage until the order is cancelled.
const other: OdooMove = { sku: "WHEY", quantity: 2, open: true }
const reservedA: WebsiteReservation = { sku: "WHEY", orderId: "order_A", quantity: 3 }

function available(onHand: number, moves: OdooMove[], reservations: WebsiteReservation[]) {
  const stocked = websiteStock(new Map([["WHEY", onHand]]), moves, reservations, 1).get("WHEY") as number
  return stocked - reservations.reduce((total, reservation) => total + reservation.quantity, 0)
}

it.each([
  ["placed, not yet in Odoo", 10, [other], [reservedA]],
  ["card unpaid, draft quotation in Odoo (no moves yet)", 10, [other], [reservedA]],
  ["confirmed in Odoo, not fulfilled", 10, [other, { sku: "WHEY", quantity: 3, open: true, orderRef: "order_A" }], [reservedA]],
  ["fulfilled in Medusa, Odoo delivery not validated", 10, [other, { sku: "WHEY", quantity: 3, open: true, orderRef: "order_A" }], []],
  ["Odoo delivered 1 of 3, Medusa not fulfilled", 9, [other, { sku: "WHEY", quantity: 2, open: true, orderRef: "order_A" }, { sku: "WHEY", quantity: 1, open: false, orderRef: "order_A" }], [reservedA]],
  ["Odoo delivered all, Medusa not fulfilled yet", 7, [other, { sku: "WHEY", quantity: 3, open: false, orderRef: "order_A" }], [reservedA]],
  ["delivered in both", 7, [other], []],
  ["cancelled in Odoo, still reserved in Medusa", 10, [other], [reservedA]],
] as [string, number, OdooMove[], WebsiteReservation[]][])("holds the order's units exactly once: %s", (_stage, onHand, moves, reservations) => {
  expect(available(onHand, moves, reservations)).toBe(4)
})

it("frees the units once the order is cancelled in both systems", () => {
  expect(available(10, [other], [])).toBe(7)
})

it("adds back only up to what Odoo counts for that order", () => {
  // Medusa reserves 3, Odoo has only 1 on the order so far: 1 overlaps.
  const stock = websiteStock(new Map([["WHEY", 10]]), [{ sku: "WHEY", quantity: 1, open: true, orderRef: "order_A" }], [reservedA], 0)
  expect(stock.get("WHEY")).toBe(10)
})

it("keeps orders and SKUs apart", () => {
  const stock = websiteStock(
    new Map([["WHEY", 10], ["CREA", 5]]),
    [{ sku: "WHEY", quantity: 2, open: true, orderRef: "order_B" }, { sku: "CREA", quantity: 1, open: true, orderRef: "order_A" }],
    [reservedA, { sku: "CREA", orderId: "order_A", quantity: 1 }],
    0,
  )
  // Order A's WHEY reservation has no Odoo moves for WHEY, so nothing is added back for it.
  expect(stock.get("WHEY")).toBe(8)
  expect(stock.get("CREA")).toBe(5)
})

it("never goes below zero and counts whole units only", () => {
  const stock = websiteStock(new Map([["WHEY", 1], ["CREA", 2.5]]), [{ sku: "WHEY", quantity: 3, open: true }, { sku: "BCAA", quantity: 1, open: true }], [], 0)
  expect(stock).toEqual(new Map([["WHEY", 0], ["CREA", 2], ["BCAA", 0]]))
  expect(websiteStock(new Map([["WHEY", 2]]), [], [], 5).get("WHEY")).toBe(0)
})

it("lists deliveries that stayed open without a Medusa reservation", () => {
  const now = new Date("2026-10-28T12:00:00Z")
  const moves: OdooMove[] = [
    { sku: "WHEY", quantity: 1, open: true, orderRef: "order_old", date: "2026-10-25T12:00:00Z" },
    { sku: "CREA", quantity: 1, open: true, orderRef: "order_old", date: "2026-10-25T12:00:00Z" },
    { sku: "WHEY", quantity: 1, open: true, orderRef: "order_recent", date: "2026-10-27T12:00:00Z" },
    { sku: "WHEY", quantity: 1, open: true, orderRef: "order_held", date: "2026-10-20T12:00:00Z" },
    { sku: "WHEY", quantity: 1, open: false, orderRef: "order_done", date: "2026-10-20T12:00:00Z" },
    { sku: "WHEY", quantity: 1, open: true, date: "2026-10-20T12:00:00Z" },
  ]
  expect(staleWebsiteDeliveries(moves, [{ sku: "WHEY", orderId: "order_held", quantity: 1 }], now)).toEqual(["order_old"])
})

it("keeps a reservation only as far as it was held both before and after reading Odoo", () => {
  const before: WebsiteReservation[] = [reservedA, { sku: "CREA", orderId: "order_B", quantity: 2 }, { sku: "WHEY", orderId: "order_C", quantity: 1 }]
  const after: WebsiteReservation[] = [{ sku: "WHEY", orderId: "order_A", quantity: 1 }, { sku: "WHEY", orderId: "order_A", quantity: 1 }, { sku: "WHEY", orderId: "order_D", quantity: 4 }, { sku: "WHEY", orderId: "order_C", quantity: 1 }]
  // A partly fulfilled meanwhile (3 -> 2), B fulfilled, C unchanged, D new.
  expect(heldThroughout(before, after)).toEqual([{ orderId: "order_A", sku: "WHEY", quantity: 2 }, { orderId: "order_C", sku: "WHEY", quantity: 1 }])
})

it("writes only changed levels, creates missing ones Odoo has, and zeroes the rest", () => {
  const skuByItem = new Map([["iitem_whey", "WHEY"], ["iitem_crea", "CREA"], ["iitem_gone", "GONE"], ["iitem_new", "BCAA"], ["iitem_none", "NONE"]])
  const levels: StockLevel[] = [
    { inventoryItemId: "iitem_whey", stocked: 5 },
    { inventoryItemId: "iitem_crea", stocked: 3 },
    { inventoryItemId: "iitem_gone", stocked: 2 },
    { inventoryItemId: "iitem_zero", stocked: 0 },
    { inventoryItemId: "iitem_nosku", stocked: 4 },
  ]
  const stock = new Map([["WHEY", 5], ["CREA", 7], ["BCAA", 0]])
  expect(levelChanges(skuByItem, levels, stock)).toEqual({
    create: [{ inventoryItemId: "iitem_new", stocked: 0 }],
    update: [
      { inventoryItemId: "iitem_crea", stocked: 7 },
      { inventoryItemId: "iitem_gone", stocked: 0 },
      { inventoryItemId: "iitem_nosku", stocked: 0 },
    ],
    zeroed: ["GONE", "iitem_nosku"],
  })
})
