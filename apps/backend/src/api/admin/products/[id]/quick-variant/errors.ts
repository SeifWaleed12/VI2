import { MedusaError } from "@medusajs/framework/utils"

// Maps known errors to safe responses; anything else stays a generic 500 so
// internal details never reach the client.
export function quickVariantErrorResponse(error: unknown) {
  if (MedusaError.isMedusaError(error) && error.type === MedusaError.Types.NOT_FOUND) {
    return { status: 404, message: "Product not found" }
  }
  return { status: 500, message: "Failed to create quick variant" }
}
