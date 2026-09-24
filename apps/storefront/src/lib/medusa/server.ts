import Medusa from "@medusajs/js-sdk";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

/**
 * Creates a stateless, per-request Medusa SDK instance on the server.
 * Automatically forwards session cookies for authenticated requests without
 * mutating any shared global state.
 */
export async function getMedusaServerClient(): Promise<Medusa> {
  let cookieHeader = "";

  try {
    const cookieStore = await cookies();
    cookieHeader = cookieStore.toString();
  } catch {
    // Called outside request context (e.g. static build or pre-render)
  }

  return new Medusa({
    baseUrl: BACKEND_URL,
    publishableKey: PUBLISHABLE_KEY,
    globalHeaders: cookieHeader ? { cookie: cookieHeader } : {},
    auth: {
      type: "session",
    },
  });
}

/**
 * Public server client for unauthenticated/cached public catalog data
 * (products, categories, collections).
 */
export const medusaServer = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  auth: {
    type: "session",
  },
});
