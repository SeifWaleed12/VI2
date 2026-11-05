import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import { isCsvUpload, MAX_CSV_UPLOAD_BYTES } from "../../../../lib/csv-upload"
import { MEDIA_FOLDER } from "../../../../lib/media"

// Presigned uploads are only for product import CSVs; images go through
// /admin/uploads, which checks and re-encodes them. Answers in the native
// route's shape, with the file placed in the imports folder.
export async function POST(req: AuthenticatedMedusaRequest<{ originalname: string, mime_type: string, size: number, access?: "public" | "private" }>, res: MedusaResponse) {
  const { originalname, mime_type, size } = req.validatedBody
  if (!isCsvUpload(originalname, mime_type) || !Number.isFinite(size) || size <= 0 || size > MAX_CSV_UPLOAD_BYTES) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Presigned uploads accept CSV files up to 10 MB only. Images require /admin/uploads content validation.")
  }
  const upload = await req.scope.resolve(Modules.FILE).getUploadFileUrls({
    filename: `${MEDIA_FOLDER.imports}/${randomUUID()}.csv`,
    mimeType: "text/csv",
    access: "private",
  })
  return res.json({ url: upload.url, filename: upload.key, mime_type: "text/csv", size, extension: "csv", originalname })
}
