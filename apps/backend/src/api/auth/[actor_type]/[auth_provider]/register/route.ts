import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POST as nativeRegister } from "@medusajs/medusa/api/auth/[actor_type]/[auth_provider]/register/route"
import { sessionBoundResponse } from "../../../../auth-session-access"

// Staff invite acceptance refreshes its actorless registration token after
// linking the user. It needs a device session through that transition too.
export const POST = (req: MedusaRequest, res: MedusaResponse) => sessionBoundResponse(req, res, nativeRegister)
