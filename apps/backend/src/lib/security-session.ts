import { createHmac, randomUUID } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, generateJwtToken, MedusaError, Modules } from "@medusajs/framework/utils"
import { getAuthContextFromJwtToken } from "@medusajs/framework/http"
import { ACCOUNT_SECURITY_MODULE } from "../modules/account-security"
import type AccountSecurityService from "../modules/account-security/service"

export const SESSION_CLAIM = "vi2_session_id"
export const CREDENTIAL_CLAIM = "vi2_credential_stamp"
export const credentialStamp = (passwordHash: string, secret: string) => createHmac("sha256", secret).update(`credential:${passwordHash}`).digest("hex")
const unauthorized = () => new MedusaError(MedusaError.Types.UNAUTHORIZED, "Your session expired. Sign in again.")

export async function currentCredential(container: MedusaContainer, identityId: string, context?: SessionContext) {
  const auth = container.resolve(Modules.AUTH)
  const [provider] = await auth.listProviderIdentities({ auth_identity_id: identityId, provider: "emailpass" }, { relations: ["auth_identity"] })
  const password = provider?.provider_metadata?.password
  if (typeof password !== "string") throw unauthorized()
  if (context?.actor_id && context.actor_type && provider.auth_identity?.app_metadata?.[`${context.actor_type}_id`] !== context.actor_id) throw unauthorized()
  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  return credentialStamp(password, http.jwtSecret as string)
}

export type SessionContext = { auth_identity_id: string, actor_id?: string, actor_type?: string, app_metadata?: Record<string, unknown> }
export async function requireSecuritySession(container: MedusaContainer, context: SessionContext) {
  const id = context.app_metadata?.[SESSION_CLAIM]
  if (typeof id !== "string") throw unauthorized()
  const service = container.resolve<AccountSecurityService>(ACCOUNT_SECURITY_MODULE)
  const [session] = await service.listSecuritySessions({ id })
  if (!session || session.revoked || session.auth_identity_id !== context.auth_identity_id || new Date(session.expires_at).getTime() <= Date.now()) throw unauthorized()
  if (session.credential_stamp !== await currentCredential(container, context.auth_identity_id, context)) throw unauthorized()
  return session
}

// Native authentication creates a device session; refresh keeps its original
// credential snapshot so it cannot revive access after password recovery.
export async function bindSecuritySession(container: MedusaContainer, token: string, existing?: SessionContext, expectedCredential?: string) {
  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const context = getAuthContextFromJwtToken(`Bearer ${token}`, http.jwtSecret!, ["bearer"], ["*"], http.jwtPublicKey, http.jwtVerifyOptions ?? http.jwtOptions) as (SessionContext & { exp?: number, iat?: number }) | null
  if (!context || typeof context.exp !== "number") throw unauthorized()
  const service = container.resolve<AccountSecurityService>(ACCOUNT_SECURITY_MODULE)
  let id: string
  if (existing) {
    if (existing.auth_identity_id !== context.auth_identity_id) throw unauthorized()
    const session = await requireSecuritySession(container, existing)
    id = session.id
    await service.updateSecuritySessions({ id, expires_at: new Date(context.exp * 1000) })
  } else {
    const stamp = await currentCredential(container, context.auth_identity_id, context)
    const snapshot = expectedCredential ?? context.app_metadata?.[CREDENTIAL_CLAIM]
    if (typeof snapshot !== "string" || stamp !== snapshot) throw unauthorized()
    id = randomUUID()
    await service.createSecuritySessions({ id, auth_identity_id: context.auth_identity_id, credential_stamp: stamp, expires_at: new Date(context.exp * 1000) })
  }
  const { exp, ...claims } = context
  const issuedAt = context.iat ?? Math.floor(Date.now() / 1000)
  const options = Object.fromEntries(Object.entries(http.jwtOptions ?? {}).filter(([key]) => !["expiresIn", "issuer", "audience", "subject", "jwtid", "notBefore"].includes(key)))
  return generateJwtToken({ ...claims, iat: issuedAt, app_metadata: { ...claims.app_metadata, [SESSION_CLAIM]: id } }, { secret: http.jwtSecret, expiresIn: exp - issuedAt, jwtOptions: options })
}
