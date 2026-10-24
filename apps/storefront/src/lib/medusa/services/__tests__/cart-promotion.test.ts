import { promoFailure, promoOutcome } from "../cart";
import type { Cart } from "@/types/cart";

jest.mock("../../client", () => ({ medusa: {} }));
const cart = (codes: string[]) => ({ promotions: codes.map((code) => ({ code })) }) as unknown as Cart;

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
