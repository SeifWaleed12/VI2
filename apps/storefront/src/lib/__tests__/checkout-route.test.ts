import { NextRequest } from "next/server";
import { POST as completeCheckout } from "@/app/api/checkout/complete/route";

const token = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.dGVzdA";

function post(body: unknown, options: { origin?: string; cookie?: boolean } = {}) {
  return new NextRequest("https://shop.example/api/checkout/complete", {
    method: "POST", headers: {
      origin: options.origin ?? "https://shop.example",
      "content-type": "application/json",
      ...(options.cookie ? { cookie: `vi2_auth_token=${token}` } : {}),
    }, body: JSON.stringify(body),
  });
}

let fetchMock: jest.SpyInstance;
beforeEach(() => { fetchMock = jest.spyOn(global, "fetch"); });
afterEach(() => { jest.restoreAllMocks(); });

test("places a signed-in customer's order with their login", async () => {
  fetchMock.mockResolvedValue(Response.json({ type: "order", order: { id: "order_1" } }));
  const response = await completeCheckout(post({ cartId: "cart_01ABC" }, { cookie: true }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ type: "order", order: { id: "order_1" } });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toMatch(/\/store\/carts\/cart_01ABC\/complete$/);
  expect(options.headers.Authorization).toBe(`Bearer ${token}`);
});

test("places a guest order without a login", async () => {
  fetchMock.mockResolvedValue(Response.json({ type: "order", order: { id: "order_2" } }));
  expect((await completeCheckout(post({ cartId: "cart_01ABC" }))).status).toBe(200);
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test("passes the backend's refusal on unchanged", async () => {
  fetchMock.mockResolvedValue(Response.json({ message: "This cart belongs to a customer account." }, { status: 403 }));
  const response = await completeCheckout(post({ cartId: "cart_01ABC" }));
  expect(response.status).toBe(403);
  expect((await response.json()).message).toBe("This cart belongs to a customer account.");
});

test.each([{}, { cartId: "../admin" }, { cartId: 5 }])("rejects %j before calling the backend", async (body) => {
  expect((await completeCheckout(post(body))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("rejects requests from other sites", async () => {
  expect((await completeCheckout(post({ cartId: "cart_01ABC" }, { origin: "https://evil.example", cookie: true }))).status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});
