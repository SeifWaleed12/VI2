# Final recheck of codex/audit-fixes — through 2c34193

Reviewer: Claude. Date: 2026-10-26. Review only: no application code, branch, merge, push, deployment or live data was touched. I worked in a throwaway worktree at `2c34193` (removed afterwards), so this file is the only thing written in the audit-fixes worktree. Scope: application correction `7672f70`, test/comment follow-up `599ec7e`, close-out `2c34193`, and the surrounding code they touch. I did not rely on the earlier source-only approval.

**Verdict: APPROVE.** All seven findings from my independent review are resolved. I found no defect that should block merge. The items below are Low severity: one documentation overclaim, one accepted limit I could reproduce, and a few observations.

## What I ran versus what was reported

| Check | Mine | Reported by author |
|---|---|---|
| Backend unit, full run | **37 suites / 294 pass** | 292, plus 2 added afterwards |
| Storefront unit, full run | **53 suites / 510 pass** | 507, plus 3 added afterwards |
| Focused backend run (store-cache, redis-config, job-contention, bundle-discovery) | **4 suites / 29 pass** | 29 |
| Full HTTP integration suite, real Medusa + disposable Postgres | **14 of 14 specs / 109 of 109 tests pass, first run, no reruns** (includes merchandising, audit-hardening, quick-variant, store-cache) | same |
| Backend `tsc --noEmit`, storefront `tsc --noEmit` | clean | clean |
| ESLint, `--quiet` (errors only), `apps/backend/src` and `apps/storefront/src` | clean | clean |
| Real Redis behavior | my **own** probe script (below), not the author's | `audit-redis-regression.cjs` |
| Production builds (`medusa build`, `next build`) | **not run** | pass |
| Author's `audit-redis-regression.cjs` | **not run** (it needs its own labelled container); lock renewal and crash recovery were not re-run, and the code behind them is unchanged in this range | pass |
| Real-browser cart checks, load or soak test | **not run** | cart browser fixture |

Isolation:
- Backend tests ran with `REDIS_URL`, `RESEND_API_KEY`, `RESEND_FROM` and `DATABASE_URL` unset. No payment, delivery, ERP or email provider was contacted.
- The Medusa test runner created and dropped its own databases.
- My Redis was a disposable container (`vi2-claude-recheck-redis`, port 56391), removed afterwards. The existing `vi2-redis` container was not touched.
- `node_modules` was reached through directory junctions, which I removed before deleting the worktree. I checked that the source `node_modules` was intact afterwards.
- A read-only query after the run found three databases I cannot attribute to this session (`medusa-01m4949k…-integration-1`, `medusa-01m5awa2…-integration-1` and its `-template`). They may be left over from earlier runs. I did not drop them. Seif may want to check them.
- The scratch worktree path was long, so `git status` there showed false " D" entries (path-length warnings). The files are on disk: 616 tracked files, and the suite and spec counts match the author's.

