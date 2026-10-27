import { useProductReviews } from "../use-product-reviews";
import { useOwnReview } from "../use-own-review";
import { listReviews, getOwnReview, submitReview } from "@/lib/medusa/services/reviews";
import type { OwnReview, ReviewPage } from "@/types/review";
const states: unknown[] = [];
const refs: { current: unknown }[] = [];
let stateIndex = 0;
let refIndex = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"), useCallback: (fn: unknown) => fn, useEffect: () => undefined,
  useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
    return [states[index], (next: unknown) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
  },
}));
jest.mock("@/lib/medusa/services/reviews", () => ({ listReviews: jest.fn(), getOwnReview: jest.fn(), submitReview: jest.fn(), withdrawReview: jest.fn(), ReviewRequestError: class extends Error { constructor(public status: number) { super(); } } }));
function render<T>(fn: () => T) { stateIndex = 0; refIndex = 0; return fn(); }
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((ok, no) => { resolve = ok; reject = no; }); return { promise, resolve, reject }; };
const page = (count: number): ReviewPage => ({ reviews: [], count, offset: 0, limit: 10, summary: { count, average: null, distribution: {} } });
const own = (id: string): OwnReview => ({ id, first_name: "Member", rating: 3, title: null, content: id, status: "approved", version: 1, moderation_reason: null, created_at: "2026-10-20", updated_at: "2026-10-20" });
beforeEach(() => { states.length = 0; refs.length = 0; jest.clearAllMocks(); });
it("ignores a slower previous filter response", async () => {
  const first = deferred<ReviewPage>(); const second = deferred<ReviewPage>();
  jest.mocked(listReviews).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const useHarness = () => useProductReviews("p", "ar", page(0));
  const a = render(useHarness).load({ sort: "highest", rating: 5, offset: 0 });
  const b = render(useHarness).load({ sort: "lowest", rating: 1, offset: 0 });
  second.resolve(page(2)); await b;
  first.resolve(page(99)); await a;
  expect(render(useHarness).page?.count).toBe(2);
  expect(render(useHarness).query.rating).toBe(1);
  expect(listReviews).toHaveBeenLastCalledWith("p", "ar", { sort: "lowest", rating: 1, offset: 0 });
});
it("returns to the last real page after withdrawal", async () => {
  jest.mocked(listReviews).mockResolvedValueOnce(page(10)).mockResolvedValueOnce(page(10));
  const useHarness = () => useProductReviews("p", "en", page(11));
  await render(useHarness).load({ sort: "newest", offset: 10 });
  expect(render(useHarness).query.offset).toBe(0);
  expect(listReviews).toHaveBeenLastCalledWith("p", "en", { sort: "newest", offset: 0 });
});
it("keeps retry context after an outage without presenting stale filtered reviews as fresh", async () => {
  jest.mocked(listReviews).mockRejectedValueOnce(new Error("offline"));
  const useHarness = () => useProductReviews("p", "en", page(4));
  await render(useHarness).load({ sort: "lowest", offset: 0, rating: 1 });
  expect(render(useHarness).error).toBe(true);
  expect(render(useHarness).loading).toBe(false);
  expect(render(useHarness).query.rating).toBe(1);
});
it("never exposes the previous customer's own review after an identity change", async () => {
  const old = deferred<OwnReview>();
  jest.mocked(getOwnReview).mockReturnValueOnce(old.promise).mockResolvedValueOnce(own("customer-b"));
  const hook = (id: string) => () => useOwnReview("p", "en", id);
  const pending = render(hook("a")).reload();
  expect(render(hook("b")).review).toBeNull();
  await render(hook("b")).reload();
  old.resolve(own("customer-a")); await pending;
  expect(render(hook("b")).review?.id).toBe("customer-b");
  expect(getOwnReview).toHaveBeenLastCalledWith("p", "en", "b");
});
it("guards duplicate saves and does not leave a different account busy", async () => {
  const saved = deferred<OwnReview>();
  jest.mocked(submitReview).mockReturnValue(saved.promise);
  const hook = (id: string) => () => useOwnReview("p", "en", id);
  const draft = { rating: 1, title: "", content: "This product did not help me." };
  const pending = render(hook("a")).save(draft);
  await render(hook("a")).save(draft);
  expect(submitReview).toHaveBeenCalledTimes(1);
  expect(submitReview).toHaveBeenCalledWith("p", "en", "a", draft);
  expect(render(hook("b")).busy).toBe(false);
  saved.resolve(own("a")); await pending;
  expect(render(hook("b")).review).toBeNull();
});
