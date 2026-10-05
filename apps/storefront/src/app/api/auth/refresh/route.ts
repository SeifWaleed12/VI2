import { NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, expiredSession, readToken, setAuthCookie, transportFailure } from "@/lib/auth-request";

export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return expiredSession();
  try {
    const backend = await fetch(`${BACKEND_URL}/auth/token/refresh`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY },
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (!backend.ok) return backendFailure(backend.status);
    const renewed = readToken(await backend.json());
    if (!renewed) return authError("Unable to renew session. Please try again.", 502);
    const response = authJson({ ok: true });
    setAuthCookie(response, renewed);
    return response;
  } catch (error) {
    return transportFailure(error);
  }
}
