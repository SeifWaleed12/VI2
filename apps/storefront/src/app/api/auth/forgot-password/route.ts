import { NextRequest } from "next/server";
import { AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, readAuthBody, transportFailure, validEmail } from "@/lib/auth-request";

// The answer is the same whether or not the email has an account, so the form
// cannot be used to find out who is a customer.
const RESET_REQUESTED = "If an account exists for this email, we sent a link to reset the password.";

export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const body = await readAuthBody(request);
  if (!body || !validEmail(body.email)) return authError("Provide a valid email address.", 400);
  try {
    const backend = await fetch(`${BACKEND_URL}/auth/customer/emailpass/reset-password`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-publishable-api-key": PUBLISHABLE_KEY },
      body: JSON.stringify({ identifier: body.email.trim().toLowerCase() }),
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (backend.status === 429) return backendFailure(429);
    if (!backend.ok) return authError("Service temporarily unavailable. Please try again.", 503);
    return authJson({ ok: true, message: RESET_REQUESTED });
  } catch (error) {
    return transportFailure(error);
  }
}
