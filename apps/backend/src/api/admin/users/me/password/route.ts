import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { respondToPasswordChange } from "../../../../change-password-route"

// POST /admin/users/me/password: a signed-in staff member changes their own password.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [user] } = await query.graph({ entity: "user", fields: ["email"], filters: { id: req.auth_context.actor_id } })
  if (!user) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Admin authentication required")
  return respondToPasswordChange(req, res, "user", user.email)
}
