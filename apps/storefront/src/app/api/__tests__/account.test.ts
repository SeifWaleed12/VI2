import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "../account/[...path]/route";

const request = (path: string, { method = "GET", body, token = true, origin = "http://localhost" }: { method?: string; body?: unknown; token?: boolean; origin?: string } = {}) =>
  new NextRequest(`http://localhost/api/account/${path}`, {
    method,
    headers: { origin, ...(token ? { cookie: "vi2_auth_token=test-token" } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const backend = () => jest.mocked(fetch).mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(Response.json({ customer: {} }));
});

it.each(["unknown", "addresses/addr_1/extra", "addresses/..%2Fx", "points/1"])("refuses a path it does not know: %s", async (path) => {
  expect((await GET(request(path), context(path))).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});

it("refuses a method the path does not allow", async () => {
  expect((await GET(request("email"), context("email"))).status).toBe(405);
  expect((await DELETE(request("points", { method: "DELETE" }), context("points"))).status).toBe(405);
  expect(fetch).not.toHaveBeenCalled();
});

it("needs a session, except for confirming an email from its link", async () => {
  expect((await GET(request("points", { token: false }), context("points"))).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
  await POST(request("email-confirm", { method: "POST", body: { token: "a.b" }, token: false }), context("email-confirm"));
  const [url, init] = backend();
  expect(url).toMatch(/\/store\/email-change\/confirm$/);
  expect(init.headers.Authorization).toBeUndefined();
});

it("refuses changes from another site", async () => {
  const response = await POST(request("profile", { method: "POST", body: { first_name: "Sara" }, origin: "https://evil.example" }), context("profile"));
  expect(response.status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});

it("passes on only the fields each path allows, with the session", async () => {
  await POST(request("profile", { method: "POST", body: { first_name: "Sara", email: "x@y.z", metadata: { a: 1 } } }), context("profile"));
  const [url, init] = backend();
  expect(url).toMatch(/\/store\/customers\/me$/);
  expect(JSON.parse(init.body as string)).toEqual({ first_name: "Sara" });
  expect(init.headers.Authorization).toBe("Bearer test-token");
});

it("returns the backend's error code, and clears an expired session", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(Response.json({ code: "wrong_password" }, { status: 400 }));
  const wrong = await POST(request("email", { method: "POST", body: { email: "a@b.c", password: "x" } }), context("email"));
  expect(wrong.status).toBe(400);
  expect(await wrong.json()).toEqual(expect.objectContaining({ ok: false, code: "wrong_password" }));

  jest.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 401 }));
  const expired = await GET(request("addresses"), context("addresses"));
  expect(expired.status).toBe(401);
  expect(expired.headers.get("set-cookie")).toContain("Max-Age=0");
});

it("lists addresses with a limit, but saves without one", async () => {
  await GET(request("addresses"), context("addresses"));
  await POST(request("addresses", { method: "POST", body: { city: "Giza" } }), context("addresses"));
  const [[list], [save]] = jest.mocked(fetch).mock.calls as [string][];
  expect(list).toMatch(/\/store\/customers\/me\/addresses\?limit=50$/);
  expect(save).toMatch(/\/store\/customers\/me\/addresses$/);
});

it("reaches a saved address by its id", async () => {
  await DELETE(request("addresses/caaddr_123", { method: "DELETE" }), context("addresses/caaddr_123"));
  expect(backend()[0]).toMatch(/\/store\/customers\/me\/addresses\/caaddr_123$/);
});
