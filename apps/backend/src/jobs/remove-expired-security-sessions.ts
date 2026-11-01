import type { MedusaContainer } from "@medusajs/framework/types"
import { ACCOUNT_SECURITY_MODULE } from "../modules/account-security"
import type AccountSecurityService from "../modules/account-security/service"

export default async function removeExpiredSecuritySessions(container: MedusaContainer) {
  const service = container.resolve<AccountSecurityService>(ACCOUNT_SECURITY_MODULE)
  const sessions = await service.listSecuritySessions({ expires_at: { $lt: new Date() } }, { select: ["id"], take: 1000 })
  if (sessions.length) await service.deleteSecuritySessions(sessions.map(session => session.id))
}
export const config = { name: "remove-expired-security-sessions", schedule: "15 * * * *" }
