import { NextRequest } from "next/server";
import { authError, authJson, AUTH_TIMEOUT_MS, BACKEND_URL, checkAuthOrigin } from "@/lib/auth-request";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";

export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (token) {
    try {
      const result = await fetch(`${BACKEND_URL}/auth/logout`, { method: "POST", headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) });
      if (!result.ok && result.status !== 401) return authError("Sign-out could not be completed. Try again.", 503);
    } catch {
      return authError("Sign-out could not be completed. Try again.", 503);
    }
  }
  const response = authJson({ ok: true });

  // Clear single authoritative HttpOnly cookie
  response.cookies.set(AUTH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  // Explicit migration cleanup: clear legacy cookies if present from prior architecture
  response.cookies.set("vi2_access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("vi2_refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
