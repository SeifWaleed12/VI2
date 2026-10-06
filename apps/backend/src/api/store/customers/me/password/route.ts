import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { respondToPasswordChange } from "../../../../change-password-route"

// POST /store/customers/me/password: a signed-in customer changes their own
// password. Medusa requires a customer session for /store/customers/me*.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [customer] } = await query.graph({ entity: "customer", fields: ["email", "has_account"], filters: { id: req.auth_context.actor_id } })
  if (!customer?.has_account || !customer.email) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in to change your password")
  return respondToPasswordChange(req, res, "customer", customer.email)
}
