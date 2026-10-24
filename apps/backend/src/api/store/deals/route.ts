import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { bundleProductIds } from "../../../lib/deals"

// Ids only: the storefront lists them through /store/products, which keeps
// unpublished products and other sales channels out. Products on sale come
// from /store/catalog?deals=1.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ bundle_ids: await bundleProductIds(req.scope) })
}
