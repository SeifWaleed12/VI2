import { NextResponse } from "next/server";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });

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
