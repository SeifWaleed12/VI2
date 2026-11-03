import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

export async function POST(_req: MedusaRequest, _res: MedusaResponse) {
  // Registration creates the login and customer from one normalized email.
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Register through /store/auth/register.")
}
