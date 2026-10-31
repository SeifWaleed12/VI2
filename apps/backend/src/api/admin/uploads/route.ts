import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { randomUUID } from "node:crypto"
import { rasterImage } from "../../../lib/brand-logo"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Native multipart parsing runs before this route. Never trust its MIME/name.
  const files = (req as MedusaRequest & { files?: { buffer: Buffer }[] }).files
  if (!files?.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  const input = files.map(file => {
    const kind = rasterImage(file.buffer)
    if (file.buffer.length > MAX_UPLOAD_BYTES || typeof kind === "string") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Upload PNG, JPEG or WebP images up to 10 MB.")
    return { filename: `${randomUUID()}.${kind.extension}`, mimeType: kind.mimeType, content: file.buffer.toString("base64"), access: "public" as const }
  })
  const { result } = await uploadFilesWorkflow(req.scope).run({ input: { files: input } })
  return res.status(200).json({ files: result })
}
