import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";
const AUTH_TOKEN_MAX_AGE = 86400; // 1 day (matches 24h JWT expiration)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    // Call Medusa native emailpass authentication
    const authResponse = await fetch(
      `${BACKEND_URL}/auth/customer/emailpass`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email: email.trim(), password }),
      }
    );

    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          ok: false,
          message:
            (errorData as { message?: string }).message ||
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const authData = await authResponse.json();
    const token: string | undefined =
      typeof authData === "string" ? authData : authData.token;

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Authentication failed: no token received." },
        { status: 500 }
      );
    }

    // Fetch customer profile to return to the UI (transport composition)
    let customer = null;
    const customerResponse = await fetch(
      `${BACKEND_URL}/store/customers/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    );

    if (customerResponse.ok) {
      const customerData = await customerResponse.json();
      customer = customerData.customer;
    }

    const response = NextResponse.json(
      { ok: true, customer },
      { status: 200 }
    );

    // Set single authoritative HttpOnly cookie with Medusa JWT
    response.cookies.set(AUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: AUTH_TOKEN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/login] BFF error:", error);
    return NextResponse.json(
      { ok: false, message: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
