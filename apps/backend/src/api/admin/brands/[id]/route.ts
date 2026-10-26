import { brandSchema } from "../../../validators"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"
import { deleteBrandWorkflow, updateBrandWorkflow } from "../../../../workflows/brand"
import { brandErrorResponse } from "../errors"
import { deleteBrandLogoFile } from "../../../../lib/brand-logo"

// GET /admin/brands/:id
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const { id } = req.params
    let brand: any = null
    try {
      brand = await brandModuleService.retrieveBrand(id)
    } catch {
      const brands = await brandModuleService.listBrands({ slug: id })
      brand = brands[0] ?? null
    }
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" })
    }
    res.json({ brand })
  } catch {
    const message = "Failed to retrieve brand"
    res.status(500).json({ message })
  }
}

// PUT /admin/brands/:id
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const parsed = brandSchema.partial().strict().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid brand details" })
  const { name, slug, description, country, status } = parsed.data

  try {
    const { result: brand } = await updateBrandWorkflow(req.scope).run({
      input: { id, name, slug, description, country, status },
    })

    res.json({ brand })
  } catch (error) {
    const { status, message } = brandErrorResponse(error, "Failed to update brand")
    res.status(status).json({ message })
  }
}

// DELETE /admin/brands/:id
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  try {
    const { logo_file_id } = await req.scope.resolve<BrandModuleService>(BRAND_MODULE).retrieveBrand(id)
    await deleteBrandWorkflow(req.scope).run({ input: { id } })
    // The logo is public; once its brand is gone nothing points to it.
    await deleteBrandLogoFile(req.scope, logo_file_id)
    res.json({ id, deleted: true })
  } catch (error) {
    const { status, message } = brandErrorResponse(error, "Failed to delete brand")
    res.status(status).json({ message })
  }
}
