import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as orders } from "@/app/api/orders/route";
import { safeRedirect } from "../safe-redirect";

const token = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.dGVzdA";
const customer = { id: "cus_test", email: "test@example.com" };
const credentials = { email: "TEST@example.com", password: " test-password " };

function post(body: unknown = credentials, options: { origin?: string; type?: string; raw?: string; cookie?: boolean } = {}) {
  return new NextRequest("https://shop.example/api/auth/login", {
    method: "POST", headers: {
      origin: options.origin ?? "https://shop.example",
      "content-type": options.type ?? "application/json",
      ...(options.cookie ? { cookie: `vi2_auth_token=${token}` } : {}),
    }, body: options.raw ?? JSON.stringify(body),
  });
}

function get(cookie = true, suffix = "") {
  return new NextRequest(`https://shop.example/api/orders${suffix}`, {
    headers: cookie ? { cookie: `vi2_auth_token=${token}` } : {},
  });
}

const json = (data: unknown, status = 200) => Response.json(data, { status });
let fetchMock: jest.SpyInstance;
beforeEach(() => { fetchMock = jest.spyOn(global, "fetch"); });
afterEach(() => { jest.restoreAllMocks(); });

test.each(["javascript:alert(1)", "https://evil.example/", "//evil.example/", "/\\evil.example/", "/\nevil.example/", " /account", null])("rejects unsafe login redirect %s", (url) => {
  expect(safeRedirect(url)).toBe("/account");
});
test("preserves internal checkout redirects", () => {
  expect(safeRedirect("/checkout?step=address#delivery")).toBe("/checkout?step=address#delivery");
});

test.each([login, register, refresh, logout])("rejects cross-origin auth mutations before backend calls", async (handler) => {
  const response = await handler(post(credentials, { origin: "https://evil.example", cookie: true }));
  expect(response.status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

test.each([null, [], { email: 42, password: "secret" }, { email: "bad-email", password: "secret" }, { email: "test@example.com", password: {} }, { email: "test@example.com", password: " " }])("rejects invalid login body %j", async (body) => {
  expect((await login(post(body))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});
test.each([{ raw: "{" }, { type: "text/plain" }])("rejects malformed JSON or unsupported content type", async (options) => {
  expect((await login(post(credentials, options))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("login returns a verified customer and stores the JWT only in an HttpOnly cookie", async () => {
  fetchMock.mockResolvedValueOnce(json({ token })).mockResolvedValueOnce(json({ customer }));
  const response = await login(post());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, customer });
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
  expect(response.headers.get("cache-control")).toBe("no-store");
  const firstOptions = fetchMock.mock.calls[0][1];
  expect(JSON.parse(firstOptions.body)).toEqual({ email: "test@example.com", password: credentials.password });
  expect(firstOptions.signal).toBeInstanceOf(AbortSignal);
  expect(fetchMock.mock.calls[1][1].signal).toBe(firstOptions.signal);
});

test("login does not leak backend authentication errors", async () => {
  fetchMock.mockResolvedValue(json({ message: "private provider error" }, 401));
  const response = await login(post());
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ ok: false, message: "Invalid email or password." });
});

test("login refuses success if customer lookup fails", async () => {
  fetchMock.mockResolvedValueOnce(json({ token })).mockResolvedValueOnce(json({}, 500));
  const response = await login(post());
  expect(response.status).toBe(503);
  expect(response.headers.get("set-cookie")).toBeNull();
});
test.each([{}, { token: 123 }, { token: "not-a-jwt" }])("rejects malformed backend token %j", async (data) => {
  fetchMock.mockResolvedValue(json(data));
  expect((await login(post())).status).toBe(502);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each([me, orders])("missing session is distinct from empty results", async (handler) => {
  expect((await handler(get(false))).status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

test.each([me, orders, refresh])("backend outages preserve the cookie", async (handler) => {
  fetchMock.mockResolvedValue(json({ message: "private error" }, 500));
  const request = handler === refresh ? post({}, { cookie: true }) : get();
  const response = await handler(request);
  expect(response.status).toBe(503);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(JSON.stringify(await response.json())).not.toContain("private error");
});
test.each([me, orders, refresh])("expired backend session clears the cookie", async (handler) => {
  fetchMock.mockResolvedValue(json({}, 401));
  const request = handler === refresh ? post({}, { cookie: true }) : get();
  const response = await handler(request);
  expect(response.status).toBe(401);
  expect(response.cookies.get("vi2_auth_token")?.value).toBe("");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});

test("genuine empty order history is a successful empty result", async () => {
  fetchMock.mockResolvedValue(json({ orders: [] }));
  const response = await orders(get());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ orders: [] });
});
test("malformed order history is not presented as empty", async () => {
  fetchMock.mockResolvedValue(json({}));
  expect((await orders(get())).status).toBe(502);
});
test.each(["-1", "0", "101", "abc", "1.5"])("rejects invalid pagination %s", async (limit) => {
  expect((await orders(get(true, `?limit=${limit}`))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("timeout is bounded and not automatically retried", async () => {
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
  }));
  const aborted = AbortSignal.abort(new DOMException("Timed out", "TimeoutError"));
  // Simulate the native deadline firing without a ten-second test delay.
  jest.spyOn(AbortSignal, "timeout").mockReturnValue(aborted);
  fetchMock.mockRejectedValue(aborted.reason);
  const response = await login(post());
  expect(response.status).toBe(504);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});

test("registration validates optional phone before calling Medusa", async () => {
  const response = await register(post({ ...credentials, firstName: "Test", lastName: "User", phone: 12 }));
  expect(response.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});
test("registration timeout advises sign-in instead of automatic resubmission", async () => {
  fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
  const response = await register(post({ ...credentials, firstName: "Test", lastName: "User" }));
  expect(response.status).toBe(504);
  expect((await response.json()).message).toContain("Try signing in");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("logout expires current and legacy cookies", async () => {
  const response = await logout(post());
  expect(response.status).toBe(200);
  for (const key of ["vi2_auth_token", "vi2_access_token", "vi2_refresh_token"]) expect(response.cookies.get(key)?.value).toBe("");
});
