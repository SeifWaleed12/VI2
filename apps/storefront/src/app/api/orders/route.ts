import { NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, expiredSession, transportFailure } from "@/lib/auth-request";

const ORDER_FIELDS = "*items,*items.variant,*items.product,*shipping_address,*shipping_methods";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return expiredSession();
  const limit = request.nextUrl.searchParams.get("limit") || "20";
  if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) return authError("Invalid order limit.", 400);
  const params = new URLSearchParams({ limit, fields: ORDER_FIELDS });
  try {
    const backend = await fetch(`${BACKEND_URL}/store/orders?${params}`, {
      headers: { Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY },
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (!backend.ok) return backendFailure(backend.status);
    const data = await backend.json();
    if (!Array.isArray(data?.orders)) return authError("Unable to load order history. Please try again.", 502);
    return authJson({ orders: data.orders });
  } catch (error) {
    return transportFailure(error);
  }
}
