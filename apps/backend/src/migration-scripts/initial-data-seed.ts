import type { MedusaContainer } from "@medusajs/framework"
import { setupEgyptStore } from "../scripts/setup-egypt-store"

// Runs once, when a new database is first migrated. It used to create Medusa's
// starter demo (Europe region, EUR/USD, a Copenhagen warehouse and clothing
// products); it now applies the Egypt store setup instead. Databases that
// already ran the old version keep what it created: run
// src/scripts/setup-egypt-store.ts and src/scripts/remove-demo-data.ts on them.
export default async function initial_data_seed({ container }: { container: MedusaContainer }) {
  await setupEgyptStore(container)
}
