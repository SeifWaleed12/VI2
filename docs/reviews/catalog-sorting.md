# Catalog sorting implementation — 2026-10-24

Author: GPT. Reviewer: Claude. Round3 approves application d7dd517 with no new defects; ready for Seif to merge. Owner: Seif; no merge authorized.
Branch: codex/catalog-sorting, based on origin/full-stack157fe26. Product-page PR19 is independent and not included.

## Delivered

- One shared native select: default order, price low/high, in-stock first and newest; keyed English/Arabic, existing fonts/colors, RTL, 16px control text and at least48px height.
- Shop/category/brand/search/goal intersections,24-item numbered pages, exact global counts. Sort/filter edits reset page1; clearing filters retains sorting; locale/query/history continue through existing routing.
- Deals now uses this shared listing instead of the old illustrative FlashDeals interface. Native one-unit public sale reductions only; no100-product cap. /flash-deals preserves query parameters when redirecting.
- /store/catalog returns ordered product IDs/count and selected native variant IDs. The storefront hydrates only that page through the bounded /store/catalog-products native-handler endpoint, avoiding stale public response caching, and restores backend order. Missing products/variants during hydration produce recovery instead of false counts.
- Default unsearched shop browsing retains its native products route when the ranking index is unavailable.

## Native boundary and dependency

Reuse the reviewed cdb88e6 native Medusa Search source mapper, Arabic word handling, public memberships and tests. This focused PR brings in only the required definition/helpers, not the separate GlobalSearch, homepage, merchandising, mobile-menu or product-page changes from unpublished local full-stack. There is no standalone custom catalog table, package, dependency, Medusa upgrade or direct storefront database access.

The index's physical schema/version is managed by installed Medusa2.21.0. It adds public EGP price/availability, native display/deal variant IDs, creation time and reverse membership fields. A health document in that same index tracks readiness, price-list version, revision and expiry; it is excluded from product results. Native projection uses QueryContext(quantity1, public region/currency) and getVariantAvailability, including channel locations, reservations, kits, unmanaged and backorder flags. No SQL or frontend recalculation of Medusa commerce rules.

Scope is the store's configured default EGP region and its single default sales-channel publishable key. Other regions/multi-channel keys explicitly fail validation; no shared personalized/group pricing is introduced. Normal price order follows the first purchasable native variant, falling back to the first variant if none is purchasable (Seif confirmed during Round1). It does not select a hidden cheapest variant. Deal order follows its actual sale variant even when the first normal variant is unpriced. Unpriced normal products follow priced products; id breaks ties.

## Refresh and failure contract

- Native product/variant, pricing/rule, inventory/reservation, relevant visibility/link, brand and translation events refresh affected products, with full bounded reconciliation when a deleted relation cannot be recovered.
- All reverse lookup, projection and final writes are serialized with the SAME renewable native search:seed:product lock used by Medusa seeding. Guard its abort signal before writes. Failed refresh leaves persisted readiness false. Existing Redis event settings provide five attempts with bounded exponential backoff in configured development/production. The in-memory test bus logs failures; the reconciliation job is its recovery path.
- Bulk creation's completed product workflow is used rather than rebuilding for every created option/link. Empty affected sets do nothing. No process-only correctness state.
- Confirmed installed Medusa gap: pricing module updatePriceLists_ calls upsertWithReplace without sharedContext, so changing list status emits no pricing.price-list.updated event. A bounded native query of latest price-list updated_at/id plus count detects this on reads and in reconciliation. An outdated request returns503 and emits catalog-ranking.refresh; repeated requests coalesce under the lock after a freshness recheck. The worker refreshes the index; Retry then returns the corrected order.
- The next native active price-list start/end bounds validity. A request crossing that boundary cannot serve known-expired ordering; it requests background recovery. The minute job also repairs missed events, interruptions and boundaries. Five-minute reconciliation bounds missed non-event edits. A long rebuild that finishes past its own validity is not presented as fresh.
- This is an eventually updated discovery index, not transaction-time stock/pricing authority. There can be normal event-delivery delay after writes. Cart and checkout always use Medusa.
- New sorted responses are deliberately no-store; they do NOT add another Redis page cache. Existing public cache remains for ordinary browsing/directories. Fresh sorted hydration uses a dedicated /store/catalog-products route requiring 1–24 explicit product IDs; public Cache-Control headers cannot bypass ordinary cached routes. Redis cache errors still fall through existing native paths; if refresh/locking/events are unavailable, known-unhealthy/expired sorted reads fail explicitly while default browsing remains available.
- API: strict allowlist, limit1–24, offset0–10000, up to50 filter IDs; invalid sort/filters400, changed/unsupported context409, unhealthy/outage503. Native Search itself requires its normal migrations/seed and a shared/worker process.

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


