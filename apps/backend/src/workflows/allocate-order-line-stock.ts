import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MathBN, MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, createReservationsWorkflow, releaseLockStep } from "@medusajs/medusa/core-flows"
import { allocationProblem, type OrderLineStock } from "../lib/order-allocation"

export type AllocateOrderLineStockInput = {
  line_item_id: string
  inventory_item_id: string
  location_id: string
  quantity: number
  description?: string | null
  metadata?: Record<string, unknown> | null
}

// Medusa returns quantities as big-number objects; Number() would give NaN.
const toNumber = (value: unknown) => MathBN.convert(value as number).toNumber()

async function orderLineStock(container: MedusaContainer, lineItemId: string, inventoryItemId: string): Promise<OrderLineStock | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
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
  const reservations = await container.resolve(Modules.INVENTORY).listReservationItems({ line_item_id: lineItemId, inventory_item_id: inventoryItemId })
  return {
    orderStatus: String(order.status),
    unfulfilledQuantity: toNumber(item.detail.quantity) - toNumber(item.detail.fulfilled_quantity),
    unitsPerItem: links.length ? toNumber((links[0] as { required_quantity?: unknown }).required_quantity ?? 1) : null,
    alreadyReserved: reservations.reduce((total, reservation) => total + toNumber(reservation.quantity), 0),
  }
}

const checkOrderLineNeedStep = createStep(
  "check-order-line-need",
  async (input: AllocateOrderLineStockInput, { container }) => {
    const line = await orderLineStock(container, input.line_item_id, input.inventory_item_id)
    const problem = allocationProblem(line, input.quantity)
    if (problem) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, problem)
    return new StepResponse(undefined)
  }
)

export const orderLineAllocationLockKey = (lineItemId: string) => `order-line-allocation:${lineItemId}`

// Seconds. Allocations for the same line wait for each other; the lock expires
// on its own only if a process dies while holding it. Checking and writing take
// milliseconds, far inside the expiry.
const LOCK_WAIT_SECONDS = 10
const LOCK_EXPIRE_SECONDS = 120

// Checks that an order line still needs the stock and creates the reservation
// as one step per line. The lock belongs to the workflow, not to the HTTP
// request: a client that disconnects does not release it before the
// reservation is written, and a failed step releases it through compensation.
export const allocateOrderLineStockWorkflow = createWorkflow(
  "allocate-order-line-stock",
  (input: AllocateOrderLineStockInput) => {
    const lockKey = transform({ input }, ({ input }) => orderLineAllocationLockKey(input.line_item_id))
    acquireLockStep({ key: lockKey, timeout: LOCK_WAIT_SECONDS, ttl: LOCK_EXPIRE_SECONDS })
    checkOrderLineNeedStep(input)
    const reservationInput = transform({ input }, ({ input }) => ({ reservations: [input] }))
    const reservations = createReservationsWorkflow.runAsStep({ input: reservationInput })
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(reservations)
  }
)
