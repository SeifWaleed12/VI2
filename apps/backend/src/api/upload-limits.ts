import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestPath } from "../lib/request-path"

// Medusa reads a whole upload into memory before the upload route checks each
// file, so the request's declared size is checked first. Several 10 MB images
// fit; a far larger body is refused before it is read.
export const MAX_UPLOAD_REQUEST_BYTES = 50 * 1024 * 1024

export function limitUploadRequest(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (req.method !== "POST" || requestPath(req).toLowerCase() !== "/admin/uploads") return next()
  const length = Number(req.headers["content-length"])
  if (!req.headers["content-length"] || !Number.isFinite(length)) return res.status(411).json({ message: "The upload must state its size." })
  if (length > MAX_UPLOAD_REQUEST_BYTES) return res.status(413).json({ message: "Upload at most 50 MB at once." })
  return next()
}