## Initial author verification (before Round1)

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


## Author response, Round1 — 2026-10-24

F1–F4 are fixed; F5 implements Seif's explicit first-purchasable choice; F6 is reconciled; F7 is fixed; F8's tie ordering is documented. Claude recheck and Seif's merge remain pending.

- **F1:** ID-scoped refreshes no longer set global readiness false before projecting. Successful partial refreshes retain the previous full-build revision, watermark and expiry (or shorten expiry at a newly discovered sale boundary), so reads spanning an incremental write remain available. Full rebuilds still invalidate readiness/revision. A failed incremental write invalidates persisted health while it owns the lease. An aborted/lost lease cannot write health after ownership is lost; the persisted expiry and reconciliation bound recovery. A partial retry still cannot declare a failed full rebuild healthy.
- **F2:** Removed the duplicate health-goal chip. EN/AR render tests each require exactly one localized label/removal link.
- **F3:** Removed the public Cache-Control:no-cache bypass from cacheStoreGet. Fresh hydration now uses GET /store/catalog-products with 1–24 explicit product IDs, limit1–24, offset0 and required region; only id/region_id/fields/limit/offset are allowed. It reuses the installed native product GET plus its complete validation, publication, channel, pricing, tax and inventory middleware, with global allowFields for the existing public extensions. No duplicated native commerce serializer, new secret/configuration, dependency or general cache bypass. Native default browsing/directories retain their existing cache behavior. Locale remains explicit and the dedicated response is no-store.
- **F4:** HTTP recovery signals are limited to once per five seconds per process. A failed emission releases that guard for retry. Persistent index health and the minute reconciliation job own recovery; correctness does not depend on process memory.
- **F5:** Seif answered “Yes—use the first purchasable variant”. Normal default browsing and indexed listings now use the first priced/purchasable native variant in rank/created_at/id order, falling back to the first only when none is purchasable. Unpriced options retain price0 instead of inheriting another option's price; wholly unpriced products remain unavailable. The variant array has the same deterministic order for product-page selection. Deals continue to display their actual best-reduction sale variant, as documented. Both reported unpriced-first and sold-out-first cases have mapping/projection and native HTTP coverage.
- **F6:** No source test was left uncommitted. Verified all32 original backend source test files on dc98ca2 against Git, including src/__tests__/medusa-config.unit.spec.ts (one test), and the retained original source-only log confirms32/245. That root-level suite alone accounts for a one-suite/one-test inclusion difference. The review note does not contain its exact discovery command, so the precise invocation difference is not assumed. Final reproducible source-only invocation: npm test --workspace @dtc/backend -- --testMatch '**/src/**/__tests__/**/*.unit.spec.ts' --modulePathIgnorePatterns '[\/]\.medusa[\/]'. Final count is33 suites/264 tests after this response's added coverage. Generated .medusa JS is excluded.
- **F7:** Changed/unsupported region/channel context returns409, mapped to outage/retry rather than invalid filters; malformed input remains400. Route/service regression tests distinguish these cases.
- **F8:** Documented ascending product-ID tie order within stock groups. No speculative query/context cache added; future production measurements can justify one.

### Final verification for this response

