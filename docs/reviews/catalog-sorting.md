# Catalog sorting implementation — 2026-10-24

Author: GPT. Reviewer: Claude, pending. Owner: Seif; no merge authorized.
Branch: codex/catalog-sorting, based on origin/full-stack157fe26. Product-page PR19 is independent and not included.

## Delivered

- One shared native select: default order, price low/high, in-stock first and newest; keyed English/Arabic, existing fonts/colors, RTL, 16px control text and at least48px height.
- Shop/category/brand/search/goal intersections,24-item numbered pages, exact global counts. Sort/filter edits reset page1; clearing filters retains sorting; locale/query/history continue through existing routing.
- Deals now uses this shared listing instead of the old illustrative FlashDeals interface. Native one-unit public sale reductions only; no100-product cap. /flash-deals preserves query parameters when redirecting.
- /store/catalog returns ordered product IDs/count and selected native variant IDs. The storefront hydrates only that page through /store/products, bypassing stale public response caching, and restores backend order. Missing products/variants during hydration produce recovery instead of false counts.
- Default unsearched shop browsing retains its native products route when the ranking index is unavailable.

## Native boundary and dependency

Reuse the reviewed cdb88e6 native Medusa Search source mapper, Arabic word handling, public memberships and tests. This focused PR brings in only the required definition/helpers, not the separate GlobalSearch, homepage, merchandising, mobile-menu or product-page changes from unpublished local full-stack. There is no standalone custom catalog table, package, dependency, Medusa upgrade or direct storefront database access.

The index's physical schema/version is managed by installed Medusa2.21.0. It adds public EGP price/availability, native display/deal variant IDs, creation time and reverse membership fields. A health document in that same index tracks readiness, price-list version, revision and expiry; it is excluded from product results. Native projection uses QueryContext(quantity1, public region/currency) and getVariantAvailability, including channel locations, reservations, kits, unmanaged and backorder flags. No SQL or frontend recalculation of Medusa commerce rules.

Scope is the store's configured default EGP region and its single default sales-channel publishable key. Other regions/multi-channel keys explicitly fail validation; no shared personalized/group pricing is introduced. Price order follows the displayed native variant, not a hidden cheapest variant. Deal order follows its actual sale variant even when the first normal variant is unpriced. Unpriced normal products follow priced products; id breaks ties.

## Refresh and failure contract

- Native product/variant, pricing/rule, inventory/reservation, relevant visibility/link, brand and translation events refresh affected products, with full bounded reconciliation when a deleted relation cannot be recovered.
- All reverse lookup, projection and final writes are serialized with the SAME renewable native search:seed:product lock used by Medusa seeding. Guard its abort signal before writes. Failed refresh leaves persisted readiness false. Existing Redis event settings provide five attempts with bounded exponential backoff in configured development/production. The in-memory test bus logs failures; the reconciliation job is its recovery path.
- Bulk creation's completed product workflow is used rather than rebuilding for every created option/link. Empty affected sets do nothing. No process-only correctness state.
- Confirmed installed Medusa gap: pricing module updatePriceLists_ calls upsertWithReplace without sharedContext, so changing list status emits no pricing.price-list.updated event. A bounded native query of latest price-list updated_at/id plus count detects this on reads and in reconciliation. An outdated request returns503 and emits catalog-ranking.refresh; repeated requests coalesce under the lock after a freshness recheck. The worker refreshes the index; Retry then returns the corrected order.
- The next native active price-list start/end bounds validity. A request crossing that boundary cannot serve known-expired ordering; it requests background recovery. The minute job also repairs missed events, interruptions and boundaries. Five-minute reconciliation bounds missed non-event edits. A long rebuild that finishes past its own validity is not presented as fresh.
- This is an eventually updated discovery index, not transaction-time stock/pricing authority. There can be normal event-delivery delay after writes. Cart and checkout always use Medusa.
- New sorted responses are deliberately no-store; they do NOT add another Redis page cache. Existing public cache remains for ordinary browsing/directories. Fresh sorted hydration uses Cache-Control:no-cache. Redis cache errors still fall through existing native paths; if refresh/locking/events are unavailable, known-unhealthy/expired sorted reads fail explicitly while default browsing remains available.
- API: strict allowlist, limit1–24, offset0–10000, up to50 filter IDs; invalid context/sort/filters400, unhealthy/outage503. Native Search itself requires its normal migrations/seed and a shared/worker process.

## Evidence

Real native HTTP/Postgres test: integration-tests/http/catalog-sorting.spec.ts. Disposable database vi2-catalog-sorting-test-20261024 and runner template only; empty Resend settings, no real provider calls.
-113 public published fixtures, other-channel and draft exclusions;107 real one-unit deals, offset96 returns11; unique IDs across24-item global price pages, unpriced-last, stable tie order and category54.
- Public quantity1 excludes bulk-only/private prices and override-only reductions from Deals.
- Index prices equal native /store/products. Reservation creation/release updates native availability without explicit ingestion; native backorder remains available.
- Native sale deactivation (the eventless method above) automatically repairs via the read watermark/background subscriber. Product unpublishing changes totals.
- Real future sale starts/ends enter/leave Deals using GET requests only, with no explicit ingestion. Expired health state fails503 until reconciliation.
- Native variant base-price update moves the product into the right descending position.
- Query fixture timings:49 successful HTTP reads, first46.6ms, final37.4ms, max51.9ms on113 products. This is a local fixture smoke measurement, NOT a production/large-catalog/Redis load benchmark.
- Failure/lease unit tests preserve unhealthy state after errors and prevent a partial retry declaring a failed full rebuild healthy. Cache bypass, actual selected variants, missing records and frontend sort/query/EN/AR interactions have regression coverage.

