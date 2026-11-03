import { reviewErrorResponse } from "../../../../../../lib/product-review-errors"
import type { AuthenticatedMedusaRequest, MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { requireReviewProduct, reserveReviewWrite, reviewCustomer, reviewsFrom } from "../../../../../../lib/product-review-access"
import { ownReview } from "../../../../../../modules/product-review/service"
import { reviewInput, reviewVersion } from "../../../../../../modules/product-review/validation"

type Request = AuthenticatedMedusaRequest & MedusaStoreRequest
export async function GET(req: Request, res: MedusaResponse) {
  try {
    res.setHeader("Cache-Control", "no-store")
    const customer = await reviewCustomer(req)
    return res.json({ review: ownReview(await reviewsFrom(req).own(req.params.id, customer.id)) })
  } catch (error) {
    return reviewErrorResponse(error, res)
  }
}
export async function POST(req: Request, res: MedusaResponse) {
  try {
    res.setHeader("Cache-Control", "no-store")
    const parsed = reviewInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: "Rating 1-5, title up to 120 and feedback 20-3000 characters required" })
    await requireReviewProduct(req)
    const customer = await reviewCustomer(req)
    const allowed = await reserveReviewWrite(req, customer.id)
    if (allowed === null) return res.status(503).json({ message: "Review service temporarily unavailable" })
    if (!allowed) return res.status(429).json({ message: "Too many review attempts. Try again in 15 minutes." })
    const firstName = customer.first_name?.trim().split(/\s+/u)[0]?.slice(0, 80) || null
    const review = await reviewsFrom(req).submit(req.params.id, customer.id, firstName, parsed.data)
    return res.json({ review: ownReview(review) })
  } catch (error) {
    return reviewErrorResponse(error, res)
  }
}
export async function DELETE(req: Request, res: MedusaResponse) {
  try {
    res.setHeader("Cache-Control", "no-store")
    const parsed = reviewVersion.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: "Current review version required" })
    const customer = await reviewCustomer(req)
    const review = await reviewsFrom(req).withdraw(req.params.id, customer.id, parsed.data.version)
    return res.json({ review: ownReview(review) })
  } catch (error) {
    return reviewErrorResponse(error, res)
  }
}