- Backend source:33 suites/264 tests pass. Storefront:44 suites/435 tests pass (699 unit/render tests total).
- Backend typecheck (including Admin), backend lint and storefront lint pass. Both production builds pass; the storefront build includes its final TypeScript check. Known generated next-env.d.ts route-path rewrite restored after build.
- Real Medusa/Postgres HTTP scenario:1 passed,87.069s including setup/migrations,48.038s scenario. Original113 visible/107-deal global-pagination, public pricing/channel visibility, reservation, eventless price-list and real future sale-boundary cases still pass. Two later multi-variant fixtures bring the final visible total to114 after the earlier unpublish.
- New real probe holds a native one-product projection open: all five catalog GETs return200 during the refresh, plus200 afterward. Native computation is unchanged; the graph call is gated only to make the concurrency interval deterministic. The route still rejects a full-build revision change in a separate regression test.
- Dedicated hydration returns native prices and assigned category fields with explicit Arabic locale, rejects missing IDs/nonzero offset, and excludes draft/other-channel products. Projection and real native fixtures select the50EGP second variant when the first has no price or no stock.
- New guard tests cover a ten-request unavailable burst, five-second re-emission, failed event-bus emission, and unchanged/rebuilt state revisions. Public no-cache header tests preserve cached products, regions and category reads.
- Isolated test DB vi2-catalog-sorting-test-20261024 and runner template verified absent afterward with a read-only database-name query: []. Resend settings empty; no real emails/providers, live migration/catalog changes, new dependencies or merge.

Not rerun: full live-browser visual/keyboard flow (the only markup change deletes a duplicated chip; both locale render checks pass), real Redis multi-process/disconnect behavior, production-scale load, or live authenticated checkout. Original responsive fixture evidence above remains scoped to the earlier layout, which this response does not restyle.

## Round2 — Claude recheck of PR 20 at cacafbf (2026-10-24)
Reviewer: Claude. Range dc98ca2..cacafbf. Review only; no application code touched, nothing pushed or merged.

**Verdict: approve.** F1–F8 are resolved or accepted as stated; I found no blocking defects. Three low/informational notes remain (N1–N3).

### What I ran
- Backend source-only unit tests with the author's documented command: **33 suites / 264 tests pass**. Storefront **44 suites / 435 tests pass**. `tsc --noEmit` clean for both apps. This reproduces the author's counts, so F6 is closed.
- The PR's real Medusa/Postgres scenario (`catalog-sorting.spec.ts`): **passes**. Isolated databases created and dropped by the Medusa test runner, in-memory event bus and cache (no `REDIS_URL`), `RESEND_API_KEY`/`RESEND_FROM` unset; a read-only database-name query afterward found none left behind.
- A throwaway probe spec of mine (not committed) on a second isolated database, against real native routes, to check the fixes directly.
- Not run: production builds, a browser pass, real Redis.

### Verification by finding
- **F1 — fixed.** With a one-product refresh running, three catalog reads returned 200 and none returned 503; the persisted `revision` was unchanged and `ready` stayed 1. A forced failure while upserting product documents made the refresh throw and left `ready: 0` (reads then return 503); a full refresh recovered it to 200. Full rebuilds still invalidate first; the catch writes health only when the lease signal is not aborted, so a worker that lost its lock cannot clobber a newer owner.
- **F2 — fixed.** The duplicate goal-chip block is deleted; EN/AR render tests require exactly one chip and one removal link.
- **F3 — fixed, with the new route behaving as described.** The `no-cache` bypass is gone from `cacheStoreGet`. Fresh hydration now uses `/store/catalog-products`, which re-exports Medusa's native product GET with the native product-list middlewares. Probe, with the storefront's real `PRODUCT_FIELDS` string: 200, `Cache-Control: no-store`, the hidden-channel and draft products were excluded (2 of 4 requested ids returned), and it returned the same products as `/store/products`. The 400s: no ids, `offset=1`, an extra `q`, an extra `brand_id`, 25 ids, and a request with no publishable key.
- **F4 — fixed.** `requestCatalogRefresh` limits signals to one per five seconds per process and releases the guard on a failed emit; recovery still rests on the persisted state and the minute job.
- **F5 — implemented as decided.** Probe: a product whose first variant is unpriced indexes at 50 EGP on its second variant with `catalog_available: 1`; a product whose first variant is sold out (managed, no stock) indexes at 120 EGP on its unmanaged second variant, available. The storefront mapper now picks the same first-purchasable rule, so cards and the product page agree for these cases. Deal listings keep the best-reduction sale variant.
- **F6 — closed** (counts reproduced above).
- **F7 — fixed.** A region/channel mismatch now returns **409** (probe: `region_id=reg_other` gives 409); the storefront treats any non-400 as a retryable outage rather than an invalid filter. Malformed input stays 400.
- **F8 — documented**; no speculative caching added.

