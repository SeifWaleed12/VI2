export const MAX_BUNDLE_PRODUCTS = 100
export type StockLink = { variant_id?: string | null, required_quantity?: number | null, variant?: { product_id?: string | null } | null }

// A kit has at least two stock-item links on one variant; quantity alone is not a kit.
export function kitProductIds(links: StockLink[]) {
  const variants = new Map<string, { productId?: string | null, count: number }>()
  for (const link of links) {
    if (!link.variant_id) continue
    const entry = variants.get(link.variant_id) ?? { productId: link.variant?.product_id, count: 0 }
    entry.count++
    variants.set(link.variant_id, entry)
  }
  return [...new Set([...variants.values()].flatMap(entry => entry.productId && entry.count > 1 ? [entry.productId] : []))].slice(0, MAX_BUNDLE_PRODUCTS)
}
