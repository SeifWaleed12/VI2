import { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE = "vi2_auth_token";
export const AUTH_TIMEOUT_MS = 10_000;
export const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

export function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function authError(message: string, status: number) {
  return authJson({ ok: false, message }, status);
}

// Browser POSTs must originate from this storefront, including login (which
// establishes a new session and cannot rely on SameSite on an existing cookie).
export function checkAuthOrigin(request: NextRequest) {
  const expected = process.env.STOREFRONT_ORIGIN || request.nextUrl.origin;
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    return authError("Request origin is not allowed.", 403);
  }
  return null;
}

export async function readAuthBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return null;
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function validText(value: unknown, max = 255): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function validEmail(value: unknown): value is string {
  return validText(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validCredentials(body: Record<string, unknown> | null): body is Record<string, unknown> & { email: string; password: string } {
  return !!body && validEmail(body.email) && validText(body.password, 1024);
}

export function readToken(data: unknown): string | null {
  const token = typeof data === "string" ? data
    : data && typeof data === "object" && "token" in data ? data.token : null;
  return typeof token === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : null;
}

export function validCustomer(value: unknown): value is { id: string; email: string } {
  return !!value && typeof value === "object" && "id" in value && "email" in value
    && validText(value.id) && validText(value.email, 254);
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", maxAge: token ? 86400 : 0, path: "/",
  });
}

export function expiredSession() {
  const response = authError("Session expired. Please sign in again.", 401);
  setAuthCookie(response, "");
  return response;
}

export function backendFailure(status: number) {
  if (status === 401) return expiredSession();
  if (status === 403) return authError("Access is not allowed.", 403);
  if (status === 429) return authError("Too many attempts. Please try again later.", 429);
  return authError("Service temporarily unavailable. Please try again.", 503);
}

export function transportFailure(error: unknown) {
  const timeout = !!error && typeof error === "object" && "name" in error
    && (error.name === "TimeoutError" || error.name === "AbortError");
  return authError(timeout ? "Request timed out. Please try again." : "Service temporarily unavailable. Please try again.", timeout ? 504 : 503);
}
