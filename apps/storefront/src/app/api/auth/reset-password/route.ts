import { NextRequest } from "next/server";
import { AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, readAuthBody, readToken, transportFailure, validText } from "@/lib/auth-request";

// Sets a new password with the token from a reset email. The token is sent to
// Medusa as a bearer token; it is never stored in a cookie.
export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const body = await readAuthBody(request);
  const token = readToken(body);
  if (!body || !token || !validText(body.password, 1024)) return authError("Provide a reset link and a new password.", 400);
  try {
    const backend = await fetch(`${BACKEND_URL}/auth/customer/emailpass/update`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY },
      body: JSON.stringify({ password: body.password }),
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (backend.ok) return authJson({ ok: true });
    if (backend.status === 400) return authError("Choose a password with at least 8 characters.", 400);
    // An invalid or used token is not a signed-in session, so it must not clear one.
    if (backend.status === 401) return authError("This reset link is invalid or has expired. Request a new one.", 400);
    return backendFailure(backend.status);
  } catch (error) {
    return transportFailure(error);
  }
}
