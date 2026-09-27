import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, customer: null }, { status: 200 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { ok: true, customer: data.customer },
        { status: 200 }
      );
    }

    if (res.status === 401) {
      // The JWT is invalid or expired — clear the stale cookie
      const response = NextResponse.json(
        { ok: false, customer: null },
        { status: 200 }
      );
      response.cookies.set(AUTH_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
      return response;
    }

    // Backend error (e.g. 5xx or temporary network timeout):
    // Do NOT clear the cookie; return unauthenticated state for now so user can retry
    return NextResponse.json({ ok: false, customer: null }, { status: 200 });
  } catch (error) {
    console.error("[auth/me] BFF error:", error);
    return NextResponse.json({ ok: false, customer: null }, { status: 200 });
  }
}
