import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { removeProductEdaWorkflow, setProductEdaWorkflow } from "../../../../../workflows/product-eda"
import { productEdaSchema } from "../../../../validators"

const FIELDS = ["id", "eda_registration.id", "eda_registration.registration_number", "eda_registration.is_approved"]

async function productEda(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [product] } = await query.graph({ entity: "product", fields: FIELDS, filters: { id: req.params.id } })
  if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product ${req.params.id} was not found`)
  return (product as { eda_registration?: unknown }).eda_registration ?? null
}

// GET /admin/products/:id/eda - the product's EDA registration, or null
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ eda_registration: await productEda(req) })
}

// POST /admin/products/:id/eda - set the EDA number and whether it is approved
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = productEdaSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Enter an EDA registration number and whether it is approved." })
  await setProductEdaWorkflow(req.scope).run({ input: { product_id: req.params.id, ...parsed.data } })
  res.json({ eda_registration: await productEda(req) })
}

// DELETE /admin/products/:id/eda - remove the product's EDA registration
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await removeProductEdaWorkflow(req.scope).run({ input: { product_id: req.params.id } })
  res.json({ eda_registration: null })
}
