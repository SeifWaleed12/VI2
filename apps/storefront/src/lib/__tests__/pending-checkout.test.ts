import { forgetDetails, forgetPendingCart, pendingCartId, rememberPendingCart, saveDetails, savedDetails } from "../pending-checkout";

const store = new Map<string, string>();
beforeAll(() => {
  Object.assign(globalThis, { window: { sessionStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  } } });
});
afterAll(() => { delete (globalThis as { window?: unknown }).window; });
beforeEach(() => store.clear());

const empty = { name: "", phone: "", governorate: "" };

it("keeps typed details under the prefix sign-out clears, and only the known text fields", () => {
  expect(savedDetails(empty)).toBeNull();
  saveDetails({ name: "Mona", phone: "01012345678", governorate: "Cairo" });
  expect([...store.keys()].every((key) => key.startsWith("vi2-pending-checkout:"))).toBe(true);
  expect(savedDetails(empty)).toEqual({ name: "Mona", phone: "01012345678", governorate: "Cairo" });
  store.set("vi2-pending-checkout:details", JSON.stringify({ name: 5, extra: "x", phone: "010" }));
  expect(savedDetails(empty)).toEqual({ name: "", phone: "010", governorate: "" });
  store.set("vi2-pending-checkout:details", "{not json");
  expect(savedDetails(empty)).toBeNull();
  forgetDetails();
  expect(savedDetails(empty)).toBeNull();
});

it("remembers and forgets the unconfirmed cart, and survives disabled storage", () => {
  rememberPendingCart("cart_1");
  expect(pendingCartId()).toBe("cart_1");
  forgetPendingCart();
  expect(pendingCartId()).toBeNull();
  const original = (globalThis as unknown as { window: unknown }).window;
  Object.assign(globalThis, { window: { get sessionStorage() { throw new Error("blocked"); } } });
  expect(() => { rememberPendingCart("cart_2"); saveDetails({ name: "x" }); }).not.toThrow();
  expect(pendingCartId()).toBeNull();
  Object.assign(globalThis, { window: original });
});
