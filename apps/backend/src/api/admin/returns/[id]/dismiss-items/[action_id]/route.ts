import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELETE as nativeDELETE, POST as nativePOST } from "@medusajs/medusa/api/admin/returns/[id]/dismiss-items/[action_id]/route"
import { withReturnMutation } from "../../../../../return-receipt-access"

export const DELETE = (req: AuthenticatedMedusaRequest, res: MedusaResponse) => withReturnMutation(req, res, nativeDELETE as never)
export const POST = (req: AuthenticatedMedusaRequest, res: MedusaResponse) => withReturnMutation(req, res, nativePOST as never)
