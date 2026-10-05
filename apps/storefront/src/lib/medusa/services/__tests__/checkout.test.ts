import { medusa } from "../../client";
import { initiatePaymentSession } from "../payment";
import { completeCheckout } from "../checkout";
import { getOrder } from "../orders";

jest.mock("../../client", () => ({ medusa: { store: { cart: { complete: jest.fn() }, order: { retrieve: jest.fn() } } } }));
jest.mock("../payment", () => ({ initiatePaymentSession: jest.fn() }));
const complete = jest.mocked(medusa.store.cart.complete);
const payment = jest.mocked(initiatePaymentSession);
const retrieve = jest.mocked(medusa.store.order.retrieve);

beforeEach(() => { jest.resetAllMocks(); payment.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof initiatePaymentSession>>); });

it.each([
  { type: "cart", error: { message: "provider-secret" } },
  { type: "cart" }, {}, { type: "order" }, { type: "order", order: { id: "" } },
])("does not confirm unsuccessful or malformed completion %j", async (result) => {
  complete.mockResolvedValue(result as never);
  const outcome = await completeCheckout("cart_123");
  expect(outcome.ok).toBe(false);
  expect(JSON.stringify(outcome)).not.toContain("provider-secret");
});

it("requires a Medusa order ID for success", async () => {
  complete.mockResolvedValue({ type: "order", order: { id: "order_123" } } as never);
  expect(await completeCheckout("cart_123")).toEqual({ ok: true, orderId: "order_123" });
});

it("does not complete after payment initialization failure", async () => {
  payment.mockResolvedValue({ ok: false, error: "private gateway data" });
  expect(await completeCheckout("cart_123")).toMatchObject({ ok: false, unknown: true });
  expect(complete).not.toHaveBeenCalled();
});

it("treats a network timeout as unknown and resumes the same cart after refresh", async () => {
  complete.mockRejectedValueOnce(new Error("network timeout")).mockResolvedValueOnce({ type: "order", order: { id: "order_123" } } as never);
  expect(await completeCheckout("cart_123")).toMatchObject({ ok: false, unknown: true });
  expect(await completeCheckout("cart_123", true)).toEqual({ ok: true, orderId: "order_123" });
  expect(payment).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls.map((call) => call[0])).toEqual(["cart_123", "cart_123"]);
});

it("repeated confirmation uses native completion without starting a new payment", async () => {
  complete.mockResolvedValue({ type: "order", order: { id: "order_123" } } as never);
  expect(await completeCheckout("cart_123", true)).toEqual(await completeCheckout("cart_123", true));
  expect(payment).not.toHaveBeenCalled();
});

it.each(["", "VI2-123456", "cart_123", "../order_123"])("does not fetch an invented confirmation reference %s", async (id) => {
  expect(await getOrder(id)).toBeNull();
  expect(retrieve).not.toHaveBeenCalled();
});

it("refresh retrieves current server totals and status with no contact fields", async () => {
  retrieve.mockResolvedValue({ order: { id: "order_123", status: "pending", payment_status: "not_paid", total: 200, currency_code: "egp", items: [] } } as never);
  expect(await getOrder("order_123")).toMatchObject({ total: 200, paymentStatus: "not_paid" });
  expect(retrieve.mock.calls[0][1]?.fields).not.toMatch(/email|address/);
});

it("does not confuse an outage with a missing order", async () => {
  retrieve.mockRejectedValueOnce({ status: 404 }).mockRejectedValueOnce({ status: 503 });
  expect(await getOrder("order_123")).toBeNull();
  await expect(getOrder("order_123")).rejects.toThrow("temporarily unavailable");
});
