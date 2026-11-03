import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCOUNT_SECURITY_MODULE } from "../../../modules/account-security"
import type AccountSecurityService from "../../../modules/account-security/service"
import { requireSecuritySession } from "../../../lib/security-session"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const session = await requireSecuritySession(req.scope, req.auth_context)
  await req.scope.resolve<AccountSecurityService>(ACCOUNT_SECURITY_MODULE).updateSecuritySessions({ id: session.id, revoked: true })
  return res.json({ success: true })
}
