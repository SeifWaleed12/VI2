import { POST as nativeRefresh } from "@medusajs/medusa/api/auth/token/refresh/route"
import { sessionBoundResponse } from "../../../auth-session-access"

export const POST = (req: Parameters<typeof nativeRefresh>[0], res: Parameters<typeof nativeRefresh>[1]) => sessionBoundResponse(req, res, nativeRefresh, true)
