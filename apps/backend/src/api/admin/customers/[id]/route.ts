import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { DELETE as nativeDelete } from "@medusajs/medusa/api/admin/customers/[id]/route"
import { withCredentialLock } from "../../../../lib/credential-lock"
import { migrateEmailChangeMarker } from "../../../../lib/email-change-marker"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const identities = await req.scope.resolve(Modules.AUTH).listAuthIdentities({ app_metadata: { customer_id: req.params.id } })
  const identity = identities[0]
  if (!identity) return nativeDelete(req, res)
  return withCredentialLock(req.scope, identity.id, async () => {
    await migrateEmailChangeMarker(req.scope, identity.id)
    return nativeDelete(req, res)
  })
}
