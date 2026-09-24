import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const brands = await brandModuleService.listBrands(
      req.query.status ? { status: req.query.status as string } : {},
      {
        order: { name: "ASC" },
      }
    )
    res.json({ brands })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list brands"
    res.status(500).json({ message })
  }
}
