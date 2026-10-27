import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { catalogPriceVersion, readCatalogState } from "../lib/catalog-ranking"
import { refreshCatalog } from "../lib/catalog-ranking-refresh"

// Every minute: repair interrupted refreshes and advance scheduled sale boundaries.
// Full reconciliation every five minutes also catches module-link edits without events.
export default async function reconcileCatalogRanking(container: MedusaContainer) {
  const state = await readCatalogState(container).catch(() => null)
  if (state === null) return
  if (state?.ready === 1 && (state.valid_until ?? 0) > Date.now() + 60_000 && state.price_version === await catalogPriceVersion(container.resolve(ContainerRegistrationKeys.QUERY))) return
  await refreshCatalog(container, undefined, { name: "catalog-ranking.reconcile", data: {} })
  container.resolve(ContainerRegistrationKeys.LOGGER).info("Catalog ranking reconciled")
}
export const config = { name: "reconcile-catalog-ranking", schedule: "* * * * *" }
