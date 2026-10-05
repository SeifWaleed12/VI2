import { brandSchema } from "../../validators"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"
import { createBrandWorkflow } from "../../../workflows/brand"
import { brandErrorResponse } from "./errors"

// GET /admin/brands — list all brands
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const status = typeof req.query.status === "string" ? req.query.status : undefined
    const brands = await brandModuleService.listBrands(
      status ? { status } : {},
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
  const parsed = brandSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid brand details" })
  const { name, slug, description, logo, country, status } = parsed.data

  try {
    const { result: brand } = await createBrandWorkflow(req.scope).run({
      input: {
        name,
        slug,
        description: description || null,
        logo: logo || null,
        country: country || null,
        status: status || "active",
      },
    })

    res.status(201).json({ brand })
  } catch (error) {
    const { status, message } = brandErrorResponse(error, "Failed to create brand")
    res.status(status).json({ message })
  }
}
