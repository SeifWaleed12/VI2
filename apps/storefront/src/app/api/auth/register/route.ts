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
    const { email, password, firstName, lastName, phone } = body || {};

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { ok: false, message: "All required fields must be provided." },
        { status: 400 }
      );
    }

    // Call Medusa backend registration endpoint.
    // The backend owns identity creation, customer account creation, and compensation logic.
    const backendRes = await fetch(`${BACKEND_URL}/store/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone ? phone.trim() : undefined,
      }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok || !data.token) {
      return NextResponse.json(
        {
          ok: false,
          message: data.message || "Registration failed. Please try again.",
        },
        { status: backendRes.status || 400 }
      );
    }

    const response = NextResponse.json(
      { ok: true, customer: data.customer },
      { status: 201 }
    );

    // Set single authoritative HttpOnly cookie with Medusa JWT
    response.cookies.set(AUTH_TOKEN_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: AUTH_TOKEN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/register] BFF error:", error);
    return NextResponse.json(
      { ok: false, message: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
