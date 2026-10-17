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

## Claude review response — 2026-10-17

Review: a86729c, preserved verbatim in storefront-shop-filters-review.md.
S1–S5 are addressed in this follow-up. Claude's recheck and Seif's merge are pending.

- **S1:** Removed the hardcoded Health Goals mobile drill-in and its eight unsupported
  goal-filter links. The retained utility destination now opens the homepage Health
  Goals section in both locales. Its shopping CTA explicitly says All products and
  goes to the unfiltered shop. Rendered EN/AR navigation/homepage tests reject removed
  filter parameters. No unsupported goal-filter link remains in application source.
- **S2:** Desktop category and brand choices are ordinary links, with selected states
  and valid URL destinations. There are no desktop radios/checkboxes to navigate on
  arrow keys or disable mid-transition. Brand toggles keep focus on the activated
  link (real Enter tested); category links perform normal page navigation.
  Native radios/checkboxes remain inside the mobile draft/Apply sheet.
- **S3:** Both shop routes generate localized titles, canonical category/shop URLs
  without query variants, and noindex/follow for errors, search, brand-filtered and
  past-end states. Canonical origin uses the served request host/protocol rather
  than inventing a deployment domain. Invalid host metadata is safely omitted.
  React request cache shares the catalog result between metadata and the page;
  the key includes locale, handle and serialized query. No persistent cache or
  second product query is introduced.
- **S4:** Stable category-ID links keep 308. Name-based category/brand bookmarks use
  307 (including mixed links containing a legacy name), so renamed labels are not
  permanently cached as catalog identity.
- **S5:** Removed the empty panel's duplicate status role. The existing result-count
  status remains the live announcement.

Validation:
- 273 storefront tests across 30 suites pass; TypeScript passes.
- Lint: 0 errors, 15 existing warnings. Production webpack build passes.
- Impeccable detector on changed UI: no findings.
- Live desktop keyboard: Enter on a brand link updates the real filter and keeps
  focus on the same anchor; category expansion/navigation retains brand parameters.
- Live EN/AR mobile Health Goals destinations are valid homepage fragments, with
  no Health Goals drill button. The filter sheet retains 39 category radios and six
  brand checkboxes, initial focus, reverse-Tab containment, Escape and opener recovery.
- Live HTTP verifies localized titles/canonical/robots, 308 IDs vs 307 names with
  unrelated parameters kept, one empty-state live region, unknown-handle 404, and
  all three removed categories URLs still 404.
- No backend source, catalog data, environment file or dependency changed.
  Candidate remains frontend 3001 / same-checkout backend 9001.

**S6 remains RD-6:** real populated multi-page catalog acceptance, physical devices,
native zoom, other engines and signed-in states were not added to this review fix.
The existing real-outage/retry evidence from the initial task remains applicable;
outage/error outcomes also remain covered by the passing tests.

## Claude approved recheck and remaining-note response — 2026-10-17

Claude recheck 4862257 approves ff05125 and confirms S1-S5 fixed. The complete
review is preserved verbatim in storefront-shop-filters-review.md. This follow-up
addresses all three remaining notes; its final recheck and Seif's merge are pending.

- **R1:** Production metadata uses the server-side SITE_URL deployment origin.
  Host/X-Forwarded-Proto fallback is development-only. Missing or malformed
  configuration (including non-HTTP protocols, credentials, paths and queries)
  omits canonical metadata instead of trusting production headers. The storefront
  README documents deployment setup; no real domain was invented or env file changed.
- **R2:** Changing desktop category links targets #shop-results, a programmatically
  focusable results container. The installed Next.js 16.3.3 router intentionally
  scrolls without focusing, so a small handle-change effect focuses that fragment.
  Brand toggles retain link focus. Mobile draft/Apply behavior is unchanged.
- **R3:** Populated later pages now retain their page parameter in the canonical,
  while stripping tracking parameters. Search, brand, invalid and empty past-end
  states retain their existing noindex behavior and clean base canonical.

Validation: 283 storefront tests across 30 suites pass, TypeScript passes, lint
has 0 errors / 15 existing warnings, final production webpack build passes.
Impeccable detector on changed ShopClient reports no findings. Live EN/AR keyboard
category selection focuses shop-results; English brand selection keeps anchor
focus. Arabic 390px sheet still opens with close-button focus, and Escape restores
its trigger and body scrolling. A temporary production build on port 3002 with
SITE_URL=http://localhost:3002 answered Host: evil.example plus forwarded HTTPS
with HTTP 200 and canonical http://localhost:3002/en/shop. The temporary preview
was stopped; regular 3001/9001 previews remain untouched.

Production requires SITE_URL to be configured before release. Real populated
multi-page catalog acceptance, signed-in sessions, physical devices, native zoom
and other browser engines remain RD-6. No backend/catalog/dependency changes,
merge or push performed.
