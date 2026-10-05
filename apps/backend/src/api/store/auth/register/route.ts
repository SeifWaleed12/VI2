import { registrationSchema } from "../../../validators";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  Modules,
  ContainerRegistrationKeys,
  generateJwtToken,
} from "@medusajs/framework/utils";
import { AuthenticationInput } from "@medusajs/framework/types";
import { createCustomerAccountWorkflow } from "@medusajs/core-flows";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    return await registerCustomer(req, res);
  } catch {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error("Customer registration failed");
    return res.status(500).json({ message: "Registration could not be completed." });
  }
}

async function registerCustomer(req: MedusaRequest, res: MedusaResponse) {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid registration details." });
  const { email, password, first_name, last_name, phone } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Guard against duplicate registration. Guest checkout creates a
  // has_account=false customer with the same email; Medusa allows one guest and
  // one registered record per email, so only a registered account blocks this.
  // Guest orders are not linked to the new account: the email is unverified.
  const customerService = req.scope.resolve(Modules.CUSTOMER);
  const existingCustomers = await customerService.listCustomers({
    email: normalizedEmail,
    has_account: true,
  });

  if (existingCustomers && existingCustomers.length > 0) {
    return res.status(400).json({
      message: "Unable to register with these details. Try signing in or contact support.",
    });
  }

  // 2. Register identity in the Auth Module
  const authService = req.scope.resolve(Modules.AUTH);
  const authInput: AuthenticationInput = {
    url: req.url,
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, string>,
    body: { email: normalizedEmail, password },
    protocol: req.protocol,
  };

  const authResponse = await authService.register("emailpass", authInput);

  if (!authResponse.success || !authResponse.authIdentity) {
    return res.status(400).json({
      message: "Unable to register with these details. Try signing in or contact support.",
    });
  }

  const authIdentity = authResponse.authIdentity;
  let customerCreated = false;

  // 3. Create customer account and attach auth identity via Medusa workflow
  try {
    const { result: customer } = await createCustomerAccountWorkflow(req.scope).run({
      input: {
        authIdentityId: authIdentity.id,
        customerData: {
          email: normalizedEmail,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone ? phone.trim() : undefined,
        },
      },
    });
    customerCreated = true;

    // 4. Generate the actor-bound JWT token
    const configModule = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE);
    const { http } = configModule.projectConfig;

    const token = generateJwtToken(
      {
        actor_id: customer.id,
        actor_type: "customer",
        auth_identity_id: authIdentity.id,
        auth_provider: "emailpass",
        app_metadata: {
          customer_id: customer.id,
        },
        user_metadata: {},
      },
      {
        secret: http.jwtSecret,
        expiresIn: http.jwtExpiresIn,
        jwtOptions: http.jwtOptions,
      }
    );

    return res.status(201).json({ token, customer });
  } catch {
    // Explicit compensation step: if customer creation fails, clean up the auth identity
    // so we don't leave an orphaned authentication identity that blocks future registrations.
    if (!customerCreated) {
      try {
        await authService.deleteAuthIdentities([authIdentity.id]);
      } catch {
        req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
          `Failed to compensate auth identity ${authIdentity.id} after customer creation failure`
        );
      }
    }

    return res.status(500).json({ message: "Registration could not be completed." });
  }
}
