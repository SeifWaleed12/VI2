import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// shortcut: at most 100 bundle products, raise when the store sells more bundles.
export const MAX_BUNDLE_PRODUCTS = 100

// A bundle is a product with an inventory-kit variant (Admin → product →
// variant → Inventory kit) made of two or more different stock items. A single
// item with a quantity above 1 is not counted: in practice it was a mistyped
// quantity, not a pack. No tag or category needed.
export type StockLink = { variant_id?: string | null, required_quantity?: number | null, variant?: { product_id?: string | null } | null }

export function kitProductIds(links: StockLink[]) {
  const byVariant = new Map<string, StockLink[]>()
  for (const link of links) {
    if (link.variant_id) byVariant.set(link.variant_id, [...(byVariant.get(link.variant_id) ?? []), link])
  }
  const ids = new Set<string>()
  for (const parts of byVariant.values()) {
    const productId = parts[0].variant?.product_id
    if (productId && parts.length > 1) ids.add(productId)
  }
  return [...ids].slice(0, MAX_BUNDLE_PRODUCTS)
}

// shortcut: reads every variant↔stock link per request (cached 60 s); move to a
// SQL query when the catalog has tens of thousands of variants.
export async function bundleProductIds(container: MedusaContainer) {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "required_quantity", "variant.product_id"],
  })
  return kitProductIds(data as StockLink[])
}