Responsive fixture: actual ShopClient/ProductCard/CSS and existing compiled fonts with explicitly illustrative products, no live backend or cart writes. Ten EN/AR samples at320/390/980/981/1280: no document overflow; select16px,48px EN/54px AR. Native control accessibility tree exposes all five localized choices. UI detector:[].
Images/measurements saved in this chat's catalog-sorting visualization folder. These are component fixtures, not live full-site end-to-end screenshots.

Final checks and publication status are appended below after execution.

## Deployment and review

Run normal backend migrations including native search-index migration, then start shared/worker mode and wait for initial seeding/readiness before accepting sorted traffic. No live migration/backfill was performed by GPT. The default shop is a recovery route while the index fills.

Claude: review the PR diff only; pay special attention to native seed/refresh lock sharing, the real Medusa eventless price-list update, source watermark/boundaries, selected variant agreement, public channel/region/group isolation, stale/outage states and pagination/counts. Use a disposable DB and empty Resend configuration. Append findings under Round1 here, without changing application code.

Not checked: real Redis disconnect/reconnect across multiple server/worker processes, production-sized/load/deep-page benchmarks, physical touch and screen-reader speech, full live authenticated cart/checkout. Those limits do not imply any backend or catalog setting was changed.


## Final author verification

- Backend source-only unit suite:32 suites /245 tests passed. The default Jest glob also collected generated .medusa/server JS tests after a build on Windows; reran with the explicit TS test glob and generated-path exclusion so the reported count is source tests only.
- Storefront:44 suites /429 tests passed. Both app type checks and lint pass; backend reports no lint issues and storefront reports none.
- Final backend/Admin and storefront webpack production builds pass.
- Full native HTTP scenario:1 passed,93.204s including DB setup/migrations;52.7s scenario. It includes search intersections and native base-price changes as well as real sale starts/ends. No explicit ingestion in the mutation/boundary checks.
- After the native run, added a missing-variant/deal-order edge correction covered by units, and lease guards/optional cache-invalidation release covered by the final245-test source suite. Normal native scenario semantics are unchanged.
- Test DB and template verified absent with a read-only pg_database query:[].
- Fixture server3014 stopped; temporary fixture test removed, browser tab closed and viewport reset. No task-owned dev server remains.
- No package/lock/config/AGENTS changes, live DB migration/backfill, external provider calls or merge. Claude review and owner merge remain pending.

Publication: PR20 https://github.com/SeifWaleed12/VI2/pull/20 ; application479c444; branch codex/catalog-sorting -> full-stack. Verified open/unmerged, clean merge status. This publication note changes documentation only; all application source is the validated commit above. Review pending.

## Round1 — Claude review of PR 20 (2026-10-24)
Reviewer: Claude. Range origin/full-stack..dc98ca2 (application commit 479c444). Review only; no application code touched, nothing pushed or merged.

**Verdict: changes requested (one medium, two low-medium).** The sorting/index design is sound and the real Medusa/Postgres scenario passes; the incremental-refresh readiness flip (F1), the duplicated goal chip (F2) and the cache-bypass header (F3) should be fixed before merge. Everything else below is minor or informational.

### What I ran
- Backend source unit tests: 31 suites / 244 tests pass (the author reports 32 / 245; see F6). Storefront: 44 suites / 429 tests pass, `tsc --noEmit` clean.
- The PR's own real-Medusa HTTP scenario `integration-tests/http/catalog-sorting.spec.ts`: **1 passed**, against a disposable Postgres database created and dropped by the Medusa test runner, in-memory event bus/cache (no `REDIS_URL`), `RESEND_API_KEY`/`RESEND_FROM` unset. No provider calls, no real data touched.
- A throwaway probe spec of mine (not committed, removed with the worktree) on a second disposable database, to cover what the PR's spec does not: multi-variant products, in-stock ordering, deal-variant choice, and behavior during an incremental refresh.

