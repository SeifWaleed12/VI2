# Native catalog sorting proof — 2026-10-23

## Result
Native Medusa2.21.0 product Search index reuse is feasible. A separate custom catalog table/module is not required for the tested sorting capability. The production sorting feature is NOT delivered by this proof.

The current index is not sufficient unchanged: the probe reproduced stale availability after a reservation and stale prices/deal status after a sale-list change. Explicit native ingestion refreshed both. Production work must connect all relevant mutations and scheduled price boundaries to refresh/invalidation, preserve native region/channel/variant context, and handle failures before enabling price/stock sorting.

## Scope and reproducibility
Source baseline: owner-integrated local full-stack cbc3be8; proof author checkout854c3e4 includes product-page work. Installed Medusa2.21.0 and native Postgres Search provider, real query.graph/QueryContext/getVariantAvailability/query.search and native workflows/modules. No provider/pricing/inventory mocks, no direct SQL for commerce, no external email/payment calls. Resend settings empty; NODE_ENV=test.

The only database used for the probe was vi2-native-sort-proof-20261023 and its runner-owned template. Live catalog/database unchanged. Native managed index migrations happened only in that disposable database. The test runner cleaned up both databases; a separate read-only pg_database check confirmed neither remained.

Archived diagnostic source (NOT production code):
- probes/native-sort-proof/index.ts.txt — temporary extension of the existing src/search/product.ts definition, including native public EGP price/availability projection and sortable fields.
- probes/native-sort-proof/integration.spec.ts.txt — copy to apps/backend/integration-tests/http/catalog-sort-proof.spec.ts on cbc3be8 to reproduce. Save/restore src/search/product.ts around the probe, using the archived index file only in an isolated checkout. Configure DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD for a local disposable test database role, leave Resend settings empty, and run the installed integration Jest runner from apps/backend. Do not run this against production or start the modified app on the live development database.
- The definition requests variants.calculated_price.* explicitly and converts native amounts to numbers. Early diagnostic runs failed because requesting the relation alone returned no price fields; assertions were retained and the projection corrected.

Command after preparing that isolated checkout:
    node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --runTestsByPath integration-tests/http/catalog-sort-proof.spec.ts

## Proven by the passing real-database test
- 113 published products visible in the selected sales channel; draft and other-channel fixtures excluded.
- Global EGP low/high price ordering before24-item pages, exact113 count, unique IDs across all pages, stable ID tie breaker and unpriced product last.
- 107 genuine public one-unit deals; the page starting at96 returns11 results with exact107 count.
- Category filter returns54 products.
- Quantity-only and customer-group prices do not leak into public one-unit amounts. A lower override price is not called a sale deal.
- Indexed native price equals /store/products calculated price; native channel inventory matches the one-unit stock fixture.
- Native reservation changes actual availability from1 to0. Existing product-only event registration leaves the old indexed1 until explicit native product ingestion updates it to0.
- Backorder remains purchasable at zero stock; unpriced fixtures are not purchasable.
- Deactivating the public sale changes /store/products from100 to500 while the index retains100. Explicit ingestion changes the index to500 and clears deal eligibility.
- Database-side in-stock-first ordering changes after refreshed native availability.

Final run: 1 integration scenario passed,67.38s including database setup/migrations; assertions themselves19.7s. These are fixture execution times, not production response-time or large-catalog benchmarks. Redis outage, scheduled future boundaries, multiple public contexts, stale-writer races, sustained load and full storefront sorting UI remain implementation/acceptance work.

## Product-page PR boundary
GitHub origin/full-stack157fe26 lacks local merchandising, mobile submenu and product-search integration. The product-only publication branch starts at that GitHub commit and transplants only the reviewed product-page changes. Product JSX/CSS/variant helper are byte-identical to the approved author code ae35094; the catalog test conflict retained GitHub's tests and added only the new missing-price case. Those unrelated local features and this diagnostic backend prototype are excluded from the application diff.

The PR includes this evidence as documentation. Backend sorting, new endpoints, cache changes, production search-index migrations and the sort UI are not claimed as shipped.