### Notes
**N1 (low) — `variant_rank` is requested but never returned.** The storefront now asks for `variants.variant_rank` and re-sorts by it, but Medusa's store API does not return that field (probe: absent from both `/store/products` and `/store/catalog-products` responses; the database has rank 0 for every variant here). The index orders by rank, then `created_at`, then id; the storefront therefore effectively orders by `created_at`, then id. They agree today because ranks are all 0, but if an admin ever reorders variants (non-zero rank) the card could pick a different "first purchasable" variant than the index. Either expose the rank through an allowed field, or drop `variant_rank` from the index ordering and use `created_at`/id on both sides, and add a test that fails if the two orderings diverge.

**N2 (low) — hydration is a public, uncached, bounded read.** The dedicated route is capped at 24 explicit ids with no filters, which is far narrower than the old header bypass, but it is still an uncached pricing/inventory computation that any holder of the public key can call repeatedly. Worth an edge rate limit before launch. It also imports Medusa internals (`@medusajs/medusa/api/store/products/route` and `.../middlewares`); the startup guard fails loudly if the path moves, so a Medusa upgrade should re-test it.

**N3 (info) — one failing product can hold sorting unhealthy.** An incremental refresh that throws marks the whole index unhealthy. If a single product reproducibly makes `catalogDocuments` throw (bad data, an availability lookup error), each retry and each minute-job full rebuild would fail the same way, so sorted and Deals pages would stay on 503 until the data is fixed. The default shop browse still works. Consider catching per-product failures in a full rebuild (skip and log the product) instead of failing the whole index.

### Not verified
Real Redis disconnect and multi-process lock behavior, production-scale or deep-page performance, response-time numbers, real-browser rendering, and the production build. The integration runs used the in-memory event bus.

### Disposition
Approved for the owner to merge. N1 is the one I would fix first because it is a latent disagreement between the card and the index; N2 and N3 can follow.


## Author response, Round2 — 2026-10-24

Claude approved cacafbf in7e7f1a4 with no blocking defects. The N1 follow-up is one public field added to the existing global allowFields list; no commerce logic, native sort rule or frontend application code changes.

- **N1 fixed:** allow variants.variant_rank on both /store/products (including product retrieval) and /store/catalog-products. The existing storefront request/mapper can now use native rank instead of silently falling back to creation order. Regression fixtures have two purchasable variants, then use the native update workflow to reorder them to ranks9 and2. Both endpoints and both locales must expose those exact non-zero values; the index and hydrated card order must choose the50EGP second option. Backend projection and frontend mapper tests separately require rank to beat created_at/id. Native Admin validates rank even though Medusa2.21's narrower workflow input DTO omits its named field; inferred fixture arrays retain the accepted native payload, without casting or disabling checks.
- **N2 retained as a launch follow-up:** the bounded hydration endpoint remains public/uncached. Edge rate-limit policy is deployment/owner work; no guessed IP/proxy policy or application limiter added. Retest the native handler/middleware imports on a Medusa upgrade.
- **N3 retained as explicit failure behavior:** do not silently skip a product and present incomplete catalog counts as complete. A persistent projection error keeps sorted/Deals recovery visible until repaired; default browsing remains available. A separate quarantine/omission policy would need an agreed customer-visible contract.

Validation: backend33 suites/265 tests and storefront44 suites/436 tests pass (701 total). Backend typecheck/Admin and lint pass; backend/Admin production build passes. Frontend application source is unchanged from Claude-approved cacafbf; its earlier build/type/lint evidence remains applicable, and the expanded storefront regression suite was rerun.

The first expanded native HTTP run passed all assertions but revealed pending local subscribers after runner teardown. The fixture now tracks the real ranking-lock promises and waits for completion before its database closes; no native projection, event emission or locking behavior is replaced. Final native scenario:1 passed,73.476s including setup/migrations (40.988s scenario); no open-handle warning or post-teardown subscriber errors. Both endpoints returned ranks9/2 in EN/AR, and native mutation moved index selection from the first option to the second. The original pagination, visibility, reservation, sale-boundary and incremental-read tests still pass. Disposable database/template confirmed absent afterward with a read-only name query: []. Empty Resend settings, no provider calls.

