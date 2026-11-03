# Recheck of 2c685a0..7672f70

**Verdict: approve on source review, with no blocking defects.** Findings 1–7 are each addressed as you described. Approval depends on the still-running production builds and the 14 HTTP specs finishing green. `merchandising.spec.ts` is the one that matters most, because it failed before.

## Ran vs source-reviewed

I ran nothing. Bash was unavailable, so this is a read-only source review.

- **From your report, not by me:** the unit totals (292 backend, 507 storefront), the focused 29, and the type and lint results.
- **Not run by anyone yet:** the HTTP specs and builds still in progress. That includes `merchandising.spec.ts` and the 1800 ms invalidation case in `audit-redis-regression.cjs`.
- **One thing I couldn't confirm:** I couldn't find the native "no active version" string by grep in `node_modules`. The `NOT_FOUND` mapping rests on the earlier review's captured 404 body (`type: not_found`) and on the unit test, which mocks `readCatalogState` rejecting.

## Per finding

1. **Seed wait and `/store/deals` polling: sound.**
   - `merchandising.spec.ts` now has the same `beforeAll` seed wait as `audit-hardening.spec.ts:24-30`. It then polls `/store/deals` for up to 30 s and asserts `status 200` and the exact `bundle_ids`, so the assertion isn't weakened.
   - `deals/route.ts` maps `NOT_FOUND` to 503. Invalid-channel errors are `INVALID_DATA` and still propagate, and `catalogContext` only throws `UNEXPECTED_STATE` or `INVALID_DATA`. The mapping can't swallow those.
   - The new unit test mocks the error at `readCatalogState`. That is where the real 404 originates (`catalog-ranking.ts:122`), so the path is right.
2. **Brand fallback: matches the spec** (`catalog.ts:29-33`).
   - It runs only for the default sort with no deals, no `q`, a non-empty `brand_id`, a non-aborted signal, and a status of undefined, 404 or ≥500.
   - `400` throws before the fallback check.
   - `filters` is the original rest-spread including `signal`.
   - The native `listProducts` maps its own 400 to `InvalidCatalogFilterError` (`products.ts:219`), so the 1000 cap is preserved.
3. **Invalidation retry: correct** (`store-cache.ts:109-129`).
   - It is bounded to 3 attempts, waiting 500 ms then 1000 ms.
   - The `WeakMap` per cache instance makes concurrent callers share one run.
   - Each call bumps `revision` before joining, so a write during a scan fails the `requested === revision` check and forces another pass.
   - The three new unit tests trace correctly under fake timers (1500 ms of waits against a 2000 ms advance).
4. **Timeouts: correct.** 1500/2000 sits well above the 250 ms middleware wait. The script's 500 ms slow read and 1800 ms invalidation recovery are consistent with the code: the first attempt times out at 1500 ms, waits 500 ms, and succeeds after the 1800 ms unpause.
5. **503 backpressure kept: agreed, nothing to add.**
6. **Burst test: fixed.** The `writeFileSync` is gone and the `join` and `dirname` imports are still used. `audit-remediation-2026-10-25.md:33` still links the old JSON as a one-off result, which is fine as long as it stays a snapshot.
7. **Jobs: correct.**
   - The installed Redis provider throws exactly `MedusaError(CONFLICT, "Timed-out acquiring lock.")` (`redis-lock.js:299`). That is thrown before `job` runs, so `entered` is false.
   - After entry, errors propagate. That includes the `renewal.signal.reason` thrown when the lease is lost.
   - The third test proves an identical timeout thrown after entry is not swallowed.

## Residual issues (all Low, none blocking)

1. **`catalog.ts:31-32`: a 409 from `/store/catalog` doesn't fall back.**
   - **Trigger:** the store's default region or channel differs from the one the storefront sent. The route returns 409 "Catalog context changed. Retry or browse all products." (`store/catalog/route.ts:15-17`).
   - **Effect:** a brand page then fails with "ordering temporarily unavailable" instead of browsing natively.
   - **Fix:** add 409 to the fallback statuses, or accept it as a rare configuration state.
2. **Fallback tests only cover the abort case and the 400 and 503 statuses.**
   - **Gap:** nothing asserts the guard conditions: a non-default sort, `q`, or `deals` must not fall back. Dropping `!params.q` would pass every current test.
   - **Fix:** add one negative `it.each` over those inputs.
3. **`store-cache.ts:116-124`: the attempt budget is shared between failures and revision changes.**
   - **Trigger:** writes landing during each of 3 consecutive scans.
   - **Effect:** the last pass ends unverified and an entry cached mid-scan can survive until its TTL. This is bounded by TTL and consistent with your "bounded" intent.
   - **Fix:** document the limit in the comment. There is no test for the exhausted-by-writes case.
4. **Stalls longer than 1500 ms still wipe a valid key.** `RedisCacheService.get` unlinks on any throw (`redis-cache.js:42-44`). 1500 ms moves the threshold rather than removing the behavior, and only a 500 ms stall is evidenced. A comment saying so would help.
5. **Jobs depend on the exact message string, and the in-memory provider throws a plain `Error`.**
   - **Effect:** the plain `Error` is not skipped, but that is dev-only. If a Medusa upgrade rewords the message, the failure direction is safe: alert noise returns and nothing is lost.
   - **Test gap:** the "identical timeout after entry" test covers `expire-points` only, not `remove-abandoned-carts`.

## Before merge

- Confirm green: both production builds, all 14 HTTP specs (especially `merchandising`, `audit-hardening`, `catalog-sorting`), the focused 29, and the Redis script's new sections writing `slowRead` and `invalidationRecovery`.
- If `merchandising.spec.ts` shows the bundle appearing slower than the 30 s poll, treat that as a real finding. Don't just widen the wait.
