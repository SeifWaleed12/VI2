import { NextRequest } from "next/server";
import { accountTarget, type AccountMethod as Method } from "@/lib/account-targets";
import { AUTH_COOKIE, AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, expiredSession, readAuthBody, transportFailure } from "@/lib/auth-request";

// Account changes for the signed-in customer, passed to the backend with the
// HttpOnly session cookie (see docs/reviews/account-page-backend.md for the
// backend contract). Backend error codes are passed through for the page.
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }, method: Method) {
  const target = accountTarget((await context.params).path);
  if (!target) return authError("Not found.", 404);
  if (!target.methods.includes(method)) return authError("Method not allowed.", 405);
  if (method !== "GET") {
    const originError = checkAuthOrigin(request);
    if (originError) return originError;
  }
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (target.signedIn && !token) return expiredSession();
  let body: string | undefined;
  if (method === "POST") {
    const input = await readAuthBody(request);
    if (!input) return authError("Invalid request.", 400);
    body = JSON.stringify(Object.fromEntries(target.fields.filter((field) => field in input).map((field) => [field, input[field]])));
  }
  try {
    const query = method === "GET" && target.listQuery ? `?${target.listQuery}` : "";
    const backend = await fetch(`${BACKEND_URL}${target.backend}${query}`, {
      method,
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...(target.signedIn ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (backend.status === 401 && target.signedIn) return expiredSession();
    if (backend.status >= 500 || backend.status === 403 || backend.status === 429) return backendFailure(backend.status);
    const data = await backend.json().catch(() => ({}));
    return authJson({ ...data, ok: backend.ok }, backend.status);
  } catch (error) {
    return transportFailure(error);
  }
}

type Context = { params: Promise<{ path: string[] }> };
export const GET = (request: NextRequest, context: Context) => handle(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => handle(request, context, "POST");
export const DELETE = (request: NextRequest, context: Context) => handle(request, context, "DELETE");
