import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const brands = await brandModuleService.listBrands(
      { status: "active" },
      // Every active brand: the shop's brand filter lists them all.
      { order: { name: "ASC" } }
    )
    res.json({ brands })
  } catch {
    const message = "Failed to list brands"
    res.status(500).json({ message })
  }
}
