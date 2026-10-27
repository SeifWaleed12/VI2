# Independent review of codex/audit-fixes — 56df776..2c685a0

Reviewer: Claude. Date: 2026-10-25. Review only: no application code, branch, merge, push or deployment was touched. I worked in a separate throwaway worktree at `2c685a0` (removed afterwards); this is the only file written in the audit-fixes worktree.

**Verdict: REQUEST CHANGES.** One existing integration test now fails because of this branch (finding 1), and one availability regression needs a small fix or an explicit owner decision (finding 2). The cart, loyalty, lease, cache-bound and catalog-refresh work is otherwise sound; findings 3–7 are low severity.

## Evidence: what I ran versus what the author reported

| Check | Mine | Author reported |
|---|---|---|
| Backend source unit tests | 36 suites / 287 pass | same |
| Storefront unit tests | 53 suites / 503 pass | same |
| `tsc --noEmit` and eslint, both apps | clean | same |
| Backend `medusa build` incl. Admin | pass | pass |
| Storefront `next build --webpack` | pass | pass |
| Full HTTP integration suite (real Medusa + Postgres, 14 spec files) | **12 pass, 2 fail** (details below) | "4 suites / 29 tests" (account, checkout, catalog-sorting, audit-hardening) |
| Real Redis (disposable Redis 7 container, production cache options) | my own probe, results in findings 3 and 4 | their `audit-redis-regression.cjs` (not rerun) |
| Real-browser cart check | my own throwaway fixture, see "Checked and found sound" | their fixture (not rerun) |

Isolation: databases were created and dropped by the Medusa test runner, in-memory event bus and cache (`REDIS_URL` unset), `RESEND_API_KEY`/`RESEND_FROM` unset, no payment, delivery, ERP or email provider contacted. A read-only database-name query afterwards found no leftover test databases, and my Redis container was removed. I did not run a load or soak test, a Redis multi-process test, or a live deployment.

The two HTTP failures: `quick-variant.spec.ts` (a same-value concurrency race test, untouched by this branch) failed once under load and passed on rerun, so I treat it as flaky and unrelated. `merchandising.spec.ts` fails every time; see finding 1.

## Findings

### 1. Medium — `merchandising.spec.ts` fails on this branch; the reported HTTP evidence skipped it
**Where:** `apps/backend/integration-tests/http/merchandising.spec.ts:12` (no index-seed wait) and `:61` (immediate read of `/store/deals`); behavior change in `apps/backend/src/lib/deals.ts:13-24` and `apps/backend/src/api/store/deals/route.ts:11`.

**Trigger:** run the spec. "lists inventory-kit products as bundles, and normal products not" fails with `bundle_ids` undefined. The response is HTTP **404** `{"type":"not_found","message":"Search index \"product\" has no active version yet. It has to be migrated and seeded first."}`; the index never became ready within 30 s in that spec. The spec was written when `/store/deals` read stock links directly; this branch moved bundle discovery onto the search index (A09) but did not update it. The author's four-suite run did not include it, so the stated "29/29 HTTP" understates what the branch breaks.

With the same seed wait that `product-search`, `catalog-sorting` and `audit-hardening` use (a top-level `beforeAll` polling `readCatalogState(...).ready === 1`) in my local copy, the first read returned `{"bundle_ids":[]}` and the bundle appeared on the next poll about 0.5 s later, so the feature works; the test needs a seed wait and a short poll.

**Impact:** CI is red on the branch, and the same behavior shows up in production if `/store/deals` is hit before the index is migrated and seeded: the route returns a raw 404 instead of a retryable 503 (the storefront hides it with `getBundles().catch(() => [])`, so the Bundles section silently disappears).

**Smallest fix:** add the shared seed-wait `beforeAll` to `merchandising.spec.ts` and poll `/store/deals` until the bundle appears (do not weaken the assertion). In `deals/route.ts`, also map `MedusaError.Types.NOT_FOUND` from the missing index version to the same 503 as `UNEXPECTED_STATE`.

### 2. Medium — brand browsing, search and Deals now fail closed during routine merchandising edits
**Where:** `apps/storefront/src/lib/medusa/services/catalog.ts:12`; `apps/backend/src/lib/catalog-ranking-refresh.ts:70, 83, 157`.

**Trigger:** `listCatalog` now sends every request with a `brand_id` to the ranking index, even for the default sort (A09 fix for large brands). Separately, `affectedCatalogProducts` classifies these event families as unrecoverable ("broad"), which forces a full rebuild with `ready = 0` (line 83), and `/store/catalog` answers 503 until the rebuild ends. I enumerated the installed Medusa event names: every `pricing.price-list.*`, `pricing.price-rule.*`, `pricing.price-list-rule.*`, `product.product-category.*` and `product.product-tag.*` event is broad (the price-set, price, variant, inventory and reservation events are incremental). So creating or editing a sale price list or promotion, or editing a category or tag, takes brand pages, search, Deals and sorted listings offline for the length of one full catalog rebuild. The price-list watermark would flag those listings stale anyway, so the rebuild itself is needed; the problem is that brand browsing used to work without the index at all.

