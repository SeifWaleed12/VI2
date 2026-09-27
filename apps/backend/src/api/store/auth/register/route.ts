import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  Modules,
  ContainerRegistrationKeys,
  generateJwtToken,
} from "@medusajs/framework/utils";
import { AuthenticationInput } from "@medusajs/framework/types";
import { createCustomerAccountWorkflow } from "@medusajs/core-flows";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, password, first_name, last_name, phone } = (req.body || {}) as {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      message: "email, password, first_name, and last_name are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Guard against duplicate customer registration
  const customerService = req.scope.resolve(Modules.CUSTOMER);
  const existingCustomers = await customerService.listCustomers({
    email: normalizedEmail,
  });

  if (existingCustomers && existingCustomers.length > 0) {
    return res.status(400).json({
      message: "A customer with this email already exists.",
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
      message: authResponse.error || "Registration failed.",
    });
  }

  const authIdentity = authResponse.authIdentity;

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
  } catch (workflowError) {
    // Explicit compensation step: if customer creation fails, clean up the auth identity
    // so we don't leave an orphaned authentication identity that blocks future registrations.
    try {
      await authService.deleteAuthIdentities([authIdentity.id]);
    } catch (compensationError) {
      req.scope.resolve(ContainerRegistrationKeys.LOGGER)?.error(
        `Failed to compensate auth identity ${authIdentity.id} after customer creation failure: ${compensationError}`
      );
    }

    const message =
      workflowError instanceof Error
        ? workflowError.message
        : "Failed to create customer account.";
    return res.status(500).json({ message });
  }
}