My Redis probe covered the following (pause and unpause via `docker pause`, production cache options from `redisModules`, the real `@medusajs/cache-redis` service and the branch's `store-cache.ts`).

| Probe | Result |
|---|---|
| Slow read of 500 ms and 1,200 ms | value returned, key kept |
| Slow read of 1,700 ms | key deleted (see L3) |
| Invalidation across an 1,800 ms stall | stale key removed after 2.0 s |
| Invalidation across 3,500 ms and 6,000 ms stalls | gave up after about 3.0 s, stale key remains until TTL (see L2) |
| Write arriving during a 30,000-key scan | 0 keys left, including the key added mid-scan |
| 3,000-request burst against a paused Redis, full miss → origin → set flow | all finished in 819 ms. Peak 5,824 outstanding Redis commands, 3 left after 3.2 s, no unhandled rejections, client back to `ready` after unpause |
| Fill-coalescing timing (L1) | a 5 s origin ran 3 times for one key |
| Invalidation budget (L2) | with a write landing in each of three consecutive scans, exactly 3 scans ran and none started after the last write |

I also ran a temporary job spec (in the throwaway worktree only) against two real `RedisLockingProvider` instances. When the other worker held the lock, `expire-points` and `remove-abandoned-carts` returned `undefined` after about 1.0 s. When uncontended, an error thrown by the job body still rejected.

## The seven original findings

1. **Resolved.** `merchandising.spec.ts` now waits for the native index to be seeded and polls `/store/deals` for the asynchronous discovery, with the exact `bundle_ids` assertion kept. `deals/route.ts:11` maps `NOT_FOUND` to the same 503 as `UNEXPECTED_STATE`. I checked the installed search module: "has no active version yet" is a `NOT_FOUND` thrown at `active-version-cache.js:41`. The spec passes in my run.
2. **Resolved.** `catalog.ts:31-32` falls back to native `listProducts(filters)` only for the default sort, with no `q` and no deals, with a non-empty `brand_id`, a non-aborted signal, and a status of none, 404 or 500 and above. Filters, `limit` and `offset` are passed through unchanged. 400 throws before the fallback. The large-brand case keeps its explicit native error because native `listProducts` maps its own 400. The new tests cover the three statuses, the abort and 400 cases, and the negative guards (sorted, search, deals). Dropping any one guard now fails a test.
3. **Resolved.** `store-cache.ts:109-129` makes at most 3 attempts with 500 ms and 1,000 ms waits. Concurrent callers share one run per cache instance. A write arriving during a scan bumps `revision` before joining, so the running loop scans again. Verified with unit tests and on real Redis (stall recovery and the 30,000-key mid-scan write). The budget limit is L2.
4. **Resolved.** `commandTimeout` is 1,500 ms and `socketTimeout` is 2,000 ms, while the middleware still stops waiting at 250 ms. Slow reads up to 1.2 s kept the key on real Redis. ioredis only arms its socket timer while commands are outstanding (`Redis.js:430`, `setSocketTimeout`), so idle connections are not dropped. The remaining limits are L3 and L4.
5. **Resolved in substance, with one wording overclaim (L1).** The 2 s follower 503 with `Retry-After: 1` is real, tested and described correctly in `docs/ARCHITECTURE.md`.
6. **Resolved.** `writeFileSync` is gone and the test only logs. Its name now claims completion with backpressure rather than coalescing. A nit is under L6.
7. **Resolved.** Verified against the real lock provider (above). `entered` is set only when the callback begins, so an identical timeout message thrown from inside a running job still propagates. A timeout wins the race in the provider because `cancelled` is set and the rejection happens in the same step (`redis-lock.js:297-299`), so "Timed-out acquiring lock." is the message that surfaces, not the "Failed to acquire lock" one.

## Findings (all Low, none blocking)

### L1. Documentation overstates what the 2 s follower timeout prevents
**Where:** `docs/reviews/audit-remediation-2026-10-25.md:68` ("rather than duplicate expensive origin work"); behavior at `apps/backend/src/lib/store-cache.ts:62-75`.
**Trigger:** an origin that takes longer than 2 s for one key. At the follower timeout the fill slot is released, so the next miss becomes a new leader. In my probe, a 5 s origin handler ran 3 times for one key (leaders at 0 s, about 2.1 s and about 4.2 s), and each earlier follower received a 503.
**Impact:** none beyond an inaccurate claim. Origin work is still bounded (one new leader per 2 s per key, 256 fills in total). `ARCHITECTURE.md` says "up to 2 seconds" and is accurate.
**Smallest fix:** change the sentence to say coalescing holds for at most 2 s per key; after that a slow fill can start again.

### L2. A write landing in each of three consecutive invalidation scans leaves the last write unscanned (accepted limit, reproduced)
**Where:** `apps/backend/src/lib/store-cache.ts:116-124`.
**Trigger:** writes arrive during each of three scans, for example a script calling the admin API in a tight loop against a large keyspace. The attempt budget is shared between failures and revision changes, so the loop stops after pass 3 and no scan starts after the last write. An entry cached before that write can then survive until its TTL (60 s for products, up to 600 s for regions). Stalls longer than about 3 s also exhaust the budget (see the probe table), which the author documents.
**Impact:** bounded staleness. Fills that start before a write do not store their result, so only entries cached before the final write are affected.
**Smallest fix, optional:** count only failures against the 3 attempts and cap total passes separately (for example 6), or run one trailing pass when the loop ends on a revision mismatch. The documented limit is acceptable if the owner prefers to leave it.

### L3. A stall longer than 1.5 s still deletes the key being read (accepted limit, reproduced)
**Where:** `apps/backend/src/lib/redis-config.ts:19` with the installed `RedisCacheService.get` (`redis-cache.js:42-44`), which calls `unlink` on any read error. A 1,700 ms stall deleted the key; 500 ms and 1,200 ms did not.
**Impact:** after a stall longer than 1.5 s, the hot keys being read at that moment are refilled from origin. The comment at `redis-config.ts:17` and the remediation document both state this accurately.
**Fix:** none needed now; raising the timeout only moves the threshold.

### L4. Outstanding Redis work during a stall is bounded by time, not by a count
**Where:** `redis-config.ts:19-20` together with `store-cache.ts:56, 88`.
**Observed:** in the 3,000-request burst the queue peaked at 5,824 commands. That is about one `get` per request plus the follow-up `unlink` that the provider issues for each timed-out read. It drained to 3 within 3.2 s. The bound is roughly request rate × 2 s. The 250 ms nominal wait showed a 552 ms worst case in my single-process harness. That is likely event-loop contention from 3,000 synchronous request chains, so I do not claim it as a service number.
**Impact:** acceptable at the scale the author measured. It scales with traffic, with fill bodies held in memory while their `set` is queued, and with the open A14 gate (no per-visitor limit, so anonymous clients can raise key cardinality). Redis memory and burst sizing belong to the deployment gate.

### L5. Fallback observations (no defect)
- **Latency in a hang.** `catalog.ts:31-32` retries natively after the index call fails. If the index call hits the 15 s deadline (`client.ts`) and the backend is otherwise healthy, a brand page can take about 30 s before it renders. A fast 503 from `/store/catalog` falls back at once. Source-reviewed only; I did not measure it.
- **No signal.** The fallback is silent, so a long index outage will not show up as an error anywhere. An error counter on the backend 503 path would help once alerting exists.
- **409 does not fall back.** Documented as accepted ("Catalog context changed"); I agree.
- **Mixed ordering.** Native default ordering and the index default (`created DESC`) may differ, so a shopper paging across an outage boundary could see a repeated or skipped item. Accepted; the page never mixes the two sources within one request.

### L6. Smaller observations
- `apps/backend/integration-tests/http/audit-hardening.spec.ts` (the burst test, around line 144): the name says "explicit backpressure", but the test only asserts that every status is 200 or 503 and that at least one is 200. It does not check `Retry-After` or that any 503 occurred. Rename it or add the header assertion.
- `apps/backend/src/api/store/deals/route.ts:11`: `NOT_FOUND` also covers "No search index registered" and "search provider not registered", which are permanent configuration errors. They now look like a retryable 503. This is acceptable, but a deploy check on `/store/deals` is still worthwhile (see the release gates).
- The last paragraph added to `docs/ARCHITECTURE.md` has missing spaces ("after250ms", "A500ms", "most3 times"), and `store-cache.ts` ends without a newline.
- The job lock is exclusion, not once-per-tick. If the winner finishes in under 1 s, the loser can acquire and run the same work afterwards. The jobs are idempotent (unique ledger key, fenced deletes), so this is harmless. I did not test it.

## Surrounding code checked

- `/store/catalog` converts every error to 503, so storefront 404 handling covers only an older or missing route.
- `invalidateStoreCache` is called without `await` from both places that use it (`store-cache.ts:103`, `catalog-ranking-refresh.ts:127`), so retries never delay a response.
- Nothing in `2c685a0..2c34193` touches loyalty, inventory, order or admin-save logic. The audit-hardening specs that cover those (overlapping point writers ending at balance 0, lost-lease rollback, the two-admin save test where the latest committed save wins and independent fields survive, 1001-entry and 501-customer cases) all passed in my full HTTP run, so the owner's decision and the invariants hold on this tree.
- The reported counts and statements in `audit-remediation-2026-10-25.md` and `audit-validation-results.json` match what I observed (294 and 510 unit tests with the post-run additions, 14 specs / 109 tests, 500 ms key preservation, 1,800 ms invalidation recovery). The document is honest that Claude did not run the author's checks.

## Release gates still open (not completed by this branch, accurately described)

- Cloudflare and trusted visitor-IP policy (A14). It is also a Redis memory and cardinality gate (L4).
- Production capacity and soak testing: cold-fill cost at real catalog size, database pool budgets, Redis memory, failed-job alerts, and BullMQ lock behavior during a long rebuild.
- Native bundle-index migration and reseed. Nothing enforces it; add a deploy check that `/store/deals` returns 200 (not 503) before traffic.
- Multi-process cache staleness and fills remain TTL-bounded by design.
- Not covered by anyone yet: the production builds on my side, physical-device and screen-reader behavior, and real-queue retry behavior beyond the author's Redis diagnostics.

## Decision

**APPROVE** `2c34193` (application code `7672f70`, tests and comments `599ec7e`). L1 is a one-sentence documentation fix worth taking with the merge. L2 is worth a small follow-up if the owner wants the "changed at once" behavior under rapid admin writes; the rest are accepted limits. Merge approval is Seif's.
