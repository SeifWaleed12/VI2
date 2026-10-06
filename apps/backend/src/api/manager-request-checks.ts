import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { existingVariantStockSettings, type StockSettingsChange } from "../lib/manager-access"
import { allocateOrderLineStockWorkflow } from "../workflows/allocate-order-line-stock"
import { allocationSchema } from "./validators"

type Scope = AuthenticatedMedusaRequest["scope"]

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

function isAllocation(method: string, path: string) {
  return method === "POST" && path === "/admin/reservations"
}

// A manager's allocation does not reach Medusa's reservation route: it runs
// our workflow, which checks the order line's remaining need and creates the
// reservation under one lock per line. The answer has the native route's shape.
async function allocateWithinNeed(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = allocationSchema.safeParse(req.body)
  if (!parsed.success) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid allocation details.")
  const { result: [reservation] } = await allocateOrderLineStockWorkflow(req.scope).run({ input: parsed.data })
  return res.status(200).json({ reservation })
}

// Runs the checks that need stored data, then passes the request on.
export async function continueManagerRequest(req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction, path: string) {
  if (req.method === "GET") return next()
  const stockChanges = existingVariantStockSettings(path, req.body)
  if (stockChanges.length && await changesStockSettings(req.scope, stockChanges)) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Stock settings can only be changed by an administrator")
  }
  if (isAllocation(req.method, path)) return allocateWithinNeed(req, res)
  return next()
}
