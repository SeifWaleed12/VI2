# Review: product search on Medusa's Search module (Phase 1)

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-23.

Branch `claude/product-search`, on top of `claude/merchandising` (PR #17), because search filters by health-goal tags. Review only the commits after `claude/merchandising`.

## Why

- **Shop search box:** used Medusa's `?q=` "contains" match. No ranking, no typos, no as-you-type.
- **Header pop-up:** downloaded the first 100 products on every page, filtered them in the browser (product 101+ never found), and used guessed health goals from `catalogMeta.ts`.

Medusa 2.21.0 already ships a Search module with a Postgres engine. It is registered by default, with ranking (`ts_rank`), typo matching (`pg_trgm`) and prefix matching. There was no product index. No new server or dependency is added.

## Seif's decisions (2026-10-23)

| Question | Decision |
|---|---|
| Typo tolerance and as-you-type matching | In both the pop-up and the shop |
| Pop-up suggestions | Same as before: photo, name, brand, category, real price |
| Languages | Arabic and English on either site |
| Searched details | Name, brand, category, flavor/size, health goal. No SKU, barcode or description |
| Empty pop-up | Recent searches plus popular terms |
| Renames | Nightly rebuild, plus Admin's rebuild button |

## What changed

### Backend

- **`src/search/product.ts`: the `product` index.**
  - **Searchable fields:**
    - `title`, `title_ar` (weight 3);
    - `brand` (2);
    - `categories`, EN and AR names (2);
    - `variants`, EN and AR titles (1);
    - `goals`, EN and AR words of the goal tags (1).
  - **Filterable fields:** `id`, `brand_id` (active brands only), `category_ids`, `tag_ids`, `sales_channel_ids`.
  - **Display only:** `handle`.
  - **Seed and consume:** Medusa's `graphSeed` and `graphConsume` read the products, then `withArabic` reads each batch again with `locale: "ar-EG"` and merges both into one document (`toSearchDocument` in `src/lib/product-search.ts`).
    - Unpublished products turn into deletes.
    - **Events:** `product.created`, `product.updated`, `product.deleted`.
- **`GET /store/product-search`** (`src/api/store/product-search/route.ts`): returns `{ ids, count }`, best match first.
  - **Validation:** zod `productSearchSchema`. `q` is 1–100 characters, `limit` 1–24, `offset` up to 10,000, and id lists up to 50 with the shop's id rules.
  - **Query:** `query.search` with `match_strategy: "last"` (prefix) and `typo_tolerance: true`.
  - **Why our own route:** Medusa's own `GET /store/products/search` passes no search options, so it can't do prefix or typo matching.
  - **Sales channels:** only the publishable key's sales channels are searched.
  - **Cache:** added to the store cache (60 s, anonymous only, cleared by Admin writes).
- **Arabic article:** a leading "ال" is removed from search words (`withoutArabicArticle`). Otherwise typo matching paired any two "ال" words: "الزنك" (zinc) matched a product whose goal word is "العضلات" (muscles), with a score of 0.33.
- **`src/jobs/reindex-product-search.ts`:** at 04:00 every night, `reindex({ index: "product", strategy: "swap" })`. It covers what emits no product event: category and brand renames, Arabic name edits, variant edits, and brand link changes.

### Storefront

- **`lib/medusa/services/search.ts` `searchProducts`:**
  1. calls the search route;
  2. reads the matched products through the existing `listProducts({ id })` for prices, translations, brand and mapping;
  3. keeps the backend's order.
  - With no ids, it makes no second call.
  - A 400 means invalid filters; any other failure means unavailable.
- **`ShopView`:** a search term goes through `searchProducts` with the same category scope, brand, goal tag and page. Browsing without a term is unchanged.
- **`GlobalSearch`:**
  - **Removed:** the on-mount `getProducts` (100 products), the browser scoring, the guessed goals, and the always-empty "best sellers" list.
  - **New:** from 2 characters and 250 ms after typing stops, ask for 6 results.
  - **Stale answers:** an answer only shows for the term it was asked for, so an older answer never replaces a newer term's.
  - **States:** loading, error and no-results, in EN and AR.
  - **Unchanged:** recent searches, popular terms and Enter → `/shop?q=`.
- **Cleanup:** the browser-only `getArabicProductSearchText` and its slug map are removed from `arabicLocalization.ts`. Nothing else used them.

### Docs

- `docs/CATALOG-CONTRACT.md`;
- workboard row and staging step 16 (`db:migrate` creates the index; it fills on start).

## Checks

- **Backend unit tests (`product-search.unit.spec.ts`):**
  - both languages, brand, categories, flavors and goal words in one document;
  - drafts, inactive brands and a copy-of-English Arabic name left out;
  - filter mapping and sales channels;
  - input validation;
  - the Arabic article.
- **HTTP test on a real database (`integration-tests/http/product-search.spec.ts`):**
  - **typos:** `protien` and `whye` → Whey Protein;
  - **prefix:** `prot` → both protein products;
  - **Arabic:** `الزنك` and `زنك` → only the zinc product;
  - **brand, flavor and goal words:** brand, flavor and goal words in both languages;
  - **filters:** brand, category and goal-tag filters;
  - **limit and count:** `limit` with the total `count`;
  - **hidden products:** draft and other-sales-channel products are hidden;
  - **validation:** 400 for empty or oversized requests;
  - **edits:** a rename shows up after its product event, and unpublishing removes the product.
  - **Counterfactual:** with `typo_tolerance: false`, the test fails at `protien`.
- **Storefront tests:**
  - `searchProducts`: order, total, no second call when empty, 400 vs outage;
  - the shop sends a text search through `searchProducts` with the filters, and browsing without a term does not.
- **`npm run check`:** 428 storefront and 240 backend tests, typecheck, lint 0.

## Please look closely at

- **`withArabic` in `src/search/product.ts`:** it wraps Medusa's `graphSeed` and `graphConsume` (their `transform` is synchronous in 2.21.0), and it turns unpublished rows into deletes.
- **Typo limits:** typo matching uses Medusa's fixed threshold (`word_similarity > 0.3`).
  - Three-letter words don't tolerate a typo (`wey` scores 0.29).
  - Longer ones do: `protien` 0.50, `magnesum` 0.67, `بروتيم` 0.71.
  - The engine language stays Medusa's default `english`. Arabic is matched without stemming, by prefix and typo matching.
- **The pop-up hooks in `GlobalSearch`:** the storefront has no DOM test setup, so they are checked in the browser, not in unit tests.
- **Test notes:**
  - The HTTP test is one scenario, because the test runner empties the database between tests while the Search module keeps its active index version in memory.
  - It clears the store cache while polling, because workflow calls skip the Admin middleware that clears it.

## Review

**Scope:** commit `cdb88e6` only, compared with its parent `a385bf4`. The surrounding merchandising work was not included.

**Verdict: No open problems.** The index keeps published products only, limits searches to the publishable key's sales channels, maps the requested brand/category/goal filters, and returns ranked ids with an exact count. The storefront then fetches product display data through the existing Medusa product service and restores the backend's match order, so this search endpoint does not become a second source for price or product details. Arabic enrichment, unpublished-product deletion, and the nightly reindex behaved as intended in the live HTTP test. Pop-up requests are debounced and stale responses are ignored by the active-request guard and term/language key.

Validation on `claude/product-search`:

- Backend `product-search.unit.spec.ts`: **5/5 passed**.
- Backend `integration-tests/http/product-search.spec.ts`: **1/1 passed** against the integration runner's isolated database. It exercised typo and prefix matches, Arabic, brand/category/tag filters, result count, unpublished and cross-channel visibility, invalid input, product updates, and unpublishing.
- Storefront `search.test.ts` and `shop-page.test.ts`: **36/36 passed**.

I did not repeat the browser-only pop-up interaction check; the hook has no DOM test coverage in this repository. That leaves a manual UX check for the normal browser acceptance pass, not a code finding from this commit review. Deployment should follow the workboard's step 16 so the search index is migrated and seeded before relying on the route.
