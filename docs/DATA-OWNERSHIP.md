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
| Inventory | Odoo if explicitly confirmed as source of truth |
| Warehouse | Must be confirmed |
| Supplier | Must be confirmed |
| Invoice/accounting | Odoo if explicitly required |
| Search index | Meilisearch as derived data |

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
Meilisearch
  ↓
Search queries
```

Meilisearch is derived data.

Changing ownership is an architectural change and requires an ADR.
