import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MathBN, MedusaError, Modules } from "@medusajs/framework/utils"
import { existingVariantStockSettings, type StockSettingsChange } from "../lib/manager-access"
import { allocationProblem, type OrderLineStock } from "../lib/order-allocation"

type Scope = AuthenticatedMedusaRequest["scope"]

// Medusa returns quantities as big-number objects; Number() would give NaN.
const toNumber = (value: unknown) => MathBN.convert(value as number).toNumber()

// Checks on a manager's request that need stored data: the request is allowed
// by area, but some payloads change stock, which Odoo owns.

// True when the request would change the stock settings of a variant that
// already exists.
async function changesStockSettings(scope: Scope, changes: StockSettingsChange[]) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "manage_inventory", "allow_backorder"],
    filters: { id: [...new Set(changes.map((change) => change.variantId))] },
  })
  const stored = new Map((data as Record<string, unknown>[]).map((variant) => [variant.id, variant]))
  // An unknown id is left to Medusa, which rejects the update itself.
  return changes.some(({ variantId, settings }) => {
    const variant = stored.get(variantId)
    return !!variant && Object.entries(settings).some(([key, value]) => variant[key] !== value)
  })
}

async function orderLineStock(scope: Scope, lineItemId: string, inventoryItemId: string): Promise<OrderLineStock | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [order] } = await query.graph({
    entity: "order",
    // The line's quantities live on its order item ("detail") in Medusa 2.21.
    fields: ["status", "items.id", "items.variant_id", "items.detail.quantity", "items.detail.fulfilled_quantity"],
    // Filtering an order by one of its lines works in Medusa's query engine but
    // is not in its generated filter types.
    filters: { items: { id: lineItemId } } as never,
  })
  const items = (order?.items ?? []) as { id: string, variant_id: string | null, detail?: { quantity: unknown, fulfilled_quantity: unknown } }[]
  const item = items.find((candidate) => candidate?.id === lineItemId)
  if (!order || !item?.detail) return null
  const { data: links } = item.variant_id
    ? await query.graph({
      entity: "product_variant_inventory_item",
      fields: ["required_quantity"],
      filters: { variant_id: item.variant_id, inventory_item_id: inventoryItemId },
    })
    : { data: [] }
  const reservations = await scope.resolve(Modules.INVENTORY).listReservationItems({ line_item_id: lineItemId, inventory_item_id: inventoryItemId })
  return {
    orderStatus: String(order.status),
    unfulfilledQuantity: toNumber(item.detail.quantity) - toNumber(item.detail.fulfilled_quantity),
    unitsPerItem: links.length ? toNumber((links[0] as { required_quantity?: unknown }).required_quantity ?? 1) : null,
    alreadyReserved: reservations.reduce((total, reservation) => total + toNumber(reservation.quantity), 0),
  }
}

function isAllocation(method: string, path: string) {
  return method === "POST" && path === "/admin/reservations"
}

// Throws when a manager's request must be refused.
export async function checkManagerRequest(scope: Scope, method: string, path: string, body: unknown) {
  if (method === "GET") return
  const stockChanges = existingVariantStockSettings(path, body)
  if (stockChanges.length && await changesStockSettings(scope, stockChanges)) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Stock settings can only be changed by an administrator")
  }
  if (isAllocation(method, path)) {
    const { line_item_id: lineItemId, inventory_item_id: inventoryItemId, quantity } = (body ?? {}) as Record<string, unknown>
    const line = typeof lineItemId === "string" && typeof inventoryItemId === "string"
      ? await orderLineStock(scope, lineItemId, inventoryItemId)
      : null
    const problem = allocationProblem(line, quantity)
    if (problem) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, problem)
  }
}
