import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POST as nativePOST } from "@medusajs/medusa/api/admin/returns/[id]/cancel/route"
import { withReturnMutation } from "../../../../return-receipt-access"

export const POST = (req: AuthenticatedMedusaRequest, res: MedusaResponse) => withReturnMutation(req, res, nativePOST as never)