No live migration, catalog/provider changes or merge. Claude can recheck N1 and the fixture-only additions; owner merges.

## Round3 — Claude recheck of N1 at d7dd517 (2026-10-24)
Reviewer: Claude. Range cacafbf..d7dd517. Review only; no application code touched, nothing pushed or merged.

**Verdict: approve.** N1 is fixed and the regression coverage is real. N2 and N3 are retained as stated and I accept both as follow-ups. No new defects.

### What I ran
- Backend source unit tests with the documented command: **33 suites / 265 tests pass**. Storefront: **44 suites / 436 tests pass**. `tsc --noEmit` clean for both apps. The counts match the author's.
- The PR's real Medusa/Postgres scenario, including the new reordered-variants case: **passes**. Isolated database created and dropped by the Medusa test runner, in-memory event bus and cache (no `REDIS_URL`), `RESEND_API_KEY`/`RESEND_FROM` unset. Not run: production builds, a browser pass, real Redis.
- A throwaway probe of mine (not committed) on a second isolated database. One product with three purchasable variants, reordered through the native update workflow to ranks a=5, b=5, c=1, then read through the real routes using the storefront's actual `PRODUCT_FIELDS` string.

### N1 verification
- **Exposure.** `variants.variant_rank` is added to the one shared `STORE_PRODUCT_EXTRA_FIELDS` list that feeds both `/store/products` and `/store/products/:id`, and `/store/catalog-products` reuses it. Probe: the list, hydration and single-product retrieval responses all returned `a:5, b:5, c:1`. The earlier probe returned no rank on these same requests, so the field is now actually reaching the storefront. The field is a harmless public ordering integer.
- **Index agrees.** For that product the index selected variant c (rank 1), the same variant the storefront mapper picks when it sorts by the exposed rank first.
- **Regression coverage.** The HTTP scenario now creates a product, sets ranks 0/1, waits for the index to show the first option, then reorders to 9/2 through the native workflow. It requires both endpoints in English and Arabic to return exactly 9 and 2, the index to move to the second (50 EGP) option, and the rank-sorted hydrated list to start with that option. Two unit tests (backend projection, storefront mapper) give both options purchasable prices and make rank beat `created_at` and id. Together these fail if rank is dropped on either side, which is the divergence I flagged.
- **Fixture-only change.** The lock spy tracks `search:seed:product` executions and drains them before the runner closes the database. It does not alter projection, events or locking. One note: if an assertion fails earlier in that test, the drain and `mockRestore` are skipped, which can only add post-teardown noise to a failing run, not to a passing one.

### Notes
- **Deploy note (info).** `/store/products` responses are cached in Redis for their TTL, so entries cached before this deploy have no rank until they expire or are invalidated; until then the storefront falls back to `created_at`/id ordering. This matters only for products whose ranks are not all equal. Flush or wait out the product-cache TTL on release.
- **Ties (info).** Equal ranks fall back to `created_at` and id on both sides (probe: a and b, both rank 5, stay deterministic), and the backend and storefront use the same comparator.
- **N2.** Accepted as a launch follow-up: edge rate limit for the public bounded hydration route, and retest its Medusa-internal imports on an upgrade.
- **N3.** Accepted: a persistent projection error keeps sorted/Deals on the recovery state rather than serving silently incomplete counts, and default browsing remains available.

### Not verified
Real Redis behavior and cache invalidation across processes, production-scale performance, real-browser rendering and the production build.

### Disposition
N1 closed. PR 20 is approved from my side for the owner to merge, with N2 and the cache-flush deploy note as follow-ups.


## Final disposition — 2026-10-24

Claude Round3 approval5711dff imported unchanged above. Application remains d7dd517; this publication updates documentation only. No further code fixes or repeat tests required by the recheck. Owner merge remains pending.

Release follow-up: invalidate pre-release product-response cache entries or wait the current60-second product TTL before manually checking non-zero/reordered variant ranks. Sorted hydration is already uncached. No cache was flushed here. Keep the documented edge rate-limit/Medusa-upgrade checks and real Redis/multi-process validation as launch follow-ups. N3's explicit unhealthy-index recovery/default browsing behavior is accepted.
