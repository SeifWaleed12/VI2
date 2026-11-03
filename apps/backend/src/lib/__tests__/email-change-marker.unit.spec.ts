import { migrateEmailChangeMarker } from "../email-change-marker"

function fixture(fail = false) {
  const provider = { id: "provider_1", provider: "emailpass", provider_metadata: { password: "dummy-hash", email_changed_at: 200 } }
  const identity = { id: "auth_1", app_metadata: { customer_id: "cus_1", user_id: "user_1", email_changed_at: 100 }, provider_identities: [provider] }
  const auth = { retrieveAuthIdentity: jest.fn(async () => identity), updateProviderIdentities: jest.fn(async updates => { if (fail) throw new Error("write failed"); Object.assign(provider, updates[0]) }), updateAuthIdentities: jest.fn(async updates => { Object.assign(identity, updates[0]) }) }
  return { auth, identity, provider, container: { resolve: () => auth } as never }
}
it("preserves credentials and replay history while clearing the false actor marker", async () => {
  const f = fixture()
  await migrateEmailChangeMarker(f.container, "auth_1")
  expect(f.provider.provider_metadata).toEqual({ password: "dummy-hash", email_changed_at: 200 })
  expect(f.identity.app_metadata).toEqual({ customer_id: "cus_1", user_id: "user_1", email_changed_at: null })
})
it("keeps the legacy replay barrier if moving the marker fails", async () => {
  const f = fixture(true)
  await expect(migrateEmailChangeMarker(f.container, "auth_1")).rejects.toThrow("write failed")
  expect(f.auth.updateAuthIdentities).not.toHaveBeenCalled()
  expect(f.identity.app_metadata.email_changed_at).toBe(100)
})
