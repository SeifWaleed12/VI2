// A manager may hold stock for an order line ("Allocate items" in the
// dashboard), but never more than the line needs, so allocation cannot be used
// to change available stock by hand. Owner decision, 2026-10-06.

export type OrderLineStock = {
  orderStatus: string
  // Items on the line not yet fulfilled. Fulfilment uses up the line's
  // reservations, so only these can still need stock held.
  unfulfilledQuantity: number
  // Stock units one sold item uses (Medusa's required_quantity; 1 unless the
  // product is a bundle), or null when the stock item is not the line's product.
  unitsPerItem: number | null
  alreadyReserved: number
}

// Returns why the allocation is refused, or null when it is allowed.
export function allocationProblem(line: OrderLineStock | null, requested: unknown): string | null {
  if (typeof requested !== "number" || !Number.isFinite(requested) || requested <= 0) return "Allocate a positive quantity."
  if (!line) return "Stock can only be allocated to a line of an existing order."
  if (line.orderStatus === "canceled") return "This order is canceled."
  if (line.unitsPerItem === null) return "This stock item is not part of the ordered product."
  const remaining = line.unfulfilledQuantity * line.unitsPerItem - line.alreadyReserved
  // Fail closed: a number that could not be read must never allow stock out.
  if (!Number.isFinite(remaining)) return "The order line's stock could not be checked."
  if (requested > remaining) return `At most ${Math.max(remaining, 0)} more can be allocated to this order line.`
  return null
}