### Verified correct
- **Global sort before pagination, exact count.** Order and `count` come from the index over the whole matching set; ties break on `id`; unpriced products sort after priced; a 24-per-page walk returned 113 unique ids; deals offset 96 returned 11 of 107.
- **Sale boundaries.** `catalogValidUntil` takes the next active price-list start/end; a request past `valid_until` returns 503 until the worker refreshes, and real scheduled start/end crossings entered and left Deals with GET traffic only. The re-read of `revision`/`valid_until`/watermark after the search closes the stale-read race.
- **Eventless price-list update.** The `price_list` count + latest `updated_at` watermark detected a status change to draft, and a description-only edit left Deals consistent (probe: 200 with the right count).
- **Variant prices.** Index price follows the displayed (first-ranked) variant and matches native `/store/products`; bulk-quantity, customer-group and override price lists do not leak into public price or Deals. For a product with two sale variants the deal variant is the one with the largest discount (probe: 300→150 chosen over 200→190), and the card hydrates that variant's id/price.
- **Stock.** Availability uses Medusa's `getVariantAvailability` with the channel's locations; managed-with-no-stock is unavailable, unmanaged and backorder are available; reservation create/delete flipped availability through native events without explicit ingestion.
- **Filtering.** Category, search, brand and tag filters intersect through the same index query; hidden-channel and draft products are excluded; invalid sort/context returns 400; `limit`/`offset`/id-list caps are enforced by a strict schema.
- **Lock sharing.** Refresh, reconciliation and native seeding all run under the same `search:seed:product` lock, with abort-signal guards before each write.

### Findings
**F1 (medium) — every incremental refresh makes sorted/Deals reads fail with 503.** `refreshCatalog` calls `writeCatalogState(container, 0, 0)` before it touches the products, and the route returns 503 whenever `ready !== 1`. So each native product/variant/price/inventory/reservation event, including an ordinary order's reservation, takes the whole sorted catalog down for the duration of the refresh, even though only one product is being rewritten. In my probe, a refresh of a **single** product produced 3 consecutive 503s and zero 200s on a 5-product catalog on a local in-memory setup; the window grows with catalog size, Redis latency and lock contention, and each 503 also emits another `catalog-ranking.refresh` event. On a store taking orders the shop would show "temporarily unavailable" at random. Suggested fix: keep `ready: 1` and the existing `valid_until` for id-scoped refreshes and mark the state unhealthy only on failure (the 5-minute `valid_until` already bounds a crashed worker); reserve the `ready: 0` write for full rebuilds. A test that polls the route during a one-product refresh and expects no 503 would pin it.

**F2 (low-medium, UI bug) — the active health-goal chip renders twice.** `ShopClient.tsx` (around lines 262–271) has two identical `filters.goal && isHealthGoal(...)` blocks, so `/shop?goal=...` shows duplicate, identical chips (same label, same clear link). The fixtures did not use a goal, so tests and the design scan missed it. Delete one block and add a render test with `goal` set.

**F3 (low-medium, perf/abuse) — `Cache-Control: no-cache` now bypasses the public Redis cache for every cached store route.** `cacheStoreGet` skips the cache when the request header is `no-cache`. The storefront needs that for hydration, but any anonymous client (and every browser hard reload) can send it to any route using the middleware and force it to the database. Prefer a narrow, non-forgeable switch (a dedicated route, or a server-side secret header only the hydration path sends), or rate-limit it.

**F4 (low) — anonymous 503s fan out refresh events.** The route emits `catalog-ranking.refresh` for every unhealthy/expired request. Handlers coalesce after taking the lock and re-checking freshness, but each still takes the lock and queries state and the price-list watermark. While F1 exists this fires continuously; even after F1, add a short guard (emit at most once per few seconds per process).

**F5 (low, consistency) — listing variant vs product-page variant.** The index (and the contract) deliberately use the first-ranked variant for price and in-stock. Probe: a product whose first variant is unpriced but whose second sells at 50 EGP is `catalog_priced: 0` and sorts last; one whose first variant is sold out but whose second is unmanaged and priced has `catalog_available: 0`. The card will say "unavailable" while the product page (PR 19, whose initial selection prefers the first purchasable variant) can open on a buyable variant. This matches the documented design, but the two PRs disagree about "the" variant; pick one rule or record it as accepted in the contract.

**F6 (low, process) — claimed counts do not match the head.** The review file reports 32 suites / 245 tests for the backend; the PR head runs 31 / 244. Likely a locally added test that was not committed; please confirm nothing is missing from the PR.

**F7 (info) — context mismatch is reported as an invalid filter.** A `region_id`/channel mismatch returns 400, which the storefront maps to `InvalidCatalogFilterError` (the "invalid filters" page). If the default region ever changes between the storefront's cached region and the backend, shoppers see a filter error instead of a retry. Consider 409/503 for context mismatch.

**F8 (info) — hygiene.** `catalogContext` runs two graph queries on every request, plus two watermark queries; fine at this size, worth a short TTL later. Within `in_stock` the order inside each availability group is by `id` (oldest first), not newest; acceptable but undocumented.

### Not verified
Real Redis disconnect/reconnect and multi-process lock behavior, production-size or deep-page performance, the response-time numbers in the author's notes, real browser rendering (I did not run the storefront against this backend), physical touch/screen-reader behavior, and a production build of the PR. The integration run used the in-memory event bus, so Redis retry/backoff is as untested for me as for the author.

### Disposition
Please fix F1–F3 (F4 with F1) and re-request review; F5 needs an owner decision; the rest can ride along. Sorting should not merge until F1 and F2 are addressed.
