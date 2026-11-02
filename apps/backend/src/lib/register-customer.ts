import type { AuthenticationInput, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { registerCustomerWorkflow } from "../workflows/register-customer"
import { bindSecuritySession, CREDENTIAL_CLAIM } from "./security-session"

export type Registration = { email: string, password: string, first_name: string, last_name: string, phone?: string | null }
export type AuthRequest = Pick<AuthenticationInput, "url" | "headers" | "query" | "protocol">

export async function registerCustomer(container: MedusaContainer, details: Registration, authRequest: AuthRequest) {
  const email = details.email.trim().toLowerCase()

  // Guest checkout creates a has_account=false customer with the same email;
  // Medusa allows one guest and one registered record per email, so only a
  // registered account blocks this. Guest orders are not linked to the new
  // account: the email is unverified. Saying the email is taken tells anyone it
  // has an account; Seif chose that for shoppers (2026-10-25), as large shops
  // do. Sign-in stays vague.
  const existing = await container.resolve(Modules.CUSTOMER).listCustomers({ email, has_account: true })
  if (existing && existing.length > 0) return { status: "taken" } as const

  const { success, error, authIdentity } = await container.resolve(Modules.AUTH).register("emailpass", {
    ...authRequest,
    body: { email, password: details.password },
  })
  // A login with this email exists without a customer account (for example a
  // staff member): the email is taken all the same.
  if (!success && /exists/i.test(error ?? "")) return { status: "taken" } as const
  if (!success || !authIdentity) return { status: "refused" } as const

  const { result: customer } = await registerCustomerWorkflow(container).run({
    input: {
      authIdentityId: authIdentity.id,
      customerData: {
        email,
        first_name: details.first_name.trim(),
        last_name: details.last_name.trim(),
        phone: details.phone ? details.phone.trim() : undefined,
      },
    },
  })

  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const token = generateJwtToken(
    {
      actor_id: customer.id,
      actor_type: "customer",
      auth_identity_id: authIdentity.id,
      auth_provider: "emailpass",
      app_metadata: { customer_id: customer.id },
      user_metadata: {},
    },
    { secret: http.jwtSecret, expiresIn: http.jwtExpiresIn, jwtOptions: http.jwtOptions }
  )
  return {
    status: "registered",
    token: await bindSecuritySession(container, token, undefined, authIdentity.app_metadata?.[CREDENTIAL_CLAIM] as string),
    customer,
  } as const
}
