import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";
const ORDER_FIELDS =
  "*items,*items.variant,*items.product,*shipping_address,*shipping_methods";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ orders: [] }, { status: 200 });
  }

  const limit = request.nextUrl.searchParams.get("limit") || "20";
  const params = new URLSearchParams({
    limit,
    fields: ORDER_FIELDS,
  });

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/orders?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({ orders: data.orders || [] }, { status: 200 });
  } catch (error) {
    console.error("[orders] BFF error:", error);
    return NextResponse.json({ orders: [] }, { status: 200 });
  }
}
