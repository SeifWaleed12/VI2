import { quickVariantSchema } from "../../../../validators"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createQuickVariantWorkflow } from "../../../../../workflows/quick-variant"
import { quickVariantErrorResponse } from "./errors"

// POST /admin/products/:id/quick-variant — add an option value and its variant
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = quickVariantSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid variant details" })

  try {
    const { result } = await createQuickVariantWorkflow(req.scope).run({
      input: { product_id: req.params.id, ...parsed.data },
    })
    res.status(201).json({ variant: result[0] })
  } catch (error) {
    const { status, message } = quickVariantErrorResponse(error)
    res.status(status).json({ message })
  }
}
