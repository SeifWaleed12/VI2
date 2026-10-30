import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

export async function POST(_req: MedusaRequest, _res: MedusaResponse) {
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Upload images through /admin/uploads for content validation.")
}
