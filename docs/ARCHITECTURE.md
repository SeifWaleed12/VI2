# Architecture Reference

## System

```text
Cloudflare
    ↓
Hetzner / Coolify
    ├── Next.js Storefront
    ├── Medusa Server
    └── Medusa Worker

Medusa
    ├── PostgreSQL
    ├── Redis
    ├── Medusa Search (PostgreSQL, derived catalog)
    ├── Odoo
    ├── Paymob
    ├── Bosta
    └── S3/R2 Storage
```

The intended architecture is a modular monolith around Medusa, not a premature microservice system.

## Responsibility Boundaries

### Next.js
UI/UX, rendering, customer interaction, storefront state, and API consumption.

Must not own authoritative commerce rules, inventory authority, payment verification, supplier/warehouse logic, direct PostgreSQL/Odoo access, private Paymob/Bosta APIs, or authoritative order totals.

### Medusa
Use native capabilities for products, variants, categories, customers/authentication, carts, orders, pricing/promotions, inventory, payments, fulfillment, regions, sales channels, and API keys.

Custom functionality extends Medusa rather than replacing commerce primitives.

## Extension Strategy

Prefer:
- API routes
- Workflows
- Modules
- Module links
- Subscribers
- Scheduled/background jobs
- Payment providers
- Fulfillment providers

Never modify Medusa core or `node_modules`.

## Custom Boundaries

```text
Presentation
    ↓
Application / Workflow
    ↓
Domain rules
    ↑
Infrastructure
```

This is conceptual guidance, not a requirement to create a large Clean Architecture tree.

Use abstractions only when they provide real value.

## Provider Abstractions

```text
PaymentGateway
    └── PaymobAdapter

FulfillmentProvider
    └── BostaAdapter
```

External provider models must not leak into domain/application code.

## Performance

Consider query efficiency, N+1 queries, pagination, payload size, external call count, caching, background processing, indexes, and statelessness.

Avoid loading entire catalogs, unnecessary synchronous provider calls, process-only critical state, and premature distributed systems.

## PostgreSQL

Use migrations, intentional indexes, transactions, constraints, pagination, and selective queries.

Do not add another database or partitioning without a concrete requirement.

## Redis

Use for supported caching, jobs/workflows, temporary state, rate limiting, or coordination.

Every cache needs:
- Purpose
- TTL
- Invalidation strategy
- Source of truth
- Fallback behavior

Correctness must survive an empty/unavailable cache.

Redis in use (`apps/backend/src/lib/redis-config.ts`, on whenever `REDIS_URL` is set, off in tests):

| What | Purpose | TTL | Invalidation | Source of truth | If Redis is down |
|---|---|---|---|---|---|
| Sign-in attempt counts and locks | Rate limiting | 15 min | Cleared on successful sign-in | The count itself | Sign-in fails closed (existing behaviour) |
| Public store reads (`lib/store-cache.ts`): `/store/products` 60 s, `/store/product-categories` and `/store/collections` and `/store/brands` 5 min, `/store/regions` 10 min | Spare PostgreSQL on browse, search and menu requests | as listed | Every successful non-GET `/admin/*` request clears all `store-cache:*` keys; the TTL covers changes made outside the admin API | PostgreSQL | The cache read gives up after 250 ms and the request is answered from PostgreSQL (checked live: about 0.3 s instead of 0.02 s) |
| Event bus and workflow engine | Events and running workflows survive restarts and reach every server | none | none | Redis queue | Medusa cannot publish events |

Only anonymous GET requests are cached (no `Authorization` header or cookie). The key holds the URL, publishable key and locale. Carts, checkout, payments, orders and customer routes are never cached, and checkout re-validates price and stock itself.

## Search

```text
Next.js
    ↓
Medusa /store/catalog
    ↓
Medusa native Search module (PostgreSQL product projection)
    ↓
Native product hydration for visible prices and stock
```

The installed search implementation is Medusa native PostgreSQL Search. The projection is derived discovery data; native Medusa products/prices/inventory remain authoritative. Meilisearch is not deployed by this implementation.

Do not build advanced search before the core catalog/search path works.

## Architectural Changes

For a major architectural decision:
1. Explain the reason.
2. Document impact and tradeoffs.
3. Create/update an ADR.
4. Update this reference if the baseline architecture changes.


## Audit remediation operational boundaries (25 October 2026)

Production requires REDIS_URL. The optional cache connection has a 1,500 ms command deadline, 2,000 ms stalled-socket deadline, no offline queue and no replay of unfinished commands. Events/workflow/locking connections retain their native coordination policy; optional cache failure does not make shared correctness infrastructure optional.

Within each server, identical anonymous cold reads share a fill for up to 2 seconds, with at most 256 fill records. Waiting readers get an explicit 503/Retry-After if the fill does not complete. This is bounded optional coordination, not commerce authority or a cross-process lock. Cache URL keys sort query parameters; unknown query keys/oversized cache-key inputs are not admitted. Broad invalidation and cross-process in-flight-read staleness remain TTL-bounded; legitimate query cardinality and Redis memory/connection budgets require deployment sizing.

Catalog refresh signals merge per worker into bounded batches (over 1,000 retained IDs becomes one full reconciliation); every durable subscriber still awaits completion/failure. Routine reconciliation preserves a currently valid, price-version-matching projection while rebuilding. It never extends old validity after failure. Known broad mutations, expired state, changed price watermarks and failed mutation refreshes fail closed. Existing five-minute freshness and sale boundaries remain unchanged. No routine native swap indexes are created.

Loyalty is an append-only Medusa module ledger. A customer-scoped PostgreSQL transaction advisory lock fences balance decisions even when Redis ownership is lost. Transactional removal, duplicate detection and ledger writes share the same READ COMMITTED context; cancellation before/after a write rolls that transaction back. This does not establish distributed atomicity for other modules. Balances/activity are aggregated in the module persistence boundary; no mutable second balance exists. Expiry and cart cleanup have renewable job-wide native locks and cancellation checks. Failed event jobs retain at most 5,000 entries/7 days.

Staff editing policy set by Seif: the latest successful committed save wins for an ordinary field. Independent partial field updates survive concurrent saves. A last click need not be the last committed save. Native inventory/order workflows and the loyalty invariant remain mandatory; no blanket last-save policy replaces them.

Cache response reads still stop waiting after250ms. A500ms Redis delay must not trigger the native cache provider's read-error key deletion. Failed invalidation retries at most3 times with500/1000ms delays; callers share in-flight retry work per cache instance, and a new local write during a scan requests another bounded scan. After exhaustion TTL remains the fallback. Scheduled maintenance skips only acquisition-timeout contention before its callback starts; Redis outages and job-body errors still fail visibly.
