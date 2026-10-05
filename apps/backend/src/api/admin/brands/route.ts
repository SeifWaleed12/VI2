import { brandSchema } from "../../validators"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

// GET /admin/brands — list all brands
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const brands = await brandModuleService.listBrands(
      req.query.status ? { status: req.query.status as string } : {},
      { order: { name: "ASC" } }
    )
    res.json({ brands })
  } catch {
    const message = "Failed to list brands"
    res.status(500).json({ message })
  }
}

// POST /admin/brands — create a brand
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const parsed = brandSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: "Invalid brand details" })
    const { name, slug, description, logo, country, status } = parsed.data

    const brand = await brandModuleService.createBrands({
      name,
      slug,
      description: description || null,
      logo: logo || null,
      country: country || null,
      status: status || "active",
    })

    res.status(201).json({ brand })
  } catch {
    const message = "Failed to create brand"
    res.status(500).json({ message })
  }
}
