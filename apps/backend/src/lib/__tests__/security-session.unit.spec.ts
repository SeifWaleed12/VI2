import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { getAuthContextFromJwtToken } from "@medusajs/framework/http"
import { bindSecuritySession, CREDENTIAL_CLAIM, credentialStamp, requireSecuritySession, SESSION_CLAIM } from "../security-session"
import { ACCOUNT_SECURITY_MODULE } from "../../modules/account-security"

const secret = "unit-test-session-secret"
function fixture() {
  let hash = "dummy-hash-before-recovery"
  const records = new Map<string, Record<string, unknown>>()
  const service = {
    listSecuritySessions: jest.fn(async ({ id }) => records.has(id) ? [records.get(id)] : []),
    createSecuritySessions: jest.fn(async value => { records.set(value.id, value); return value }),
    updateSecuritySessions: jest.fn(async value => { Object.assign(records.get(value.id)!, value) }),
  }
  const container = { resolve: key => key === ContainerRegistrationKeys.CONFIG_MODULE ? { projectConfig: { http: { jwtSecret: secret } } }
    : key === ACCOUNT_SECURITY_MODULE ? service : key === Modules.AUTH ? { listProviderIdentities: async () => [{ provider_metadata: { password: hash }, auth_identity: { app_metadata: { customer_id: "cus_1" } } }] } : undefined } as never
  const decode = (token: string) => getAuthContextFromJwtToken(`Bearer ${token}`, secret, ["bearer"], ["*"])! as NonNullable<ReturnType<typeof getAuthContextFromJwtToken>> & { exp: number }
  const nativeToken = () => generateJwtToken({ auth_identity_id: "auth_1", actor_id: "cus_1", actor_type: "customer", app_metadata: { customer_id: "cus_1", [CREDENTIAL_CLAIM]: credentialStamp(hash, secret) } }, { secret, expiresIn: 3600 })
  return { container, records, service, decode, nativeToken, recover: () => { hash = "dummy-hash-after-recovery" } }
}

it("preserves native claims and expiry when binding a device", async () => {
  const f = fixture(), native = f.nativeToken()
  const context = f.decode(await bindSecuritySession(f.container, native))
  expect(context.actor_id).toBe("cus_1")
  expect(context.exp).toBe(f.decode(native).exp)
  expect(await requireSecuritySession(f.container, context)).toEqual(expect.objectContaining({ auth_identity_id: "auth_1" }))
})
it("rejects earlier sessions and refresh after password recovery", async () => {
  const f = fixture()
  const old = f.decode(await bindSecuritySession(f.container, f.nativeToken()))
  f.recover()
  await expect(requireSecuritySession(f.container, old)).rejects.toThrow("session expired")
  await expect(bindSecuritySession(f.container, f.nativeToken(), old)).rejects.toThrow("session expired")
  const fresh = f.decode(await bindSecuritySession(f.container, f.nativeToken()))
  await expect(requireSecuritySession(f.container, fresh)).resolves.toBeDefined()
})
it("revokes one device including its refresh chain while preserving another", async () => {
  const f = fixture()
  const first = f.decode(await bindSecuritySession(f.container, f.nativeToken()))
  const second = f.decode(await bindSecuritySession(f.container, f.nativeToken()))
  const refreshed = f.decode(await bindSecuritySession(f.container, f.nativeToken(), first))
  expect(refreshed.app_metadata[SESSION_CLAIM]).toBe(first.app_metadata[SESSION_CLAIM])
  f.records.get(first.app_metadata[SESSION_CLAIM] as string)!.revoked = true
  await expect(requireSecuritySession(f.container, refreshed)).rejects.toThrow("session expired")
  await expect(requireSecuritySession(f.container, second)).resolves.toBeDefined()
})
it("refuses legacy tokens, wrong identity, expired sessions and a racing password change", async () => {
  const f = fixture()
  await expect(requireSecuritySession(f.container, f.decode(f.nativeToken()))).rejects.toThrow("session expired")
  const context = f.decode(await bindSecuritySession(f.container, f.nativeToken()))
  await expect(requireSecuritySession(f.container, { ...context, auth_identity_id: "auth_other" })).rejects.toThrow("session expired")
  f.records.get(context.app_metadata[SESSION_CLAIM] as string)!.expires_at = new Date(0)
  await expect(requireSecuritySession(f.container, context)).rejects.toThrow("session expired")
  const previous = credentialStamp("dummy-hash-before-recovery", secret)
  f.recover()
  await expect(bindSecuritySession(f.container, f.nativeToken(), undefined, previous)).rejects.toThrow("session expired")
})

it("refuses to bind a login or registration token issued against a previous credential", async () => {
  const f = fixture(), pending = f.nativeToken()
  f.recover()
  await expect(bindSecuritySession(f.container, pending)).rejects.toThrow("session expired")
  expect(f.service.createSecuritySessions).not.toHaveBeenCalled()
})
