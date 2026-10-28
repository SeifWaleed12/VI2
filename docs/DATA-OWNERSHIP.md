# Data Ownership Reference

## Principle

Every important data object has one authoritative owner.

If ownership is uncertain:
**do not guess and do not implement synchronization.**

Derived caches/indexes must not silently become authorities.

## Baseline

| Data | Intended Owner |
|---|---|
| Product | Medusa unless a confirmed external ownership rule exists |
| Variant | Medusa |
| Price | Medusa unless a confirmed external ownership rule exists |
| Customer | Medusa |
| Cart | Medusa |
| Order | Medusa |
| Payment state | Medusa + verified Paymob state |
| Fulfillment | Medusa + Bosta integration |
| Inventory | Odoo; Medusa holds a copy synced every minute (ADR-001) |
| Warehouse | Must be confirmed |
| Supplier | Must be confirmed |
| Invoice/accounting | Odoo if explicitly required |
| Search index | Medusa native PostgreSQL Search as derived data |

## Synchronization Contract

Before synchronization, define:
- Source
- Destination
- Direction
- Trigger
- Frequency
- Conflict policy
- Idempotency
- Retry behavior
- Failure behavior
- Recovery/reconciliation

## Inventory Example

If Odoo is authoritative:

```text
Odoo
  ↓
Inventory synchronization
  ↓
Medusa inventory representation
  ↓
Storefront
```

The storefront cannot override authoritative inventory.

## Search Example

```text
Medusa
  ↓
Indexing
  ↓
Medusa native PostgreSQL Search
  ↓
Search queries
```

The search projection is derived data. See CATALOG-CONTRACT.md for ingestion, expiry, visibility and recovery; it is never price, inventory or order authority.

Changing ownership is an architectural change and requires an ADR.


## Audit remediation additions (25 October 2026)

The existing product projection also records whether a native variant has at least two inventory-item links (`bundle`). Source: Medusa variant/inventory module links. Destination: the existing native product search index. Direction: source to projection only. Triggers: the existing product/inventory/link refresh subscriber and minute reconciliation; schema migration/native seeding is required before rollout. Writes are idempotent document upserts under the native seed/refresh lock. Failed/expired projections produce an explicit unavailable result, with durable retries and reconciliation providing recovery. Bundle reads are capped at the existing 100-product contract; no extra catalog table or browser classification is introduced. Native hydration still enforces storefront visibility and commerce values.

Default brand-filtered storefront browsing uses the existing bounded catalog projection. The legacy native brand adapter reads at most 1,001 linked IDs and rejects more than 1,000 with an explicit request to use /store/catalog, instead of building an unbounded IN list or returning an incomplete count. Its existing small-brand API behavior remains covered by HTTP tests.

Loyalty balance and expiry activity are SQL aggregates over the existing module ledger, never a second stored balance. The module's customer transaction protects read/cap/write and zero-point event markers. Order/payment refund snapshots are fetched before opening that transaction; an unseen refund ledger marker aborts earning so the durable delivery event retries against fresh order data.
