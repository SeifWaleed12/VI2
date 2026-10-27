import { reviewErrorResponse } from "../../../../../lib/product-review-errors"
import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { requireReviewProduct, reviewsFrom } from "../../../../../lib/product-review-access"
import { reviewListInput } from "../../../../../modules/product-review/validation"

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  try {
    res.setHeader("Cache-Control", "no-store")
    const parsed = reviewListInput.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ message: "Invalid review filters" })
    await requireReviewProduct(req)
    return res.json(await reviewsFrom(req).publicPage(req.params.id, parsed.data))
  } catch (error) {
    return reviewErrorResponse(error, res)
  }
}
