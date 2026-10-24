import { mapMedusaCart, promoFailure, promoOutcome } from "../cart";
import type { Cart } from "@/types/cart";

jest.mock("../../client", () => ({ medusa: {} }));
const cart = (codes: string[], savings: Record<string, number> = Object.fromEntries(codes.map((code) => [code.toUpperCase(), 100]))) =>
  ({ promotions: codes.map((code) => ({ code })), promotionSavings: savings }) as unknown as Cart;

it("counts a code as applied only when the cart now carries it, whatever its case", () => {
  expect(promoOutcome(cart(["VI20"]), " vi20 ")).toEqual({ ok: true });
});

it("says a real code that fits nothing in the cart does not apply, instead of claiming success", () => {
  // Medusa answers 200 and leaves such a code off the cart.
  expect(promoOutcome(cart([]), "VI20")).toEqual({ ok: false, reason: "not_applicable" });
  expect(promoOutcome(cart(["OTHER"]), "VI20")).toEqual({ ok: false, reason: "not_applicable" });
});

it("tells an unknown or ended code apart from a failed request", () => {
  expect(promoFailure({ status: 400, message: "The promotion code NOPE is invalid" })).toEqual({ ok: false, reason: "invalid" });
  expect(promoFailure(new Error("offline"))).toEqual({ ok: false, reason: "network" });
});

it("does not call a code applied when Medusa attaches it but it takes nothing off", () => {
  // For example a minimum order amount not reached yet.
  expect(promoOutcome(cart(["VI20"], { VI20: 0 }), "VI20")).toEqual({ ok: false, reason: "not_eligible" });
  expect(promoOutcome(cart(["VI20", "SHIP"], { SHIP: 70 }), "vi20")).toEqual({ ok: false, reason: "not_eligible" });
});

it("adds up what each code takes off across items and delivery", () => {
  const mapped = mapMedusaCart({
    id: "cart_1",
    items: [{ id: "i1", quantity: 1, unit_price: 500, adjustments: [{ code: "vi20", amount: 100 }] }, { id: "i2", quantity: 1, unit_price: 300, adjustments: [{ code: "VI20", amount: "60" }] }],
    shipping_methods: [{ id: "s1", amount: 70, adjustments: [{ code: "SHIP", amount: 70 }] }],
  });
  expect(mapped.promotionSavings).toEqual({ VI20: 160, SHIP: 70 });
});
