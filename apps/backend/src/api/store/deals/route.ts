import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { dealProductIds } from "../../../lib/deals"

// Ids only: the storefront lists them through /store/products, which keeps
// unpublished products and other sales channels out.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ product_ids: await dealProductIds(req.scope) })
}
