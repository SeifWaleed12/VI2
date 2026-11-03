import { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { bundleProductIds } from "../../../lib/deals"
import { MedusaError } from "@medusajs/framework/utils"

// Ids only: the storefront lists them through /store/products, which keeps
// unpublished products and other sales channels out. Products on sale come
// from /store/catalog?deals=1.
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  try { res.json({ bundle_ids: await bundleProductIds(req.scope, req.publishable_key_context.sales_channel_ids) }) }
  catch (error) {
    if (!(error instanceof MedusaError) || ![MedusaError.Types.UNEXPECTED_STATE, MedusaError.Types.NOT_FOUND].includes(error.type)) throw error
    res.status(503).json({ message: "Bundles temporarily unavailable. Retry shortly." })
  }
}
