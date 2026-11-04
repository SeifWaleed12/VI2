import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// An identity without a customer blocks that email from registering again.
export async function discardAuthIdentity(container: MedusaContainer, authIdentityId: string) {
  try {
    await container.resolve(Modules.AUTH).deleteAuthIdentities([authIdentityId])
  } catch {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Failed to compensate auth identity ${authIdentityId} after customer creation failure`)
  }
}