**Impact:** a merchandiser changing a sale causes visible "temporarily unavailable" errors on brand pages for the rebuild duration. That duration is unmeasured; the author's note that it depends on catalog size is accurate.

**Smallest fix:** for the default sort with no search and no deals, fall back to the native `listProducts(filters)` path when the index call returns 5xx or is unavailable (same shape as the existing no-brand fast path). A brand over 1000 links keeps returning the explicit 400 from `catalog-filters.ts`. If the owner prefers a hard dependency on the index, say so in `docs/CATALOG-CONTRACT.md` and size the rebuild window.

### 3. Low-Medium — a cache invalidation during a Redis stall is lost, and the stale page returns after recovery
**Where:** `apps/backend/src/lib/store-cache.ts:109-114`, `apps/backend/src/lib/redis-config.ts:19`.

**Reproduction (disposable Redis 7, production cache options, my own script):** cache a product-list response, `docker pause` Redis, call `invalidateStoreCache`, unpause. The call returned after ~264 ms without error, and the next request was served the old cached body. The old configuration queued the `SCAN`/`UNLINK` commands and replayed them after reconnect; with `enableOfflineQueue: false` and `autoResendUnfulfilledCommands: false` they are dropped, and the `catch` swallows the failure.

**Impact:** after an admin price, stock or brand edit during a brief Redis hiccup, shoppers see the old catalog until the entry expires (60 s for products, 300 s for categories/brands/tags/deals, 600 s for regions). Within the TTL bounds the code comment promises, but it is a regression of the "changed at once" behavior.

**Smallest fix:** retry the invalidation a few times with a short delay (for example three attempts over three seconds) before giving up. No new dependency.

### 4. Low-Medium — a slow Redis read deletes a valid cache entry
**Where:** `apps/backend/src/lib/redis-config.ts:19` (`commandTimeout: 250`) together with the installed `RedisCacheService.get`, which unlinks the key whenever the read throws.

**Reproduction:** set a 120 s entry, pause Redis for 500 ms while `cache.get` runs, unpause. The read rejected with "Command timed out" and the entry was gone afterwards (`EXISTS` returned 0).

**Impact:** a latency spike above 250 ms turns every in-flight read into a cache wipe, which then drives origin load. The middleware already stops waiting at 250 ms (`READ_TIMEOUT_MS`), so the client-side command timeout adds nothing but this side effect.

**Smallest fix:** raise `commandTimeout` well above the middleware wait (1000–2000 ms), keeping `enableOfflineQueue: false` and `maxRetriesPerRequest: 0` for the outage bound the author already measured.

### 5. Low — followers receive 503 when a healthy leader takes longer than 2 s
**Where:** `apps/backend/src/lib/store-cache.ts:64, 74`.

**Trigger:** a cold fill that legitimately takes more than 2 s (a large product page under load). Followers stop at 2 s and answer 503 with `Retry-After: 1` even though the leader is about to succeed. This is by design and unit-tested; the cost is customer-visible errors on a slow cold start instead of a slightly longer wait.

**Fix (choose by measurement):** keep waiting a little longer (for example 5 s) or, after the timeout, let the follower fall through to `next()`; the 256-entry cap and the in-flight request count still bound the work.

### 6. Low — the audit-hardening burst test writes a tracked file and does not test the claim
**Where:** `apps/backend/integration-tests/http/audit-hardening.spec.ts:164-165`.

**Trigger:** the "bounds a cold forty-read burst" test calls `writeFileSync` on `docs/reviews/audit-load-results.json` on every run. After my run the worktree showed `M docs/reviews/audit-load-results.json`, so any developer or CI run dirties the tree. It also accepts any mix of 200 and 503 and never checks how many origin handlers ran, so it would pass without the follower coalescing it is named for (the unit test is what actually proves that).

**Smallest fix:** log the numbers instead of writing the file, and assert a bound on origin work (for example spy the handler and expect far fewer than 40 calls), or drop the claim from the test name.

### 7. Low — a second worker logs a lock error on every cron cycle
**Where:** `apps/backend/src/jobs/expire-points.ts:37`, `apps/backend/src/jobs/remove-abandoned-carts.ts:84`.

**Trigger:** `execute(..., { timeout: 1 })` throws when another instance holds the job lock, so the losing instance reports a failed job each run. Correctness is fine (the work is fenced); it is alert noise once failed-job alerts exist (A17).

**Smallest fix:** catch the lock-timeout error in the job wrappers and return quietly.

## Checked and found sound (by area)

