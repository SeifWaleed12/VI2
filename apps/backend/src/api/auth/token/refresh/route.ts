import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POST as nativeRefresh } from "@medusajs/medusa/api/auth/token/refresh/route"
import { sessionBoundResponse } from "../../../auth-session-access"

export const POST = (req: MedusaRequest, res: MedusaResponse) => sessionBoundResponse(req, res, nativeRefresh as never, true)
