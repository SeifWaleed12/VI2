import { MedusaError } from "@medusajs/framework/utils"

// Maps known module errors to safe responses; anything else stays a generic
// 500 so internal details never reach the client.
export function brandErrorResponse(error: unknown, fallback: string) {
  if (MedusaError.isMedusaError(error)) {
    if (error.type === MedusaError.Types.DUPLICATE_ERROR) {
      return { status: 409, message: "A brand with this slug already exists" }
    }
    if (error.type === MedusaError.Types.NOT_FOUND) {
      return { status: 404, message: "Brand not found" }
    }
  }
  return { status: 500, message: fallback }
}
