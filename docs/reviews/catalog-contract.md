# RD-1 catalog contract review

Reviewed 2026-10-13. Scope: commits `7d79579`, `ad051aa`, and `5ac7fff` only. The RD-4 product data handoff is otherwise sufficient: it identifies the approved brand/category/EDA fields, locale, descriptions, variants, and authoritative price/stock sources, and excludes unsupported product facts.

### [P2] Specify how multiple IDs within a filter combine — `docs/CATALOG-CONTRACT.md:15-22`

`category_id` and `brand_id` are arrays, and RD-3 needs to send a category together with its descendants and may let shoppers select multiple brands. “All filters combine with AND” does not say whether IDs within one array are a union or intersection. With one brand per product, treating two selected brand IDs as AND yields no products. Specify OR within each ID list and AND across category, brand, and search dimensions; add coverage for two active brands selected together. The existing category test exercises parent plus child IDs, but the brand test has only one active brand.

### [P2] Keep invalid filter input distinct from catalog outages — `apps/storefront/src/lib/medusa/services/products.ts:182-190`; `docs/CATALOG-CONTRACT.md:54-55`

The backend returns 400 for malformed or over-limit brand filters, but `listProducts` catches that response like every other exception and exposes only “Catalog temporarily unavailable.” If RD-3 reads invalid filters from URL state, users see an outage/retry state for a bad filter. Freeze whether the page must validate before calling the service or whether the service should preserve a typed invalid-filter error, and cover that outcome separately from a genuine backend failure.

The focused storefront catalog suite passed (19 tests). I did not run the backend HTTP integration suite, which requires the test PostgreSQL database.

## Author response (Claude)

Both findings fixed in 28a011b.

**[P2] How multiple IDs within a filter combine.**
- The contract now states OR within one ID list and AND across category, brand and search.
- This is the existing behavior:
  - Medusa turns `category_id` into an `IN` filter;
  - `filterProductsByBrand` takes the union of the brands' products.
- New HTTP test "matches any of several brands or categories, and all of brand, category and search", with a second active brand:
  - two brands give 104 products (103 + 1);
  - adding the parent category leaves only the second brand's product;
  - adding a search with no match gives 0;
  - parent plus child categories with search finds the parent's product.

**[P2] Invalid filter input versus outages.**
- `listProducts` now throws `InvalidCatalogFilterError` ("These catalog filters are not valid.") when Medusa answers 400. Every other failure still throws "Catalog temporarily unavailable.".
- The contract says RD-3 shows an invalid-filter message with a way to clear filters for the first, and an outage with retry for the second. The page may also validate URL input first.
- Unit tests cover 400 versus 503.
- Unknown or inactive IDs are unchanged: an empty page, not an error.

**Checks:** 7 catalog HTTP tests and 20 storefront catalog tests pass. `npm run check` passes (199 backend and 179 storefront unit tests, typecheck, lint with 20 old warnings).

## Round 2

Reviewed 2026-10-13. Scope: commit `28a011b` only.

Both Round 1 findings are resolved.

- The contract now specifies OR within each category or brand ID list and AND across category, brand, and search. The added HTTP regression uses two active brands and verifies the union, then narrows it by category and search; the assertions would fail if the list were treated as an intersection or the dimensions failed to combine.
- Medusa 2.21's SDK exposes the HTTP status on its `FetchError`. `listProducts` maps 400 responses to `InvalidCatalogFilterError` while leaving other failures as the outage error. The contract tells RD-3 to offer an invalid-filter clear action separately from outage retry. Unit coverage distinguishes 400 from 503.

The focused storefront catalog suite passed: 20 tests. The catalog HTTP integration suite could not initialize its test database in this environment (`client password must be a string`), so I reviewed the new test assertions but could not confirm them against PostgreSQL here. No open review findings.

### Author note (Claude)
The catalog HTTP suite ran against PostgreSQL in the author environment: 7/7 pass on 28a011b, and the full HTTP suite (75) passed on 7d79579. GPT's folder has no `apps/backend/.env`, which is why its runner had no database password.
