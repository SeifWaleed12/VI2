# Review: PR #20 combined with full-stack

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-24: PR #20 (`codex/catalog-sorting`) had many conflicts with `full-stack` after #17, #18, #19, #21 and #22 were merged. Seif chose a new Claude branch that merges #20 into the current `full-stack`; the PR from it replaces #20.

Branch `claude/catalog-sorting`, merge commit `5067c4e` (parents: `full-stack` `1dadf34`, `codex/catalog-sorting` `41dd3f0`). Review the merge result against both parents: `git diff 1dadf34 5067c4e` for what #20 brings plus the resolution, `git diff 41dd3f0 5067c4e` for what changed in #20's own code.

## The conflict

#20 and the merged #17/#18 both built on the same native `product` search index:

| Area | full-stack (#17/#18) | #20 |
|---|---|---|
| Search | `/store/product-search` + `searchProducts`, nightly reindex job | `/store/catalog` with `q`, refresh subscriber + minute reconcile job |
| Deals page | `getDeals`: Bundles section + "On sale" from sale price lists (`/store/deals` `product_ids`) | Sortable shop view with `deals=1`, from the index's deal fields |
| Header pop-up | `searchProducts` | (unchanged, still `searchProducts`) |

## Resolution

1. **#20's catalog route everywhere.** Shop, search, sorting, Deals and the header pop-up (`GlobalSearch` → `listCatalog({ q, limit: 6, sort: "default" })`) use `/store/catalog`.
   - **Deleted:** `api/store/product-search/route.ts`, `jobs/reindex-product-search.ts`, its `cachedCatalogRoutes` entry, `services/search.ts` and its test.
   - `lib/product-search.ts` stays: #20's index and route use its filters and search document.
2. **`/deals`** is #20's sortable sale view, with the Bundles section back on top.
   - `ShopView`/`ShopClient` take an optional `lead` node, rendered under the page intro.
   - `deals/page.tsx` passes `<Bundles>`, which shows only on the unfiltered first page (no `q`, brand, category or goal; page 1). When it's empty or fails, it is hidden and the sale list still shows.
   - `getBundles` replaces `getDeals`.
   - `/store/deals` now returns only `{ bundle_ids }`. `saleProductIds`, `dealProductIds` and `isLiveForEveryone` are deleted, since sale discovery is #20's index job.
3. **Kept from full-stack:**
   - the goal chip's accessible name (`aria-label` "Remove filter: <goal>");
   - the health-goal shop tests (#20's `shop-page.test.ts` had none);
   - the `{ goal: [..] }` invalid-filter case.
4. **Merge leftovers fixed:**
   - `i18n.ts` had duplicate `deals.title`, `deals.description` and `goal.*` keys (TS1117). #20's Deals description is kept. The five unused keys (`deals.onSale`, `deals.empty*`, `deals.error*`) are removed.
   - `ShopProps.filters.goal` is required again (`ShopView` always passes it).

## Tests changed, and why

| Test | Change |
|---|---|
| `integration-tests/http/product-search.spec.ts` | Ported to `/store/catalog?region_id=…`. Uses `refreshCatalog` in place of the deleted reindex job, waits for initial seeding like `catalog-sorting.spec.ts`, and polls through 503 while refreshing. Adds a `sort=price_asc` text-search case and a 101-character `q` → 400. The empty-`q` 400 case was dropped, because `q` is optional on the catalog route. |
| `integration-tests/http/merchandising.spec.ts` | Keeps the bundle and tag tests. The sale-list tests moved to #20's `catalog-sorting.spec.ts` (public sale, customer-group, override and bulk lists). |
| `lib/__tests__/deals.unit.spec.ts` | Kit test only. |
| `catalog.test.ts` | getDeals/asDeal tests replaced by a `getBundles` test. "Never borrows a price" now finds variants by id, because #20's `mapMedusaProduct` sorts variants by rank. |
| `shop-render.test.ts` | #20's "exactly one goal-removal chip" now counts the chip's accessible name: the plain label also appears in the sidebar and in the chip text. |
| `deals-page.test.ts` | Rewritten for the new page: the shop view gets `deals: "1"` and the Bundles lead. Bundles render in EN/AR and are hidden for search, filters, page 2, empty and failed. |

## Verification

- `npm run check`: backend 34 suites / 266 tests, storefront 50 suites / 484 tests, typecheck and lint pass.
- HTTP against Postgres:
  - `merchandising.spec.ts`: 2/2 pass.
  - `product-search.spec.ts`: 1/1 pass.
  - `catalog-sorting.spec.ts`: 1/1 pass.
- **Live in the reviewed baseline** (merged, `db:migrate`, backend restarted):
  - `/en/deals`: Bundles (2 kit products), then 1 sale product.
  - `?sort=price_desc` sorts the sale list, and Bundles stay on top.
  - `/en/deals?q=whey` hides Bundles.
  - `/en/shop?q=protien` and `?q=whye` find the whey products (typo).
  - `/ar/shop?q=صاغ` finds the product by its Arabic name.
  - `sort=price_asc/desc` on the shop reverses the order.
  - Header pop-up "protien" suggests both whey products.
  - Mobile 375 px Arabic `/deals`: no sideways scroll.

## Things to look at

- The Bundles section is ordered by `/store/deals` (not sortable) and isn't counted in "N products". That matches its separate heading, but say if you see it differently.
- The header pop-up now goes through `/store/catalog`. While the index refreshes (503), it shows "search failed" instead of falling back. Before, `/store/product-search` had no 503 state.
- `/deals` breadcrumb reads "Home / Shop" (#20's, unchanged).

## Not done

- No changes to #20's ranking, refresh or hydration code.
- No live migration outside the local baseline. No PR yet: it opens after this review.
