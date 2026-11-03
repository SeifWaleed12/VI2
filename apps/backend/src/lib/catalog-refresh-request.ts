import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

let lastRequested = -Infinity

// This only limits redundant signals. Persisted health and the minute job own recovery.
export async function requestCatalogRefresh(container: MedusaContainer) {
  const now = Date.now()
  if (now - lastRequested < 5000) return
  lastRequested = now
  try {
    await container.resolve(Modules.EVENT_BUS).emit({ name: "catalog-ranking.refresh", data: {} })
  } catch {
    if (lastRequested === now) lastRequested = -Infinity
  }
}
