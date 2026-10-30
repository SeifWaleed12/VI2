import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Native deletion interprets non-null app_metadata keys as other actor links.
// Keep replay history in the server-only provider record instead.
export async function migrateEmailChangeMarker(container: MedusaContainer, identityId: string) {
  const auth = container.resolve(Modules.AUTH)
  const identity = await auth.retrieveAuthIdentity(identityId, { relations: ["provider_identities"] })
  const legacy = identity.app_metadata?.email_changed_at
  if (legacy == null) return
  const provider = identity.provider_identities?.find(value => value.provider === "emailpass")
  if (!provider) return
  await auth.updateProviderIdentities([{ id: provider.id, provider_metadata: { ...provider.provider_metadata, email_changed_at: Math.max(Number(legacy), Number(provider.provider_metadata?.email_changed_at ?? 0)) } }])
  await auth.updateAuthIdentities([{ id: identityId, app_metadata: { ...identity.app_metadata, email_changed_at: null } }])
}
