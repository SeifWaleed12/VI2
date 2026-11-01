import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { randomUUID } from "node:crypto"
import { rasterImage } from "../../../lib/brand-logo"
import { isCsvUpload, MAX_CSV_UPLOAD_BYTES } from "../../../lib/csv-upload"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Native multipart parsing runs before this route. Never trust its MIME/name.
  const files = (req as MedusaRequest & { files?: { buffer: Buffer, originalname?: string, mimetype?: string }[] }).files
  if (!files?.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  const input = files.map(file => {
    if (/\.csv$/i.test(file.originalname ?? "")) {
      if (!isCsvUpload(file.originalname, file.mimetype) || !file.buffer.length || file.buffer.length > MAX_CSV_UPLOAD_BYTES || file.buffer.includes(0)) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Upload CSV files up to 10 MB with a CSV MIME type and no NUL bytes.")
      }
      return { filename: `${randomUUID()}.csv`, mimeType: "text/csv", content: file.buffer.toString("base64"), access: "private" as const }
    }
    const kind = rasterImage(file.buffer)
    if (file.buffer.length > MAX_UPLOAD_BYTES || typeof kind === "string") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Upload PNG, JPEG or WebP images up to 10 MB.")
    return { filename: `${randomUUID()}.${kind.extension}`, mimeType: kind.mimeType, content: file.buffer.toString("base64"), access: "public" as const }
  })
  const { result } = await uploadFilesWorkflow(req.scope).run({ input: { files: input } })
  return res.status(200).json({ files: result })
}
