import { reviewErrorResponse } from "../../../lib/product-review-errors"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import { moderationListInput } from "../../../modules/product-review/validation"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    res.setHeader("Cache-Control", "no-store")
    const parsed = moderationListInput.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ message: "Invalid moderation filters" })
    const { status, limit, offset } = parsed.data
    const [reviews, count] = await req.scope.resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .listAndCountProductReviews({ status }, { take: limit, skip: offset, order: { updated_at: status === "pending" ? "ASC" : "DESC", id: "ASC" } })
    return res.json({ reviews, count, limit, offset })
  } catch (error) {
    return reviewErrorResponse(error, res)
  }
}
