import Medusa from "@medusajs/js-sdk";

/**
 * Browser-side Medusa SDK client.
 *
 * Uses JWT auth type. Authentication tokens are stored in HttpOnly cookies
 * (managed by Next.js Route Handlers at /api/auth/*), so the SDK itself does
 * NOT manage token storage. This client is used only for public (unauthenticated)
 * store requests like fetching products, regions, etc.
 *
 * For authenticated requests from the browser, use the /api/auth/* route handlers.
 * For authenticated requests from the server, use getMedusaServerClient().
 */
export const medusa = new Medusa({
  baseUrl:
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
  auth: {
    type: "jwt",
    jwtTokenStorageMethod: "nostore",
  },
});

// A timeout is an unknown mutation outcome; callers reconcile the same cart.
// No automatic write retries are introduced here.
const publicFetch = medusa.client.fetch_.bind(medusa.client);
medusa.client.fetch_ = (input, init = {}) => {
  const deadline = AbortSignal.timeout(15_000);
  return publicFetch(input, { ...init, signal: init.signal ? AbortSignal.any([init.signal, deadline]) : deadline });
};
