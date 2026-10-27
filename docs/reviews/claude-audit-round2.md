**Verdict: Approve.** The one finding below is a test gap, not a product defect, and doesn't block merge. This is a source-only review of 2dd10dd against 2c5c1a3. I ran nothing, so the tests and build results rest on your report.

## Original findings
- **1 (coalesced routine reconcile), fixed.** `catalog-ranking-refresh.ts:59-83` now splits routine events from mutations.
  - Affected ids come from the mutations only.
  - `routineNeedsFull` overrides to a full rebuild only when the previous state is invalid or inside the margin.
  - `keepReadable` is off only for a `broadMutation`.
  - A valid state with a routine plus a product event stays incremental. A near-expiry state does a full rebuild while keeping reads valid. A broad mutation plus a routine event writes `ready = 0`.
  - A routine-only valid batch arrives as `ids = []`, which hits the `length === 0` return, so nothing is written.
  - Reading the previous state and price version before the loop is safe under the lock.
- **2 (`AbortSignal.any`), fixed.** `client.ts:25-37` uses a plain `AbortController`.
  - An already-aborted caller signal is handled, and the timer and listener are both cleaned up in `finally`.
  - `abort(reason)` is simply ignored on older engines.
  - The SDK's `normalizeResponse` parses the JSON inside `fetch_`, so the timer covers the body read. For raw responses it ends at the headers.
- **3 (promo cleanup), accepted** under your stated disposition. The provider code is outside this delta and I reviewed no change there.
- **4 (follower 503), fixed.** `store-cache.ts:60-67` returns 503 only for the `FILL_TIMEOUT` symbol.
  - Any other non-200, a disconnect or a revision bump gives `undefined`, so followers call `next()`.
  - Those followers don't register a fill or cache anything. Work stays bounded by the 256-entry cap.
- **5 (`/store/deals` error mapping), fixed.** `deals/route.ts` catches only `UNEXPECTED_STATE`, which covers "refreshing", "changed" and "Catalog context unavailable". `INVALID_DATA` for the channel or region and programming errors are rethrown to Medusa's error handler. The test covers both the rethrow and the 503.

## Actionable finding

**Low: the follower test doesn't exercise the follower branch.** `store-cache.unit.spec.ts:79-91`
- **Trigger:** the test lets two microtasks pass, then makes the leader respond.
  - The follower is still inside `await withinReadTimeout(cache.get(...))`. That is a `Promise.race` plus `.finally` plus an `await`, which takes more than two ticks.
  - The leader's `res.json` therefore deletes the fill before the follower reaches `fills.get(key)`.
  - The follower becomes a new leader, calls `next()` and sends 400, and every assertion passes.
- **Impact:** the test would also pass against the pre-fix code, so it doesn't guard Finding 4. The `FILL_TIMEOUT` 503 path has no test either.
- **Fix:** make the sync point deterministic.
  - Gate `cache.get` on a controllable promise.
  - Or wait on a macrotask with `await new Promise(r => setImmediate(r))`, as the existing 100-request test does at line 56.
  - Then assert that `next` is called once and that `Retry-After` is not set.
  - Optionally add a fake-timer case for the 2-second timeout that expects 503 with `Retry-After`.

## Other changes
- Moving `Bundles` into `Bundles.tsx` is behavior-neutral, and the page and test imports match.
- The previously uncertain items (`sessionVersion` after sign-out, `redisModules` in production) were not part of this delta, so I didn't recheck them.
