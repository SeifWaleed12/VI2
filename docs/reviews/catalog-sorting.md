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
