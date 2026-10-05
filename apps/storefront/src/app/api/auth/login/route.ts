import { NextRequest } from "next/server";
import { AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, readAuthBody, readToken, setAuthCookie, transportFailure, validCredentials, validCustomer } from "@/lib/auth-request";

export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const body = await readAuthBody(request);
  if (!validCredentials(body)) return authError("Provide a valid email and password.", 400);
  const signal = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  try {
    const auth = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-publishable-api-key": PUBLISHABLE_KEY },
      body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password }),
      cache: "no-store", signal,
    });
    if (!auth.ok) {
      if (auth.status === 400 || auth.status === 401) return authError("Invalid email or password.", 401);
      return backendFailure(auth.status);
    }
    const token = readToken(await auth.json());
    if (!token) return authError("Unable to sign in. Please try again.", 502);
    const profile = await fetch(`${BACKEND_URL}/store/customers/me`, {
      headers: { Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY }, cache: "no-store", signal,
    });
    if (!profile.ok) return backendFailure(profile.status);
    const data = await profile.json();
    if (!validCustomer(data?.customer)) return authError("Unable to sign in. Please try again.", 502);
    const response = authJson({ ok: true, customer: data.customer });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return transportFailure(error);
  }
}
