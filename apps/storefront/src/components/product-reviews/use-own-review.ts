"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getOwnReview, submitReview, withdrawReview, ReviewRequestError } from "@/lib/medusa/services/reviews";
import type { Locale } from "@/lib/i18n";
import type { OwnReview, ReviewDraft } from "@/types/review";

type State = { owner: string | null; review: OwnReview | null; loaded: boolean; ready: boolean; error: number | null; source: "read" | "write" | null };
export function useOwnReview(productId: string, locale: Locale, customerId: string | null) {
  const [state, setState] = useState<State>({ owner: null, review: null, loaded: false, ready: false, error: null, source: null });
  const [savingOwner, setSavingOwner] = useState<string | null>(null);
  const mutation = useRef<string | null>(null);
  const busy = !!customerId && savingOwner === customerId;
  const sequence = useRef(0);
  const load = useCallback(async () => {
    if (!customerId) return false;
    const current = ++sequence.current;
    try {
      const review = await getOwnReview(productId, locale, customerId);
      if (current === sequence.current) { setState({ owner: customerId, review, loaded: true, ready: true, error: null, source: null }); return true; }
      return false;
    } catch (error) {
      if (current === sequence.current) setState(previous => ({ owner: customerId, review: previous.owner === customerId ? previous.review : null, loaded: true, ready: previous.owner === customerId && previous.ready, error: error instanceof ReviewRequestError ? error.status : 503, source: "read" }));
      return false;
    }
  }, [productId, locale, customerId]);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  const change = async (action: () => Promise<OwnReview | null>) => {
    if (!customerId || mutation.current === customerId) return false;
    mutation.current = customerId;
    const current = ++sequence.current;
    setSavingOwner(customerId);
    try {
      const review = await action();
      if (current === sequence.current) setState({ owner: customerId, review, loaded: true, ready: true, error: null, source: null });
      return current === sequence.current;
    } catch (error) {
      if (current === sequence.current) setState(previous => ({ ...previous, error: error instanceof ReviewRequestError ? error.status : 503, source: "write" }));
      return false;
    } finally {
      if (mutation.current === customerId) mutation.current = null;
      setSavingOwner(owner => owner === customerId ? null : owner);
    }
  };
  const current = state.owner === customerId && !!customerId;
  return {
    review: current ? state.review : null, loaded: current && state.loaded, readError: current && state.source === "read" && !state.ready, sessionExpired: state.error === 401 && (!customerId || state.owner === customerId), error: current ? state.error : null, busy,
    reload: load,
    save: (draft: ReviewDraft) => customerId ? change(() => submitReview(productId, locale, customerId, draft)) : Promise.resolve(false),
    withdraw: (version: number) => customerId ? change(() => withdrawReview(productId, locale, customerId, version)) : Promise.resolve(false),
  };
}
