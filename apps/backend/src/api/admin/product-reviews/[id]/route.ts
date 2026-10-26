import { reviewErrorResponse } from "../../../../lib/product-review-errors"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import { moderationInput } from "../../../../modules/product-review/validation"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    res.setHeader("Cache-Control", "no-store")
    const parsed = moderationInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: "Decision, current version and reason required" })
    const { status, version, reason } = parsed.data
    const review = await req.scope.resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .moderate(req.params.id, version, status, req.auth_context.actor_id, reason)
    return res.json({ review })
  } catch (error) {
    return reviewErrorResponse(error, res)
  }
}
