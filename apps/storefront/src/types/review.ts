export type ReviewSort = "newest" | "highest" | "lowest";
export type Review = {
  id: string; first_name: string | null; rating: number; title: string | null;
  content: string; created_at: string; updated_at: string;
};
export type OwnReview = Review & {
  status: "pending" | "approved" | "rejected" | "withdrawn";
  version: number; moderation_reason: string | null;
};
export type ReviewSummary = { count: number; average: number | null; distribution: Record<number, number> };
export type ReviewPage = { reviews: Review[]; count: number; limit: number; offset: number; summary: ReviewSummary };
export type ReviewDraft = { rating: number; title: string; content: string; version?: number };
