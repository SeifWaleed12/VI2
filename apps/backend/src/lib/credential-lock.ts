import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const withCredentialLock = <T>(container: MedusaContainer, identityId: string, work: () => Promise<T>) =>
  container.resolve(Modules.LOCKING).execute(`credential:${identityId}`, async (signal?: AbortSignal) => {
    signal?.throwIfAborted()
    const result = await work()
    signal?.throwIfAborted()
    return result
  }, { timeout: 5 })
