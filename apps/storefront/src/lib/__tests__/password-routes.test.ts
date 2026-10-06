import { NextRequest } from "next/server";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as changePassword } from "@/app/api/auth/password/route";

const token = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.dGVzdA";
const resetToken = "eyJhbGciOiJIUzI1NiJ9.eyJwdXJwb3NlIjoicmVzZXQifQ.cmVzZXQ";

function post(body: unknown, options: { origin?: string; cookie?: boolean } = {}) {
  return new NextRequest("https://shop.example/api/auth/password", {
    method: "POST", headers: {
      origin: options.origin ?? "https://shop.example",
      "content-type": "application/json",
      ...(options.cookie ? { cookie: `vi2_auth_token=${token}` } : {}),
    }, body: JSON.stringify(body),
  });
}

const json = (data: unknown, status = 200) => Response.json(data, { status });
let fetchMock: jest.SpyInstance;
beforeEach(() => { fetchMock = jest.spyOn(global, "fetch"); });
afterEach(() => { jest.restoreAllMocks(); });

test.each([
  [forgotPassword, { email: "a@example.com" }],
  [resetPassword, { token: resetToken, password: "new-password" }],
  [changePassword, { currentPassword: "old-password", newPassword: "new-password" }],
])("rejects cross-origin password requests before backend calls", async (handler, body) => {
  expect((await handler(post(body, { origin: "https://evil.example", cookie: true }))).status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("forgot password sends the lowercased email and gives the same answer either way", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
  const response = await forgotPassword(post({ email: " Shopper@Example.com " }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.message).toContain("If an account exists");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ identifier: "shopper@example.com" });
  expect(fetchMock.mock.calls[0][0]).toContain("/auth/customer/emailpass/reset-password");
});

test("forgot password passes on the request limit", async () => {
  fetchMock.mockResolvedValue(json({ message: "Too many attempts" }, 429));
  const response = await forgotPassword(post({ email: "shopper@example.com" }));
  expect(response.status).toBe(429);
  expect((await response.json()).message).toBe("Too many attempts. Please try again later.");
});

test.each([{}, { email: "not-an-email" }])("forgot password rejects %j", async (body) => {
  expect((await forgotPassword(post(body))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("reset password sends the token as a bearer token, not in the body", async () => {
  fetchMock.mockResolvedValue(json({ success: true }));
  const response = await resetPassword(post({ token: resetToken, password: "new-password" }));
  expect(response.status).toBe(200);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toContain("/auth/customer/emailpass/update");
  expect(options.headers.Authorization).toBe(`Bearer ${resetToken}`);
  expect(JSON.parse(options.body)).toEqual({ password: "new-password" });
  expect(response.headers.get("set-cookie")).toBeNull();
});

test.each([
  [400, "at least 8 characters"],
  [401, "invalid or has expired"],
])("reset password explains a backend %s without touching the session", async (status, message) => {
  fetchMock.mockResolvedValue(json({ message: "private detail" }, status));
  const response = await resetPassword(post({ token: resetToken, password: "new-password" }, { cookie: true }));
  expect(response.status).toBe(400);
  expect((await response.json()).message).toContain(message);
  expect(response.headers.get("set-cookie")).toBeNull();
});

test.each([{ token: "not-a-jwt", password: "new-password" }, { token: resetToken }])("reset password rejects %j", async (body) => {
  expect((await resetPassword(post(body))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("change password needs a session", async () => {
  expect((await changePassword(post({ currentPassword: "a", newPassword: "b" }))).status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("change password forwards the session and both passwords", async () => {
  fetchMock.mockResolvedValue(json({ success: true }));
  const response = await changePassword(post({ currentPassword: "old-password", newPassword: "new-password" }, { cookie: true }));
  expect(response.status).toBe(200);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toContain("/store/customers/me/password");
  expect(options.headers.Authorization).toBe(`Bearer ${token}`);
  expect(JSON.parse(options.body)).toEqual({ current_password: "old-password", new_password: "new-password" });
});

test.each([
  ["wrong_password", "current password is not correct"],
  ["weak_password", "at least 8 characters"],
  ["something_else", "Check the passwords"],
])("change password maps backend code %s to a safe message", async (code, message) => {
  fetchMock.mockResolvedValue(json({ code, message: "private detail" }, 400));
  const response = await changePassword(post({ currentPassword: "old-password", newPassword: "new-password" }, { cookie: true }));
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toContain(message);
  expect(JSON.stringify(body)).not.toContain("private detail");
});

test("change password passes on the attempt limit", async () => {
  fetchMock.mockResolvedValue(json({}, 429));
  expect((await changePassword(post({ currentPassword: "old-password", newPassword: "new-password" }, { cookie: true }))).status).toBe(429);
});
