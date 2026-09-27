import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";
const AUTH_TOKEN_MAX_AGE = 86400; // 1 day

/**
 * POST /api/auth/refresh
 *
 * Sliding renewal of the existing, unexpired Medusa JWT.
 * Medusa's POST /auth/token/refresh accepts a valid JWT in Authorization: Bearer
 * and returns a freshly signed JWT.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "No active session." },
      { status: 401 }
    );
  }

  try {
    const refreshResponse = await fetch(`${BACKEND_URL}/auth/token/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    });

    if (!refreshResponse.ok) {
      // Existing token is already expired or invalid — clear cookie
      const response = NextResponse.json(
        { ok: false, message: "Session expired. Please sign in again." },
        { status: 401 }
      );
      response.cookies.set(AUTH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
      return response;
    }

    const data = await refreshResponse.json();
    const newToken: string | undefined =
      typeof data === "string" ? data : data.token;

    if (!newToken) {
      return NextResponse.json(
        { ok: false, message: "Token renewal failed: no token in response." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });

    // Update single authoritative cookie with renewed JWT
    response.cookies.set(AUTH_TOKEN_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: AUTH_TOKEN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/refresh] BFF error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to renew session." },
      { status: 500 }
    );
  }
}
