import Medusa from "@medusajs/js-sdk";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const AUTH_TOKEN_COOKIE = "vi2_auth_token";

/**
 * Creates an authenticated, per-request Medusa SDK instance on the server.
 *
 * Reads the vi2_auth_token HttpOnly cookie and forwards it as an
 * Authorization: Bearer header for authenticated Medusa API calls.
 * Falls back to a public client if no token is present.
 */
export async function getMedusaServerClient(): Promise<Medusa> {
  let authToken = "";

  try {
    const cookieStore = await cookies();
    authToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value || "";
  } catch {
    // Called outside request context (e.g. static build or pre-render)
  }

  return new Medusa({
    baseUrl: BACKEND_URL,
    publishableKey: PUBLISHABLE_KEY,
    auth: {
      type: "jwt",
    jwtTokenStorageMethod: "nostore",
    },
    globalHeaders: authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {},
  });
}

/**
 * Public server client for unauthenticated/cached public catalog data
 * (products, categories, collections). No auth headers.
 */
export const medusaServer = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  auth: {
    type: "jwt",
    jwtTokenStorageMethod: "nostore",
  },
});
