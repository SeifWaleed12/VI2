import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/reviews/[productId]/route";
const context = { params: Promise.resolve({ productId: "prod_a" }) };
const cookieToken = `e30.${Buffer.from(JSON.stringify({ actor_id: "customer_a", actor_type: "customer" })).toString("base64url")}.signature`;
const request = (method = "GET", origin = "http://localhost:3000", token = true, assertedCustomer: string | null = "customer_a", sessionToken = cookieToken) => new NextRequest("http://localhost:3000/api/reviews/prod_a?locale=ar", {
  method, headers: { origin, ...(assertedCustomer ? { "x-review-customer-id": assertedCustomer } : {}), ...(token ? { cookie: `vi2_auth_token=${sessionToken}` } : {}), ...(method !== "GET" ? { "Content-Type": "application/json" } : {}) },
  ...(method !== "GET" ? { body: JSON.stringify({ rating: 1, content: "A disappointing experience indeed.", version: 1 }) } : {}),
});
afterEach(() => jest.restoreAllMocks());
it("never forwards unauthenticated or cross-origin writes", async () => {
  const fetcher = jest.spyOn(global, "fetch");
  expect((await GET(request("GET", undefined, false), context)).status).toBe(401);
  expect((await POST(request("POST", "https://attacker.example"), context)).status).toBe(403);
  expect((await DELETE(request("DELETE", "https://attacker.example"), context)).status).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
});
it("forwards only the cookie session to Medusa with explicit locale and no cache", async () => {
  const fetcher = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ review: null }), { status: 200 }));
  const response = await GET(request(), context);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ review: null });
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/store/products/prod_a/reviews/me"), expect.objectContaining({ cache: "no-store", headers: expect.objectContaining({ Authorization: `Bearer ${cookieToken}`, "x-medusa-locale": "ar-EG" }) }));
});
it.each([400, 404, 409, 429, 503])("preserves useful status %s without leaking backend messages", async status => {
  jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "private internal error" }), { status }));
  const response = await POST(request("POST"), context);
  expect(response.status).toBe(status);
  expect(JSON.stringify(await response.json())).not.toContain("private internal");
  expect(response.headers.get("Set-Cookie")).toBeNull();
});
it("clears only an actually expired session and leaves it intact on an outage", async () => {
  jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
  expect((await GET(request(), context)).headers.get("Set-Cookie")).toContain("Max-Age=0");
});

it.each(["GET", "POST", "DELETE"])("blocks a stale account assertion on %s without clearing the new account's cookie", async method => {
  const fetcher = jest.spyOn(global, "fetch");
  const handler = method === "GET" ? GET : method === "POST" ? POST : DELETE;
  const response = await handler(request(method, undefined, true, "customer_b"), context);
  expect(response.status).toBe(401);
  expect(response.headers.get("Set-Cookie")).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([null, ""])("requires the displayed account assertion (%s)", async assertion => {
  const fetcher = jest.spyOn(global, "fetch");
  expect((await POST(request("POST", undefined, true, assertion), context)).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects malformed cookie payloads and clears the unusable session", async () => {
  const fetcher = jest.spyOn(global, "fetch");
  const response = await POST(request("POST", undefined, true, "customer_a", "not-a-token"), context);
  expect(response.status).toBe(401);
  expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  expect(fetcher).not.toHaveBeenCalled();
});
it("still asks Medusa to authenticate a matching assertion rather than trusting decoded claims", async () => {
  const fetcher = jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
  const response = await POST(request("POST"), context);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(response.status).toBe(401);
  expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
});
