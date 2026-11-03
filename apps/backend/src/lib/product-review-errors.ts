import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

// Keep native/domain statuses, never expose persistence or infrastructure messages.
export function reviewErrorResponse(error: unknown, response: MedusaResponse) {
  const type = error instanceof MedusaError ? error.type : null
  if (type === MedusaError.Types.CONFLICT || type === MedusaError.Types.DUPLICATE_ERROR) return response.status(409).json({ message: "Review changed. Reload before trying again." })
  if (type === MedusaError.Types.NOT_FOUND) return response.status(404).json({ message: "Product or review not found" })
  if (type === MedusaError.Types.UNAUTHORIZED) return response.status(401).json({ message: "Sign in to review" })
  if (type === MedusaError.Types.FORBIDDEN) return response.status(403).json({ message: "Review access not allowed" })
  if (type === MedusaError.Types.INVALID_DATA) return response.status(400).json({ message: "Invalid review request" })
  return response.status(503).json({ message: "Reviews temporarily unavailable. Try again." })
}
