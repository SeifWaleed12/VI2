import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELETE as nativeLogout } from "@medusajs/medusa/api/auth/session/route"
import { ACCOUNT_SECURITY_MODULE } from "../../../modules/account-security"
import type AccountSecurityService from "../../../modules/account-security/service"
import { SESSION_CLAIM } from "../../../lib/security-session"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = req.session?.auth_context?.app_metadata?.[SESSION_CLAIM]
  if (typeof id === "string") {
    await req.scope.resolve<AccountSecurityService>(ACCOUNT_SECURITY_MODULE).updateSecuritySessions({ id, revoked: true })
  }
  return nativeLogout(req, res)
}
