import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { registrationSchema } from "../../../validators";
import { registerCustomer } from "../../../../lib/register-customer";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid registration details." });

  try {
    const outcome = await registerCustomer(req.scope, parsed.data, {
      url: req.url,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, string>,
      protocol: req.protocol,
    });
    if (outcome.status === "taken") return res.status(409).json({ code: "email_taken", message: "This email already has an account." });
    if (outcome.status === "refused") return res.status(400).json({ message: "Unable to register with these details. Try signing in or contact support." });
    return res.status(201).json({ token: outcome.token, customer: outcome.customer });
  } catch {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error("Customer registration failed");
    return res.status(500).json({ message: "Registration could not be completed." });
  }
}
