import { NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, expiredSession, transportFailure, validCustomer } from "@/lib/auth-request";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return expiredSession();
  try {
    const backend = await fetch(`${BACKEND_URL}/store/customers/me`, {
      headers: { Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY },
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (!backend.ok) return backendFailure(backend.status);
    const data = await backend.json();
    if (!validCustomer(data?.customer)) return authError("Unable to load account. Please try again.", 502);
    return authJson({ ok: true, customer: data.customer });
  } catch (error) {
    return transportFailure(error);
  }
}
