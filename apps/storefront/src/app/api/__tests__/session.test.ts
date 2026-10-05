import { NextRequest } from "next/server";
import { GET as orders } from "../orders/route";
import { GET as me } from "../auth/me/route";
import { POST as refresh } from "../auth/refresh/route";
import { POST as login } from "../auth/login/route";
import { POST as register } from "../auth/register/route";

const request = (path: string, body?: unknown, token = true) => new NextRequest(`http://localhost${path}`, {
  method: body === undefined ? "GET" : "POST",
  headers: { origin: "http://localhost", ...(token ? { cookie: "vi2_auth_token=test-token" } : {}), "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
beforeEach(() => { global.fetch = jest.fn(); });

it.each([orders, me, refresh])("preserves the session cookie during an outage", async (handler) => {
  jest.mocked(fetch).mockResolvedValue(new Response("{}", { status: 503 }));
  const response = await handler(request("/api/test"));
  expect(response.status).toBe(503);
  expect(response.headers.get("set-cookie")).toBeNull();
});
it.each([orders, me, refresh])("clears an expired cookie and reports 401", async (handler) => {
  jest.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
  const response = await handler(request("/api/test"));
  expect(response.status).toBe(401);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});
it("does not present unauthenticated order history as an empty successful list", async () => {
  expect((await orders(request("/api/orders", undefined, false))).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});
it.each(["-1", "1000", "abc"])("rejects invalid pagination %s", async (limit) => {
  expect((await orders(request(`/api/orders?limit=${limit}`))).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it.each([null, [], { email: 123, password: [] }, { email: "bad", password: "x" }])("rejects malformed auth input before contacting Medusa", async (body) => {
  expect((await login(request("/api/auth/login", body))).status).toBe(400);
  expect((await register(request("/api/auth/register", body))).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("sets a bounded timeout on backend requests", async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"orders":[]}'));
  expect((await orders(request("/api/orders"))).status).toBe(200);
  expect(jest.mocked(fetch).mock.calls[0][1]).toMatchObject({ cache: "no-store", signal: expect.any(AbortSignal) });
});
