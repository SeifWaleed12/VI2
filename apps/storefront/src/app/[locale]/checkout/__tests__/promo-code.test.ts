import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PromoCode, { PROMO_MESSAGES } from "../PromoCode";
import { message } from "@/lib/i18n";

jest.mock("../Checkout.module.css", () => new Proxy({}, { get: (_, key) => key }));
let mockCart: Record<string, unknown>;
jest.mock("@/context/CartContext", () => ({ useCart: () => mockCart }));
let mockLocale: "en" | "ar" = "en";
jest.mock("@/context/LanguageContext", () => ({ useLanguage: () => ({ msg: (key: Parameters<typeof message>[1]) => message(mockLocale, key) }) }));
beforeEach(() => {
  mockLocale = "en";
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
  mockCart = { ...mockCart, cart: { id: "cart_1", promotionSavings: { VI20: 100 } }, promotions: [{ code: "VI20" }] };
  const html = render();
  expect(html).toContain("<strong>VI20</strong>");
  expect(html).toContain('aria-label="Remove VI20"');
  expect(html).not.toContain("🎟");
  expect(html).not.toContain("Doesn't apply yet");
});

it("marks an attached code that takes nothing off as not applying, still removable (reload after a failed removal)", () => {
  mockCart = { ...mockCart, cart: { id: "cart_1", promotionSavings: { VI20: 0 } }, promotions: [{ code: "VI20" }] };
  const html = render();
  expect(html).toMatch(/Doesn(&#x27;|')t apply yet/);
  expect(html).toContain('aria-label="Remove VI20"');
});

it("starts as a quiet Add promo code button on mobile", () => {
  const html = render(true);
  expect(html).toContain("Add promo code");
  expect(html).not.toContain("<input");
});

it("words every failure as the problem and what to do, in both languages", () => {
  expect(message("en", PROMO_MESSAGES.not_applicable)).toBe("This code doesn't apply to the items in your cart.");
  expect(message("en", PROMO_MESSAGES.not_eligible)).toBe("Your order doesn't qualify for this code yet.");
  expect(message("en", PROMO_MESSAGES.invalid)).toBe("This code isn't valid or has expired.");
  expect(message("en", PROMO_MESSAGES.network)).toMatch(/Try again/);
  for (const key of Object.values(PROMO_MESSAGES)) expect(message("ar", key)).toMatch(/[\u0600-\u06FF]/);
});

it("speaks Arabic on the Arabic checkout, including the accessible names", () => {
  mockLocale = "ar";
  mockCart = { ...mockCart, cart: { id: "cart_1", promotionSavings: { VI20: 100 } }, promotions: [{ code: "VI20" }] };
  const html = render();
  expect(html).toContain(">كود الخصم</label>");
  expect(html).toContain(">تطبيق</button>");
  expect(html).toContain('aria-label="إزالة VI20"');
  expect(html).toContain('aria-label="أكواد الخصم المطبقة"');
  expect(render(true)).toContain("أضف كود خصم");
});
