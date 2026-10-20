import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { verifyEmailChange } from "../../../../lib/email-change"
import { changeCustomerEmailWorkflow } from "../../../../workflows/change-customer-email"

const invalidLink = (res: MedusaResponse) =>
  res.status(400).json({ code: "invalid_link", message: "This link is invalid or has expired. Ask for a new one from your account." })

// POST /store/email-change/confirm { token }: opening the link sent to the new
// address makes the change. No sign-in is needed, so the link works on another
// device; the signed token is the proof.
export async function POST(req: MedusaRequest<{ token?: unknown }>, res: MedusaResponse) {
  const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const change = verifyEmailChange(req.body?.token, http.jwtSecret as string)
  if (!change) return invalidLink(res)
  // One change per customer at a time, so two clicks cannot both pass the checks.
  return req.scope.resolve(Modules.LOCKING).execute(`email-change:${change.customer_id}`, async () => {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [customer] } = await query.graph({ entity: "customer", fields: ["id", "email", "has_account"], filters: { id: change.customer_id } })
    // Used once: after the change the email no longer matches the link.
    if (!customer?.has_account || customer.email !== change.from) return invalidLink(res)
    const auth = req.scope.resolve(Modules.AUTH)
    const [login] = await auth.listProviderIdentities({ provider: "emailpass", entity_id: change.from }, { relations: ["auth_identity"] })
    const app = (login?.auth_identity?.app_metadata ?? {}) as Record<string, unknown>
    if (!login || app.customer_id !== customer.id) return invalidLink(res)
    // One Medusa login can also be a staff account; changing it here would
    // change the staff login too.
    if (app.user_id) return res.status(409).json({ code: "staff_login", message: "This login is also a staff account. Change its email from the dashboard." })
    if ((await auth.listProviderIdentities({ provider: "emailpass", entity_id: change.to })).length) {
      return res.status(409).json({ code: "email_taken", message: "Another account already uses this email." })
    }
    await changeCustomerEmailWorkflow(req.scope).run({ input: { login_id: login.id, customer_id: customer.id, from: change.from, to: change.to } })
    return res.status(200).json({ success: true, email: change.to })
  }, { timeout: 5 })
}
