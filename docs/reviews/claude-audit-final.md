## Verdict: Request changes

One medium defect, in catalog refresh batching, and a few low-severity ones. I read the diff and the current source and ran nothing, so each finding is read from the code; two are flagged as uncertain. Apart from the findings below, I found no defects in these areas:
- cart generation, queue and rollback
- loyalty transaction and refund snapshot
- job locks
- cache bounds
- brand and bundle projection

## Findings

### 1. Medium — a coalesced routine reconcile takes the catalog offline
**Where:** `apps/backend/src/lib/catalog-ranking-refresh.ts:59-72` and `:77-83`.

**Trigger:**
1. The minute job queues `catalog-ranking.reconcile` while an earlier full rebuild is still running. Rebuilds are long, and the job still sees the state as near expiry.
2. A `product.updated`, inventory or pricing event arrives in the same window.
3. The next loop iteration runs with `events = [reconcile, product.updated]`.

`routine` is true only if every event is routine (`:77`), so this batch skips the validity check at `:59`. It enters the `else if` at `:64`, where `affectedCatalogProducts` returns `undefined` for the reconcile event because its ids are empty (`:138`). That sets `productIds = undefined`. `keepReadable` is then false and `:83` writes `ready = 0`.

The result is a second full rebuild straight after a successful one, with the whole catalog returning 503 until it finishes. The same happens for `catalog-ranking.refresh` mixed with any other event. This is the outage that `keepReadable` was added to avoid. The unit tests only cover pure-routine batches.

**Smallest fix:**
- Split the events into routine and non-routine.
- Compute affected ids from the non-routine events only.
- Treat the routine events as a validity check. If the state is valid beyond the margin, skip them. If a full rebuild is needed only because of them, set `keepReadable` from the previous state.
- Add a test with `[reconcile, product.updated]` and a valid previous state. It should expect an incremental write and no `ready = 0`.

### 2. Low — Safari before 17.4 and Chrome before 116 break search suggestions
**Where:** `apps/storefront/src/lib/medusa/client.ts:29`.

**Trigger:** `AbortSignal.any` is called whenever the caller passes a signal. The new `GlobalSearch` always passes one. On a browser without `AbortSignal.any` this throws a `TypeError` before the fetch starts. I'm relying on browser compatibility tables here, not a test run.

**Impact:** search suggestions always show "failed" on those browsers.

**Fix:** feature-detect and fall back to a manual `AbortController` that listens to both signals. `categories.ts:80` has the same call, but it runs server-side, so it is fine.

### 3. Low — a failed "not eligible" promo cleanup is now reported as a generic error
**Where:** `apps/storefront/src/providers/cart-provider.tsx` (the `applyPromotion` task and its `if (result.error) throw result.error`).

**Trigger:** the code applies but takes nothing off, and the follow-up `removeCartPromotion` fails.

**Impact:** the old code swallowed that failure, so `PromoCode` showed "not applying". Now the user gets `promoFailure` plus a `mutationError`, and the ineligible code stays on the cart, which is synced from the confirmed state.

**Fix:** keep the old behaviour. Catch the remove failure inside the task and return `updated`.

### 4. Low — followers get 503 when the leader's response isn't a cacheable 200
**Where:** `apps/backend/src/lib/store-cache.ts:62-67`.

**Trigger:** the leader answers with a 4xx, the client disconnects, or `invalidateStoreCache` bumps `revision` mid-fill. Concurrent identical requests then get 503 "busy" instead of the real answer. For example, a bad brand filter now returns 503 to followers instead of 400.

**Impact:** wrong status for those followers. The storefront treats 400 as "invalid filters" and 503 as an outage.

**Fix:** have `complete()` pass a distinct marker for a timeout, and keep the 503 only for that. For any other non-200, let followers fall through to `next()`. The 256-entry cap and the 2-second timer still bound the work.

### 5. Low — `/store/deals` turns every error into a retryable 503
**Where:** `apps/backend/src/api/store/deals/route.ts:9`.

**Trigger:** a publishable key linked to zero or several sales channels. This throws `INVALID_DATA` in `bundleProductIds` (`deals.ts:11`). Programming errors take the same path.

**Impact:** a permanent misconfiguration looks like a transient outage and is hidden from error logs.

**Fix:** in the `catch`, rethrow anything that isn't the two "refreshing" / "changed" errors, or at least log it.

### 6. Low — the second instance's job lock errors on every cron run
**Where:** `apps/backend/src/jobs/expire-points.ts:37` and `apps/backend/src/jobs/remove-abandoned-carts.ts:84`.

**Trigger:** with `timeout: 1`, an instance that loses the lock gets a timeout error from `execute`. Medusa will log that as a failed job on every run.

**Impact:** alert noise only. The work itself is correctly fenced.

**Fix:** catch the lock-timeout error and return quietly.

## Uncertain, not confirmed
- **Stale `sessionVersion` after sign-out.** `sessionVersion` is read during render, but `clearCart` bumps the queue version without necessarily causing a re-render. If every setter in `clearCart` is a no-op (`cart` null, no items, `loading` false), `addItem` and the other mutators return early with no message until something else re-renders. The normal path is fine, because `cart` is non-null and `setCart(null)` re-renders. The edge case is a cart that failed to load before sign-out.
- **`redisModules` in production.** It now throws when `NODE_ENV=production` and `REDIS_URL` is unset. If your build or `db:migrate` steps run with `NODE_ENV=production` and no Redis, they will fail. That may be intended, so confirm it for your pipeline.

## Checked and found correct
- **Cart:**
  - The version check and `reset()` skip queued work and return `stale`.
  - A rejected call is never counted in `waiting`.
  - Rollback happens only when the call is the latest or was rejected.
  - Pending-checkout retry is cleared only on a confirmed success.
  - Remove and update resolve the line from the confirmed cart at run time, so changes to a just-added line work.
- **Loyalty:**
  - The advisory transaction lock plus `read committed` fences writers even when the Redis lease is lost.
  - Lease loss rolls back the transaction through `throwIfAborted`.
  - Refund reads happen before the transaction.
  - A ledger refund marker that isn't in the snapshot throws, and each retry takes a fresh snapshot. A delivery earn therefore can't over-credit, and a refund event can't double-count.
  - `IDX_points_entry_customer_id` supports the keyset expiry page.
- **Refresh coalescing:**
  - Check-and-delete of the pending batch has no `await` between them.
  - Errors reach every caller, so durable events are retried.
- **Cache and Redis:** the installed `cache-redis` loader spreads `redisOptions` into the ioredis constructor with `lazyConnect`, so the new options are honoured. Followers are bounded by the 256-entry cap and the 2-second timer. Cache-busting query keys no longer create entries.
- **Brand and bundle:** the `bundle` field is computed from variants with two or more stock-item links, and the index uses the existing `inventory_items` query field. The brand cap rejects over 1000 with a 400. The storefront routes brand browsing through `/store/catalog`.
