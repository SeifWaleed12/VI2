# Catalog contract (RD-1)

Frozen 2026-10-13 for RD-3 (shop) and RD-4 (product page). A change here needs
its own reviewed task. Proven by `apps/backend/integration-tests/http/catalog.spec.ts`
(real database, more than 100 products) and
`apps/storefront/src/lib/medusa/services/__tests__/catalog.test.ts`.

## Storefront service: `listProducts` (`lib/medusa/services/products.ts`)

Request (`ListProductsParams`):

| Field | Meaning |
|---|---|
| `locale` | Required, `"en"` or `"ar"`. Sent as `x-medusa-locale` (`en-US`, `ar-EG`), so names come translated. |
| `category_id` | Category IDs. Medusa matches only the IDs given: to show a category with its subcategories, send the category and all its descendants (`categoryScope` in `lib/category-tree.ts`). |
| `brand_id` | Brand IDs, 1 to 50. Active brands only. |
| `tag_id` | Product tag IDs (Medusa native). Health goals are tags; values in `lib/health-goals.ts`, looked up with `getTagIds`. |
| `id` | Product IDs (Medusa native). Used by `getBundles` and catalog hydration; not combined with `brand_id`, which also filters by product ID. |
| `q` | Search text; trimmed, left out when empty. |
| `limit` | 1 to 100 (`MAX_PAGE_SIZE`); default 50. Out-of-range or non-numbers are brought within bounds. |
| `offset` | 0 or more; default 0. |
| `order` | Passed to Medusa unchanged (for example `title`, `-created_at`). No price or availability sorting is promised. |

Within one list, IDs combine with OR: a product matches when it is in any of
the given categories, or has any of the given brands. Across category, brand
and search, filters combine with AND. Filtering happens in Medusa, never in the
browser.

Response (`ProductPage`): `{ products, count, limit, offset }`. `count` is the
number of matching products across all pages.

Outcomes:
- **Unknown or inactive brand, or unknown category:** `{ products: [], count: 0 }`. Not an error.
- **An offset past the end:** an empty `products` with the true `count`.
- **Filters Medusa refuses (400):** for example a malformed brand ID or more than 50, typically from an edited or shared URL. Throws `InvalidCatalogFilterError` ("These catalog filters are not valid."). Show an invalid-filter message with a way to clear the filters, not an outage. The page may also validate URL input first; the service result stays the same.
- **Backend unreachable or failing:** throws `"Catalog temporarily unavailable."`. Show an outage with retry, not "no products".

`getProducts(params)` stays for existing callers: the first page (default 100 products, English), with no total and no brand filter. New listing code uses `listProducts`.

`getProductByHandle` and `getProduct` return the same `Product` shape for one product.

## `Product` fields for RD-3 and RD-4 (`types/product.ts`)

| Field | Source and rule |
|---|---|
| `brand`, `brandId` | Linked brand, only when its status is `active`; otherwise `brand` is `""` and `brandId` is absent. |
| `categories` | Every assigned category as `{ id, name, handle }`, names translated by locale. Absent when the product has none. Use `handle` for readable shop links and `id` for filters. |
| `categoryId`, `category` | First category's ID and name (kept for existing callers). |
| `eda` | `{ registrationNumber, approved }` when an EDA number is recorded; absent otherwise. Show the approval badge only when `approved` is `true`; approval never blocks buying (owner decision 2026-10-09). |
| Prices, stock, variants, options, images | Unchanged: Medusa's calculated EGP prices for the Egypt region, and real inventory. |

Not part of the contract: ratings and reviews (always 0), supplement facts, serving data, and anything from product `metadata` beyond what is already mapped. RD-4 omits facts that have no field.

## Backend (Medusa 2.21)

Native `GET /store/products` supplies `category_id`, `q`, `id`, `limit`, `offset`, `order`, `count`, publishing, the storefront's sales channel, translated fields and region prices. Two additions:

1. **`brand_id` on `GET /store/products`** (`apps/backend/src/api/catalog-filters.ts`):
   - It turns active brands into their product IDs before Medusa validates the query, so Medusa still applies everything above.
   - Malformed IDs, or more than 50, give a 400.
2. **Extra product fields the store API accepts** (`STORE_PRODUCT_EXTRA_FIELDS`):
   - `brand.id`, `brand.name`, `brand.status`;
   - `eda_registration.registration_number`, `eda_registration.is_approved`;
   - `categories.id`, `categories.name`, `categories.handle`. Medusa otherwise drops these silently;
   - `variants.variant_rank`, so native default browsing and uncached page hydration expose the same ordering used by the ranking projection.

