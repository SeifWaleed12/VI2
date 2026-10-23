# Proposed native catalog ranking read model
Status: proposed, requires owner approval under approved plan CS-1 before persistence/index implementation. Scope requested: global EGP price/availability ordering, correct deal counts and24-item pagination. Existing Medusa2.21.0 API cannot sort its computed price/stock fields.

## Why
Native prices depend on rule/quantity/region/sale context; inventory depends on locations/reservations. Copying those business rules into custom SQL would compete with Medusa. Scanning every product for every uncached page would undermine the approved performance goal. A derived, indexed read model lets native Medusa compute values, then PostgreSQL order/filter/page efficiently. Redis accelerates repeated public answers; it does not own the ranking source.

## Boundary
One small custom Medusa module in existing PostgreSQL, with a migration; no new database/service/search dependency or Medusa core changes. No Admin editor for derived values. No changes to Medusa's prices, inventory, products, orders or permissions. GPT implements, Claude reviews.

## Derived record
One record for each visible product in the supported public EGP region/sales-channel context:
- unique product_id + region_id + sales_channel_id (or equivalent composite context key)
- display_variant_id, native one-unit display amount and comparison amount (nullable)
- native availability/purchasability and whether inventory is known
- genuine deal eligibility and deal variant/amount where different from the regular card
- source/context version, computed_at and next price-list boundary
- minimal searchable/filterable membership data needed to support categories, brands and health goals, or native joins where supported; no customer data
Indexed context + price + product_id, context + availability + product_id, and context + deal/order keys. Native product visibility, locale text and rendered page data remain sourced from Medusa. The same card representation must be hydrated so displayed and sorted values agree.

## Synchronization
Medusa is authoritative; direction is native Medusa -> read model -> public result cache only. No reverse writes.
- Initial bounded backfill through native queries/pricing/inventory, no full catalog loaded into Node memory.
- Refresh affected entries after product/variant, price/price-list, translation, brand/category/tag, sales-channel/region, inventory and reservation changes, including order-driven changes.
- Native events/workflows/subscribers with durable retries; idempotent upsert/removal by context/product/source generation. Concurrent stale refresh must not overwrite a newer generation.
- Scheduled price starts/ends trigger refresh/invalidation at their boundary. Cache expiry cannot cross a known upcoming boundary.
- Reconciliation repairs missed events in bounded batches; maintain explicit unhealthy/dirty state and observable recovery instead of silently treating failed refresh as fresh.

## Requests/caching/failure
- Default/newest can continue through native product ordering.
- Price/in-stock sorts filter and order the complete supported result set in the database, then return24 results plus correct count; stable product-ID tie breaker.
- Public listing only; no customer-group/personal price data shared. Personalized sorts must bypass the public read model or be explicitly unsupported until their context contract exists.
- Redis page entries separated by normalized filters/sort/page, locale, region/currency, sales-channel/public-key context and current generation; maximum30s expiry, earlier at sale boundaries.
- Product/price/stock changes invalidate dependent results. Cart/checkout always validate with native Medusa.
- Redis failure falls back to the database/native query, with bounded timeout.
- An unavailable/unhealthy ranking source must return an explicit recoverable error for affected sorts; never silently serve the wrong order. Native default/newest remain usable. Dirty entries are refreshed/hidden according to the tested consistency contract before calling the read model ready.

## Acceptance before release
Prove global >24 and >100-deal results; native price equivalence for sale/override/rules/quantity1 and mixed variants; native inventory/backorder/reservation equivalence; channel/visibility/locale boundaries; deletion and scheduled activation; retries/reconciliation/stale-writer protection; Redis outage; cold/warm and deeper-page benchmarks. No real email/payment/provider calls. No live migration/backfill until local isolated migration tests pass and owner-authorized environment is identified.

## Explicit decision
Approve this derived read-model architecture, or keep schema unchanged and revisit the performance/sorting implementation approach before shipping calculated sorts. Independent approved product-page fixes can proceed while this decision is pending.
