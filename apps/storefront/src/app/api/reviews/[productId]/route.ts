import type { NextRequest } from "next/server";
import { isLocale, medusaLocale } from "@/lib/i18n";
import { AUTH_COOKIE, AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, expiredSession, readAuthBody, transportFailure } from "@/lib/auth-request";

type Context = { params: Promise<{ productId: string }> };
async function proxy(request: NextRequest, context: Context, method: "GET" | "POST" | "DELETE") {
  if (method !== "GET") {
    const refused = checkAuthOrigin(request);
    if (refused) return refused;
  }
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return expiredSession();
  const { productId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) return authError("Invalid product.", 400);
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale)) return authError("Invalid language.", 400);
  let body: Record<string, unknown> | null = null;
  if (method !== "GET") {
    body = await readAuthBody(request);
    if (!body) return authError("Invalid review request.", 400);
  }
  try {
    const backend = await fetch(`${BACKEND_URL}/store/products/${encodeURIComponent(productId)}/reviews/me`, {
      method, headers: { Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY, "x-medusa-locale": medusaLocale(locale), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if ([400, 404, 409].includes(backend.status)) return authError(backend.status === 409 ? "Review changed. Reload before trying again." : "Invalid review request.", backend.status);
    if (!backend.ok) return backendFailure(backend.status);
    const result = await backend.json();
    if (!result || !("review" in result)) return authError("Invalid review response.", 502);
    return authJson({ review: result.review });
  } catch (error) { return transportFailure(error); }
}
export const GET = (request: NextRequest, context: Context) => proxy(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => proxy(request, context, "POST");
export const DELETE = (request: NextRequest, context: Context) => proxy(request, context, "DELETE");
