import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GET as nativeLogin } from "@medusajs/medusa/api/auth/[actor_type]/[auth_provider]/route"
import { sessionBoundResponse } from "../../../auth-session-access"

export const GET = (req: MedusaRequest, res: MedusaResponse) => sessionBoundResponse(req, res, nativeLogin)
export const POST = GET
