import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { randomUUID } from "node:crypto"
import { rasterImage } from "../../../lib/brand-logo"
import { isCsvUpload, MAX_CSV_UPLOAD_BYTES } from "../../../lib/csv-upload"
import { MEDIA_FOLDER, MIN_PRODUCT_IMAGE_SIDE, optimizeImage, PRODUCT_IMAGE_MAX_SIDE } from "../../../lib/media"
import { UPLOADED_MEDIA_MODULE } from "../../../modules/uploaded-media"
import type UploadedMediaService from "../../../modules/uploaded-media/service"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

type UploadedFile = { buffer: Buffer, originalname?: string, mimetype?: string }

async function fileInput(file: UploadedFile) {
  if (/\.csv$/i.test(file.originalname ?? "")) {
    if (!isCsvUpload(file.originalname, file.mimetype) || !file.buffer.length || file.buffer.length > MAX_CSV_UPLOAD_BYTES || file.buffer.includes(0)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Upload CSV files up to 10 MB with a CSV MIME type and no NUL bytes.")
    }
    return { filename: `${MEDIA_FOLDER.imports}/${randomUUID()}.csv`, mimeType: "text/csv", content: file.buffer.toString("base64"), access: "private" as const }
  }
  // The type is read from the bytes first, so only PNG, JPEG and WebP ever reach the image decoder.
  if (file.buffer.length > MAX_UPLOAD_BYTES || typeof rasterImage(file.buffer) === "string") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Upload PNG, JPEG or WebP images up to 10 MB.")
  }
  const image = await optimizeImage(file.buffer, { maxSide: PRODUCT_IMAGE_MAX_SIDE, minShortSide: MIN_PRODUCT_IMAGE_SIDE })
  if (image === "too_small") throw new MedusaError(MedusaError.Types.INVALID_DATA, `Images must be at least ${MIN_PRODUCT_IMAGE_SIDE} px on their shorter side.`)
  if (image === "unreadable") throw new MedusaError(MedusaError.Types.INVALID_DATA, "The image could not be read. Upload a PNG, JPEG or WebP image.")
  return { filename: `${MEDIA_FOLDER.products}/${randomUUID()}.${image.extension}`, mimeType: image.mimeType, content: image.content.toString("base64"), access: "public" as const }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Native multipart parsing runs before this route. Never trust its MIME/name.
  const files = (req as MedusaRequest & { files?: UploadedFile[] }).files
  if (!files?.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  const input = await Promise.all(files.map(fileInput))
  const { result } = await uploadFilesWorkflow(req.scope).run({ input: { files: input } })
  // Tracked so the nightly cleanup can delete images no product ends up using.
  const images = result.filter((_file, index) => input[index].filename.startsWith(`${MEDIA_FOLDER.products}/`))
  if (images.length) {
    await req.scope.resolve<UploadedMediaService>(UPLOADED_MEDIA_MODULE)
      .createUploadedMedias(images.map(({ id, url }) => ({ id, url })))
      .catch(() => req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn("Could not track uploaded product images for cleanup"))
  }
  return res.status(200).json({ files: result })
}
