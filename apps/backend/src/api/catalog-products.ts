import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { catalogProductsSchema } from "./validators"

export function boundCatalogHydration(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (!catalogProductsSchema.safeParse(req.query).success) {
    return res.status(400).json({ message: "Provide up to 24 product IDs for catalog hydration" })
  }
  res.setHeader("Cache-Control", "no-store")
  return next()
}
