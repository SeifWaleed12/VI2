"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { listReviews } from "@/lib/medusa/services/reviews";
import type { Locale } from "@/lib/i18n";
import type { ReviewPage, ReviewSort } from "@/types/review";

type Query = { sort: ReviewSort; rating?: number; offset: number };
export function useProductReviews(productId: string, locale: Locale, initial: ReviewPage | null) {
  const [page, setPage] = useState(initial);
  const [query, setQuery] = useState<Query>({ sort: "newest", offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(!initial);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const load = useCallback(async (next: Query) => {
    const sequence = ++request.current;
    setQuery(next);
    setLoading(true);
    setError(false);
    try {
      let result = await listReviews(productId, locale, next);
      if (sequence !== request.current) return;
      // A withdrawal can remove the only item on the last page.
      if (next.offset > 0 && next.offset >= result.count) {
        next = { ...next, offset: Math.max(0, Math.ceil(result.count / 10) - 1) * 10 };
        result = await listReviews(productId, locale, next);
      }
      if (sequence !== request.current) return;
      setQuery(next);
      setPage(result);
    } catch {
      if (sequence === request.current) setError(true);
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [productId, locale]);
  return { page, query, loading, error, load, refresh: () => load(query) };
}
