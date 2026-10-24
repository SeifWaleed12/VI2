import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { bundleProductIds, dealProductIds } from "../../../lib/deals"

// Ids only: the storefront lists them through /store/products, which keeps
// unpublished products and other sales channels out.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [productIds, bundleIds] = await Promise.all([dealProductIds(req.scope), bundleProductIds(req.scope)])
  res.json({ product_ids: productIds, bundle_ids: bundleIds })
}
