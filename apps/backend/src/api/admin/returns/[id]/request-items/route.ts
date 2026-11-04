import { POST as nativePOST } from "@medusajs/medusa/api/admin/returns/[id]/request-items/route"
import { returnMutation } from "../../../../return-receipt-access"

export const POST = returnMutation(nativePOST)
