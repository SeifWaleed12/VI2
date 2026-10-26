import { medusaLocale, type Locale } from "@/lib/i18n";
import { medusa } from "../client";
import type { OwnReview, ReviewDraft, ReviewPage, ReviewSort } from "@/types/review";

export class ReviewRequestError extends Error {
  constructor(public status: number) { super("Review request failed"); }
}
export async function listReviews(productId: string, locale: Locale, input: { sort?: ReviewSort; rating?: number; offset?: number } = {}): Promise<ReviewPage> {
  return medusa.client.fetch<ReviewPage>(`/store/products/${encodeURIComponent(productId)}/reviews`, {
    query: { limit: 10, offset: input.offset ?? 0, sort: input.sort ?? "newest", ...(input.rating ? { rating: input.rating } : {}) },
    headers: { "x-medusa-locale": medusaLocale(locale) }, cache: "no-store", signal: AbortSignal.timeout(8000),
  });
}
async function ownRequest(productId: string, locale: Locale, method: "GET" | "POST" | "DELETE", customerId: string, body?: ReviewDraft | { version: number }): Promise<OwnReview | null> {
  const response = await fetch(`/api/reviews/${encodeURIComponent(productId)}?locale=${locale}`, {
    method, cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { "x-review-customer-id": customerId, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new ReviewRequestError(response.status);
  const result = await response.json();
  if (!("review" in result)) throw new ReviewRequestError(502);
  return result.review;
}
export const getOwnReview = (id: string, locale: Locale, customerId: string) => ownRequest(id, locale, "GET", customerId);
export const submitReview = (id: string, locale: Locale, customerId: string, draft: ReviewDraft) => ownRequest(id, locale, "POST", customerId, draft);
export const withdrawReview = (id: string, locale: Locale, customerId: string, version: number) => ownRequest(id, locale, "DELETE", customerId, { version });