1. **Cart privacy and queue.** `queue.reset()` bumps the version and swaps the state object, so a late result from the old session returns `stale` and is never synced; `confirm()` is guarded by the version check before it can write into a new session's state; sign-out also removes the `vi2-pending-checkout:` keys (`customer.ts:138`). The waiting-mutation cap is checked before async cart creation, rejected work is not counted, and rollback restores the click-time snapshot. Edits before a new line has an id resolve the line from the confirmed cart when the queued task runs (`queuedLine`). Promotions share the queue, and a failed cleanup leaves the confirmed intermediate cart authoritative with a visible error. I specifically tried the edge raised in the earlier source review, a signed-out visitor whose cart never loaded: with a real React 19 render in the in-app browser, `vi2-signed-out` then `addItem` succeeded (new cart created and item added), because `clearCart` always re-renders via `setItems([])`; no defect.
2. **Loyalty.** Every ledger write goes through `recordPoints`, which now runs inside one transaction holding `pg_advisory_xact_lock` per customer, with `(kind, source_id)` unique as the last guard. The audit-hardening tests really exercise the claims: overlapping writers with the Redis lock bypassed still end at balance 0 with removals `-80` and `-20`; an aborted lease rolls back its entry before a second refund commits; a refund marker newer than the delivery snapshot makes delivery retry. Refunds are read before the transaction and re-validated inside it. Expiry and history use SQL aggregates and keyset pages of 500 customers (1001-entry and 501-customer tests pass); the pending-points scan is paged but proportional to the customer's order history, as documented.
3. **Catalog refresh.** Coalescing, the 1000-id cap, routine-versus-mutation separation, `keepReadable` for routine rebuilds, fail-closed state on a changed price watermark, and "a failed routine refresh does not extend expiry" all behave as described and are covered; my full run of the catalog-sorting and catalog suites passes. The one structural limit is finding 2.
4. **Cache.** Query keys are canonicalized and bounded by an allow-list; unknown dimensions bypass the cache; the 256-fill cap and 2 s follower timer bound work; validation errors reach followers as the native error (the earlier test gap is fixed with a macrotask barrier). The Redis-stall fallback (150 requests, no offline queue) is the author's measurement; I confirmed the production options work end to end against a real Redis (cache, hit, invalidate, 20,000-key `SCAN` invalidation in ~1.5 s).
5. **Large histories and catalogs.** Category pagination rejects repeated pages and bad counts, has a 15 s total deadline and a 10,000-category budget, and uses iterative traversal; the points and refresh paths use bounded pages. Brand directory counts were removed rather than approximated.
6. **Visibility.** Brand filters use only active brands; the bundle route is scoped to the publishable key's single channel and the region; counts come from the same index that hydrates the page.
7. **Production build and boundaries.** Both builds pass. `REDIS_URL` is required only when `NODE_ENV=production`, and the production config already requires `JWT_SECRET`, so this adds no new build prerequisite. The hydration route is bounded to 24 ids with no filters, the points route is authenticated, and cart and email-change locks now recheck ownership and cancellation inside the lock.

Competing admin edits: the real two-admin test preserves independent fields and applies latest committed save for one field, matching the owner's decision; no stale-save rejection was added.

## Deployment follow-ups: are the limits described accurately?

- **Trusted visitor-IP / Cloudflare limits (A14): accurately described as open.** One addition: while the app has no per-visitor limit, anonymous clients can also drive Redis key cardinality, because `q`, `id`, `fields` and `offset` are allowed cache-key dimensions with arbitrary values. The gate is therefore also a Redis memory-sizing gate.
- **Resource sizing and longer load tests: accurately described as unmeasured.** The only load evidence is one 200-variant product with 40 cold reads (all 200, 1.8 s), and it does not assert bounded work (finding 6). Rebuild cost at real catalog size is unmeasured: each page loads calculated prices for up to 100 products' variants at once.
- **Native bundle index migration and reseed: accurately described as a release prerequisite, but nothing enforces it.** Against an unseeded index the route returns a raw 404 (finding 1) and the storefront silently drops the Bundles section; a new kit also appears only after the next refresh because the subscriber listens to `LinkProductVariantInventoryItem.detached` but not attach (`subscribers/catalog-ranking-refresh.ts:22`), which the five-minute bound covers. Consider a deploy check that `/store/deals` returns 200 before traffic.

## Remaining risks (not defects)

Redis multi-process behavior and BullMQ lock duration during a very long rebuild; production-size rebuild time and database pool budgets; Redis memory and failed-job alerts; physical-device and screen-reader behavior; the full integration suite was run once on an in-memory event bus, so retry/backoff on real Redis queues is the author's evidence only.

## Verdict

**REQUEST CHANGES.** Fix finding 1 (the failing existing test and the 404 mapping) and either fix or explicitly accept finding 2; findings 3 and 4 are small configuration/retry changes worth taking in the same pass. After those, I would approve.
