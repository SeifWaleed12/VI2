import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POST as nativeUpdate } from "@medusajs/medusa/api/auth/[actor_type]/[auth_provider]/update/route"
import { withCredentialLock } from "../../../../../lib/credential-lock"

export const POST = (req: AuthenticatedMedusaRequest, res: MedusaResponse) =>
  withCredentialLock(req.scope, req.auth_context.auth_identity_id, () => nativeUpdate(req, res))
