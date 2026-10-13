import { NextRequest } from "next/server";
import { AUTH_COOKIE, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, checkAuthOrigin, readAuthBody, transportFailure } from "@/lib/auth-request";

const COMPLETE_TIMEOUT_MS = 30_000;

// Places the order with the customer's login when signed in: the backend gives
// an order to the customer signed in when it is placed, and keeps a
// customer's cart to their login. The login cookie is HttpOnly, so the browser
// cannot send it to Medusa itself.
export async function POST(request: NextRequest) {
  const blocked = checkAuthOrigin(request);
  if (blocked) return blocked;
  const body = await readAuthBody(request);
  const cartId = body?.cartId;
  if (typeof cartId !== "string" || !/^cart_[A-Za-z0-9]+$/.test(cartId)) return authError("Invalid cart.", 400);
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  try {
    const backend = await fetch(`${BACKEND_URL}/store/carts/${cartId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: "{}", cache: "no-store", signal: AbortSignal.timeout(COMPLETE_TIMEOUT_MS),
    });
    const data: unknown = await backend.json().catch(() => null);
    return data ? authJson(data, backend.status) : authError("Service temporarily unavailable. Please try again.", 502);
  } catch (error) {
    return transportFailure(error);
  }
}
