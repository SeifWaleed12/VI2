import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const brands = await brandModuleService.listBrands(
      { status: "active" },
      {
        order: { name: "ASC" },
        take: 100, skip: 0,
      }
    )
    res.json({ brands })
  } catch {
    const message = "Failed to list brands"
    res.status(500).json({ message })
  }
}
