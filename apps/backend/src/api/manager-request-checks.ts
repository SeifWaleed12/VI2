import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { allocateOrderLineStockWorkflow } from "../workflows/allocate-order-line-stock"
import { allocationSchema } from "./validators"

function isAllocation(method: string, path: string) {
  return method === "POST" && path.toLowerCase() === "/admin/reservations"
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

// Catalog stock settings are manager-editable; order allocation still uses
// the workflow's stored order-line budget.
export async function continueManagerRequest(req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction, path: string) {
  if (req.method === "GET") return next()
  if (isAllocation(req.method, path)) return allocateWithinNeed(req, res)
  return next()
}
