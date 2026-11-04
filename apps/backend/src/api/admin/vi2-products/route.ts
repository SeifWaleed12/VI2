import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BRAND_REFUSAL, CATEGORY_REFUSAL, createVi2ProductWorkflow } from "../../../workflows/create-vi2-product"
import { newProductSchema } from "../../validators"

// Workflow errors caused by what the user entered (a taken SKU, an inactive
// brand, a duplicate barcode); their messages are written for the user.
const REFUSALS: string[] = [MedusaError.Types.INVALID_DATA, MedusaError.Types.DUPLICATE_ERROR, MedusaError.Types.NOT_FOUND, MedusaError.Types.NOT_ALLOWED]
// The form field a workflow refusal belongs to, so the page shows it there.
const FIELDS: Record<string, string> = { [BRAND_REFUSAL]: "brand_id", [CATEGORY_REFUSAL]: "category_ids" }

// POST /admin/vi2-products - create a product with its brand, EDA registration
// and shared options (adding new option values) in one save. Errors name the
// form field when they can.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = newProductSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message
    return res.status(400).json({ message: "Check the highlighted fields.", errors })
  }
  try {
    const { result: id } = await createVi2ProductWorkflow(req.scope).run({ input: parsed.data })
    res.status(201).json({ product: { id } })
  } catch (error) {
    if (MedusaError.isMedusaError(error) && REFUSALS.includes(error.type)) {
      const field = FIELDS[error.message]
      return res.status(400).json({ message: error.message, ...(field && { errors: { [field]: error.message } }) })
    }
    throw error
  }
}
