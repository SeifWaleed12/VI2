import type { ReviewDraft } from "@/types/review";

// One submitted-but-unsaved draft, in this tab's memory only, for short sign-in recovery.
let saved: { productId: string; customerId: string; draft: ReviewDraft; expires: number } | null = null;
const LIFETIME_MS = 15 * 60 * 1000;
export function keepReviewDraft(productId: string, customerId: string, draft: ReviewDraft) {
  if (typeof window === "undefined") return;
  saved = { productId, customerId, draft: { ...draft }, expires: Date.now() + LIFETIME_MS };
}
export function readReviewDraft(productId: string, customerId: string): ReviewDraft | null {
  if (typeof window === "undefined") return null;
  if (saved && saved.expires <= Date.now()) saved = null;
  return saved?.productId === productId && saved.customerId === customerId ? { ...saved.draft } : null;
}
export function clearReviewDraft(productId: string, customerId: string) {
  if (typeof window !== "undefined" && saved?.productId === productId && saved.customerId === customerId) saved = null;
}
