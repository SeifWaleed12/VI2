import { NextRequest } from "next/server";
import { AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, readAuthBody, readToken, setAuthCookie, transportFailure, validCredentials, validCustomer, validText } from "@/lib/auth-request";

export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const body = await readAuthBody(request);
  if (!validCredentials(body) || !validText(body.firstName, 100) || !validText(body.lastName, 100)
    || (body.phone !== undefined && (typeof body.phone !== "string" || body.phone.length > 32))) {
    return authError("Provide valid registration details.", 400);
  }
  try {
    // Do not automatically retry account creation: a timeout does not prove failure.
    const backend = await fetch(`${BACKEND_URL}/store/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-publishable-api-key": PUBLISHABLE_KEY },
      body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password,
        first_name: body.firstName.trim(), last_name: body.lastName.trim(), phone: typeof body.phone === "string" ? body.phone.trim() : undefined }),
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (!backend.ok) {
      if (backend.status === 400 || backend.status === 409) return authError("Unable to register with these details. Try signing in or contact support.", 400);
      return backendFailure(backend.status);
    }
    const data = await backend.json();
    const token = readToken(data);
    if (!token || !validCustomer(data?.customer)) return authError("Unable to confirm registration. Try signing in before registering again.", 502);
    const response = authJson({ ok: true, customer: data.customer }, 201);
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    const response = transportFailure(error);
    return authError("Unable to confirm registration. Try signing in before registering again.", response.status);
  }
}
