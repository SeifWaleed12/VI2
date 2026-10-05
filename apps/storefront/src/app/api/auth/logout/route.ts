import { NextRequest } from "next/server";
import { authJson, checkAuthOrigin } from "@/lib/auth-request";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";

export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
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
