# RD-3 — Shop layout and native catalog filters

Author: GPT. Reviewer: Claude. Branch: `gpt/work`.
Baseline: approved `full-stack` `707c1ab`.
Status: implementation complete; awaiting Claude review and Seif's merge.

## Result

The shop requests one bounded Medusa page (24 products) with the actual matching
total. Category selection includes the selected category and its descendants.
Brand IDs and search combine with categories through the frozen RD-1 contract;
nothing filters or sorts the returned products in the browser.

The desktop layout aligns the category/brand sidebar with search and results.
The existing warm palette, shared type roles and product cards remain.
At 980px and below, an explicit Filters button opens a native modal sheet with
draft category/brand selections, Apply and Reset. The shared drawer focus hook
is retained, along with native background isolation, Escape, focus restoration,
body scroll locking and dismissal when the desktop breakpoint is crossed.

Removed unsupported shop health-goal, form, diet, allergen, availability, rating
and price-sort controls. Old URLs carrying these unsupported filters show an
invalid-filter explanation and a working all-products recovery, rather than
pretending the filter was applied.

## URLs and shared callers

- Canonical category URLs: `/[locale]/shop/<handle>`. IDs remain filter authority.
- Old category IDs/names and exact brand-name bookmarks resolve once to canonical
  handles/brand IDs with a permanent redirect. Unrelated/repeated parameters survive.
- Unknown handles return 404; directory failures offer retry rather than a false 404.
- Search, selected brands, page and removable chips come from the URL.
- Editing a filter resets pagination; clear-all preserves unrelated query parameters.
- Pagination uses the server count and points back to the results section.
- Header menu, mobile drawer, footer, product category links and Brands-page links
  now use readable category handles / stable brand IDs.
- All three removed categories URLs remain 404.

Shop interface text is keyed English/Arabic and server-rendered. The shop is
excluded from DOM text replacement. Shared ProductCard labels were localized
explicitly (including stock through the existing UI translator) so the shop does
not regress card language. Catalog names are protected from DOM rewriting.
No product/price/stock mapping or add-to-cart behavior changed.

## Verification

- All **262 storefront tests** pass across 30 suites.
- Storefront TypeScript passes.
- Storefront lint: **0 errors, 15 existing warnings**, no warnings in shop files.
- Production webpack build passes.
- Existing category-navigation tests were migrated to canonical routes while
  retaining their scope, invalid-category, directory-outage and retry coverage.
- New tests cover combined IDs/search/locale, page 6 (offset 120), invalid inputs,
  legacy redirects, unknown handles, directory failures, API failures, concurrent
  locales, empty/past-end pages, server counts and localized product-card controls.
- Live English/Arabic checks at requested widths 320, 390, 980, 981 and 1440;
  this browser rounds 981 to 982. No horizontal overflow; desktop sidebar/search
  top edges align. Inputs are 16px; filter labels are 14px using the shared fonts.
- Both English and Arabic sheets: opening, contained focus, reverse Tab, Escape
  and opener restoration verified after page load; desktop resize dismisses the sheet.
- Arabic mobile: category + brand draft selection applies the actual handle and
  brand ID; real empty result and removable chips verified.
- Actual language buttons preserve category, brand, search and repeated/shared URL
  parameters. Filter removal, clear-all, Back and refresh preserve the right state.
- Live direct HTTP checks: shop/category pages 200; old ID link 308 with retained
  locale/query; unknown handle and /categories, /en/categories, /ar/categories 404.
- Real backend outage exercised on the candidate server: visible outage/retry,
  retained destination and no false empty result. Restart + Retry restored results.
- Impeccable detector ran once: zero primary findings, three advisory notes against
  the older DESIGN.md snapshot. The final title uses RD-0 roles and the sheet uses
  the documented 24px corners. Project design-document drift was not rewritten.

## Runtime and limits

Candidate frontend: `http://localhost:3001/en/shop` / `http://localhost:3001/ar/shop`.
Candidate backend: port 9001 from the **same checkout**, unchanged source from
707c1ab, using localhost:5432 / vi2_dev. Port 9000 belongs to another active
backend; it was not used for RD-3 acceptance. Runtime URL/CORS overrides are
process-local; no environment files, backend source, dependencies or catalog data
were changed. Preview servers are left running for Seif's review.

The database currently has one published product, assigned to Sports Nutrition.
Thus live search/category/empty-result behavior was verified, while a populated
page beyond 100 is covered by the new storefront tests and RD-1's existing
database-backed catalog contract tests, not by a newly seeded live catalog.
Brands come from the real directory; unassigned brands truthfully produce no
matches. Product-brand assignment remains a separate catalog/admin task.

Signed-in/cart identity acceptance, physical devices, native zoom, additional
browser engines and real large-catalog acceptance remain RD-6/manual work.
GlobalSearch/Meilisearch, RD-5 policy/footer redesign, provider integrations and
add-to-cart failure handling on other entrypoints were not bundled into RD-3.
No merge, push, migration or catalog setup operation was performed.
