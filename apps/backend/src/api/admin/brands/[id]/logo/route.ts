import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { brandLogoSchema } from "../../../../validators"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"
import { updateBrandWorkflow } from "../../../../../workflows/brand"
import { deleteBrandLogoFile, logoImage } from "../../../../../lib/brand-logo"
import { brandErrorResponse } from "../../errors"

const NOT_AN_IMAGE = "The logo must be a PNG, JPG or WebP image."

// POST /admin/brands/:id/logo — upload a logo, replacing any earlier one.
// The file is stored (R2 in production, the local disk otherwise) before the
// brand points to it; the replaced file is deleted only after the brand saved.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = brandLogoSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: NOT_AN_IMAGE })
  const image = logoImage(Buffer.from(parsed.data.content, "base64"))
  if (image === "too_large") return res.status(400).json({ message: "The logo must be 1 MB or smaller." })
  if (image === "not_an_image") return res.status(400).json({ message: NOT_AN_IMAGE })

  const { id } = req.params
  let previous: Awaited<ReturnType<BrandModuleService["retrieveBrand"]>>
  try {
    previous = await req.scope.resolve<BrandModuleService>(BRAND_MODULE).retrieveBrand(id)
  } catch (error) {
    const { status, message } = brandErrorResponse(error, "Failed to update brand")
    return res.status(status).json({ message })
  }

  let file: { id: string, url: string }
  try {
    file = await req.scope.resolve(Modules.FILE).createFiles({
      filename: `brand-logo-${previous.slug}.${image.extension}`,
      mimeType: image.mimeType,
      content: parsed.data.content,
      access: "public",
    })
  } catch {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(`Could not store a logo for brand ${id}`)
    return res.status(500).json({ message: "The logo could not be stored. Try again." })
  }

  try {
    const { result: brand } = await updateBrandWorkflow(req.scope).run({ input: { id, logo: file.url, logo_file_id: file.id } })
    await deleteBrandLogoFile(req.scope, previous.logo_file_id)
    res.json({ brand })
  } catch (error) {
    await deleteBrandLogoFile(req.scope, file.id)
    const { status, message } = brandErrorResponse(error, "Failed to update brand")
    res.status(status).json({ message })
  }
}

// DELETE /admin/brands/:id/logo — remove the logo; the shop shows the name.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  try {
    const previous = await req.scope.resolve<BrandModuleService>(BRAND_MODULE).retrieveBrand(id)
    const { result: brand } = await updateBrandWorkflow(req.scope).run({ input: { id, logo: null, logo_file_id: null } })
    await deleteBrandLogoFile(req.scope, previous.logo_file_id)
    res.json({ brand })
  } catch (error) {
    const { status, message } = brandErrorResponse(error, "Failed to update brand")
    res.status(status).json({ message })
  }
}
