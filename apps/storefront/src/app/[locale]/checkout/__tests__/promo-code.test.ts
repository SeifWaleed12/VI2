import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PromoCode, { PROMO_MESSAGES } from "../PromoCode";

jest.mock("../Checkout.module.css", () => new Proxy({}, { get: (_, key) => key }));
let mockCart: Record<string, unknown>;
jest.mock("@/context/CartContext", () => ({ useCart: () => mockCart }));
beforeEach(() => {
  mockCart = { cart: { id: "cart_1" }, loading: false, promotions: [], applyPromotion: jest.fn(), removePromotion: jest.fn() };
});
const render = (collapsible = false) => renderToStaticMarkup(createElement(PromoCode, { collapsible }));

it("labels the field and offers Apply, disabled until a code is typed", () => {
  const html = render();
  expect(html).toMatch(/<label for="([^"]+)-code">Promo code<\/label>/);
  expect(html).toMatch(/<input id="[^"]+-code"/);
  expect(html).toMatch(/<button type="submit" disabled="">Apply<\/button>/);
  expect(html).not.toContain("Loading your cart");
});

it("says the cart is still loading instead of failing on Apply", () => {
  mockCart = { ...mockCart, cart: null, loading: true };
  const html = render();
  expect(html).toContain("Loading your cart…");
  expect(html).toMatch(/aria-describedby="[^"]+-note"/);
});

it("shows each applied code as a removable chip, without emoji", () => {
  mockCart = { ...mockCart, promotions: [{ code: "VI20" }] };
  const html = render();
  expect(html).toContain("<strong>VI20</strong>");
  expect(html).toContain('aria-label="Remove VI20"');
  expect(html).not.toContain("🎟");
});

it("starts as a quiet Add promo code button on mobile", () => {
  const html = render(true);
  expect(html).toContain("Add promo code");
  expect(html).not.toContain("<input");
});

it("words every failure as the problem and what to do", () => {
  expect(PROMO_MESSAGES.not_applicable).toBe("This code doesn't apply to the items in your cart.");
  expect(PROMO_MESSAGES.invalid).toBe("This code isn't valid or has expired.");
  expect(PROMO_MESSAGES.network).toMatch(/Try again/);
});
