import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { POST as nativePresigned } from "@medusajs/medusa/api/admin/uploads/presigned-urls/route"
import { isCsvUpload, MAX_CSV_UPLOAD_BYTES } from "../../../../lib/csv-upload"

export async function POST(req: AuthenticatedMedusaRequest<{ originalname: string, mime_type: string, size: number, access?: "public" | "private" }>, res: MedusaResponse) {
  const { originalname, mime_type, size } = req.validatedBody
  if (!isCsvUpload(originalname, mime_type) || !Number.isFinite(size) || size <= 0 || size > MAX_CSV_UPLOAD_BYTES) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Presigned uploads accept CSV files up to 10 MB only. Images require /admin/uploads content validation.")
  }
  // Native naming uses the MIME subtype; normalize Windows' Excel MIME to csv.
  req.validatedBody = { ...req.validatedBody, mime_type: "text/csv", access: "private" }
  return nativePresigned(req, res)
}