Text search runs through `GET /store/catalog?q=…` (below), on the same `product` index (Medusa's Search module, Postgres engine, `src/search/product.ts`).
- **Searched:** English and Arabic names, brand, categories, variant names (flavor and size) and health-goal words. Not SKU, barcode or description.
- **Matching:** typo tolerant (`pg_trgm`, words of 4+ letters) and as-you-type (the last word is a prefix). A leading Arabic "ال" is dropped from the search words.
- **Scope:** only published products in the publishable key's sales channel.
- **Storefront:** `listCatalog` serves the shop, search, sorting, Deals and the header pop-up (6 suggestions as you type).

`GET /store/deals` returns `{ bundle_ids }`: products with an inventory-kit variant made of two or more different stock items, at most 100 (`src/lib/deals.ts`). The storefront lists them through `GET /store/products?id=…` above the sale list on the unfiltered first page of `/deals`. Products on sale come from `GET /store/catalog?deals=true`. Cached 60 s, cleared by any Admin write.

`GET /store/brands` lists every active brand, sorted by name and not capped. Each brand has `id`, `name`, `slug`, `logo`, `country`, `description`.

The product–brand link is one brand to many products (`src/links/product-brand.ts`).

## Known gaps (not in RD-1)

- **No admin screen or API assigns a brand to a product yet.** Brand filters return nothing until products are linked, either by the catalog import (Core 4) or by a future admin task.
- Categories have no product counts per filter option.
- Search is Medusa's basic text match. Meilisearch stays a separate task.


## Shared catalog ordering — 2026-10-24

GET /store/catalog: required region_id; sort=default|price_asc|price_desc|in_stock|newest; optional q (max100), category_id/brand_id/tag_id arrays (max50), deals=true|false; limit1–24 and offset0–10000. Returns { ids, count, limit, offset, variants: { [product_id]: display_variant_id } }. The order and count cover the complete matching index before pagination. IDs are hydrated through /store/catalog-products, which reuses the installed native /store/products handler and validation/context middleware; native data remains authoritative.

This initial projection supports only the configured default EGP region and a publishable key scoped to its one default sales channel. It never adds customer-group rules to public pricing. In-stock first means the displayed native variant is priced and purchasable, including native backorder/unmanaged rules, not a stock-quantity ranking.

Invalid filters400; a changed/unsupported region or channel context409 (retryable); unhealthy/expired/unavailable ranking503 with Retry/default-shop recovery. New sorted responses are no-store; their product hydration uses a separate uncached endpoint requiring 1–24 explicit product IDs, offset0, limit1–24 and the region. It accepts only id/region_id/fields/limit/offset; no arbitrary browsing, cart context or filters. Ordinary cached routes ignore public Cache-Control bypass headers. Initial native index migration/seeding and a shared/worker process are required. No custom catalog module/table, provider, dependency or direct storefront DB access.

Native module/workflow events refresh the index; eventless Medusa2.21 price-list updates are detected with a native list watermark. Sale boundaries expire ranking readiness and enqueue background recovery. Minute reconciliation catches interruptions and future boundaries; five-minute expiry bounds missed non-event edits. This is an eventual discovery projection; cart/checkout revalidate commerce. See docs/reviews/catalog-sorting.md for source/recovery/deployment evidence and limits.

Normal listings select the first priced, purchasable native variant in variant_rank/created_at/id order, falling back to the first variant only if none is purchasable (Seif, 2026-10-24). This also applies to native default browsing, and aligns with the product page's initial first-purchasable choice. Absent variant prices remain zero, never inherited from another option. Deals still select the actual public sale variant with the largest absolute reduction; only that variant's price/stock are displayed.

Successful ID-scoped refreshes preserve readiness, the previous full-build revision, price-list watermark and expiry (shortened if an earlier sale boundary is discovered). Full rebuilds change revision. Routine reconciliation keeps a still-valid, matching-price-version state readable while rebuilding; known broad mutations and invalid/expired state mark readiness false before rewriting. A failed routine reconciliation never extends its previous expiry. A failed incremental write marks health false while it still owns the lock; an aborted/lost lease never performs a health write and expiry bounds recovery. A partial retry cannot bless an interrupted full rebuild. An ordinary incremental update may become visible during a request; pagination is an eventual discovery view, not a transaction-time stock snapshot. The route still rejects a full-build revision change, known price-list version changes and expired sale boundaries.

Expired/unhealthy HTTP reads signal refresh at most once per five seconds per process. Failed event emission permits a retry; persistent health and the minute reconciliation job provide recovery independently of this best-effort guard. In-stock groups break ties by ascending product ID, without a newest-first promise inside each group. No additional context cache was introduced.

Hydration deliberately remains a public, uncached read bounded to24 explicit IDs. Set an edge rate-limit policy before launch; no new application limiter or guessed proxy/IP policy is introduced here. The native route/middleware imports must be revalidated on a Medusa upgrade. A reproducible native projection error keeps sorted/Deals reads unavailable until repaired; default browsing remains available. Full reconciliation does not silently omit products, which would change the promised complete-set filtering/count semantics.


### Audit follow-up (25 October 2026)

Default brand-filtered storefront reads also use /store/catalog, including exact projected count and 24-item pages. Unfiltered native default browsing remains a recovery path. Default brand browsing without search or Deals also falls back to native pagination on index network/404/5xx errors; native brands over 1,000 links retain the explicit validation error. Invalid filters and caller cancellation do not trigger fallback. The legacy /store/products brand adapter rejects a linked-ID set above 1,000; it never silently truncates it. Brand directory counts were removed rather than inferred from the first 100 products, and duplicate brand names retain separate ID-based destinations.

/store/deals now obtains at most 100 visible bundle IDs from the existing native product projection's filterable bundle flag, with readiness/expiry/price-version/revision checks. It no longer reads every variant/inventory link per request. Its existing cap remains; growth beyond 100 bundles requires a separate pagination decision. Native index migration and seeding are a release prerequisite for this field. Missing active-index versions return retryable 503 rather than a raw 404. No live index migration is performed by the audit-fixes task.

A batch merges redundant native events before refreshing. A larger retained ID set becomes one full reconciliation. Managed availability queries use at most 100 variant IDs each; unmanaged/backorderable variants do not need availability queries. This bounds query argument size, not arbitrary product relation size: representative variant/price-list workload measurement is still required.
