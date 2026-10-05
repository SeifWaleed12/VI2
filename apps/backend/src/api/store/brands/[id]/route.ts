import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

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

    if (!brand || brand.status !== "active") {
      return res.status(404).json({ message: "Brand not found" })
    }

    res.json({ brand })
  } catch {
    const message = "Failed to retrieve brand"
    res.status(500).json({ message })
  }
}
