import { createElement } from "react";
import { renderToString } from "react-dom/server";
import ProductReviews from "../ProductReviews";
import ReviewForm from "../ReviewForm";
import { ReviewStars } from "../ReviewStars";
import { REVIEW_COPY } from "../copy";
import type { ReviewPage } from "@/types/review";

jest.mock("../Reviews.module.css", () => ({ __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ customer: null, isLoading: false, refreshCustomer: jest.fn() }) }));
jest.mock("@/lib/medusa/services/reviews", () => ({ listReviews: jest.fn(), getOwnReview: jest.fn() }));
const page: ReviewPage = { reviews: [{ id: "r", first_name: "Mariam", rating: 4, title: "<script>alert(1)</script>", content: "English feedback stays English on Arabic pages.", created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-20T10:00:00Z" }], count: 1, limit: 10, offset: 0, summary: { count: 1, average: 4, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 } } };
it.each(["en", "ar"] as const)("renders original feedback safely with localized controls in %s", locale => {
  const html = renderToString(createElement(ProductReviews, { productId: "p", locale, initial: page }));
  expect(html).toContain(REVIEW_COPY[locale].heading);
  expect(html).toContain(REVIEW_COPY[locale].ratingFilter);
  expect(html).toContain(REVIEW_COPY[locale].signIn);
  expect(html).toContain("English feedback stays English");
  expect(html).toContain('dir="auto"');
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("Verified purchase");
});
it("shows a truthful empty state, not a zero-star rating", () => {
  const empty = { ...page, reviews: [], count: 0, summary: { ...page.summary, count: 0, average: null } };
  const html = renderToString(createElement(ProductReviews, { productId: "p", locale: "en", initial: empty }));
  expect(html).toContain("No reviews yet");
  expect(html).not.toContain("0 out of 5");
});
it("isolates review outages with retry", () => {
  const html = renderToString(createElement(ProductReviews, { productId: "p", locale: "ar", initial: null }));
  expect(html).toContain(REVIEW_COPY.ar.unavailable);
  expect(html).toContain(REVIEW_COPY.ar.retry);
});
it("renders labelled native radio choices, input limits and privacy help", () => {
  const html = renderToString(createElement(ReviewForm, { review: null, copy: REVIEW_COPY.en, busy: false, onSave: jest.fn(), onCancel: jest.fn() }));
  expect(html.match(/type="radio"/g)).toHaveLength(5);
  expect(html).toContain("1 star");
  expect(html).toContain("5 stars");
  expect(html).toContain('maxLength="3000"');
  expect(html).toContain("Do not include contact details");
});
it("does not round a fractional rating into five full stars", () => {
  const html = renderToString(createElement(ReviewStars, { rating: 4.5, label: "4.5 out of 5" }));
  expect(html).toContain('width:50%');
  expect(html).toContain('aria-label="4.5 out of 5"');
});
