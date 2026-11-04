import { DELETE as nativeDELETE, POST as nativePOST } from "@medusajs/medusa/api/admin/returns/[id]/request-items/[action_id]/route"
import { returnMutation } from "../../../../../return-receipt-access"

export const DELETE = returnMutation(nativeDELETE)
export const POST = returnMutation(nativePOST)
