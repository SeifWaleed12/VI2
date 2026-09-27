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
    ├── Meilisearch
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

## Search

```text
Next.js
    ↓
Search API
    ↓
Meilisearch
    ↓
Product Index
```

Meilisearch is derived data, not the commerce source of truth.

Do not build advanced search before the core catalog/search path works.

## Architectural Changes

For a major architectural decision:
1. Explain the reason.
2. Document impact and tradeoffs.
3. Create/update an ADR.
4. Update this reference if the baseline architecture changes.
