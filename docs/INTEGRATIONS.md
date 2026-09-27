# Integration Reference

## General Contract

External integrations must be isolated, validated, timeout-aware, retry-safe, idempotent where applicable, safely logged, and independently testable.

Handle:
- Timeouts
- Network failures
- Invalid credentials
- Rate limits
- Invalid responses
- Partial failures
- Duplicate events
- Retries

Never use infinite retries.

Map provider failures into internal error categories and never expose raw provider errors to customers.

## Odoo

Intended primary role: inventory, with invoice/accounting only if explicitly required.

Potential responsibilities:
- SKU mapping
- Product mapping
- Stock availability/updates
- Out-of-stock handling
- Synchronization logging
- Retry/recovery

If Odoo becomes authoritative for inventory, define source, synchronization direction, conflict behavior, failure behavior, and recovery.

Do not invent ownership rules.

## Paymob

Credentials remain server-side.

Payment success is server-side authoritative.

Webhook/callback processing must verify authenticity where supported, validate payloads, be idempotent, handle duplicate/success/failure/cancellation/expiration events, and prevent duplicate payment/order effects.

A network timeout is not automatically payment failure.

COD is a separate payment flow.

## Bosta

Use a fulfillment-provider abstraction.

```text
Medusa Order
    ↓
Bosta Provider
    ↓
Shipment
    ↓
Tracking Number
    ↓
Medusa Fulfillment / Tracking
```

Do not hard-code undocumented statuses. Verify current provider documentation before implementing mappings.

Shipment creation must be idempotent where duplicate requests are possible.

## Meilisearch

Meilisearch is a derived search index.

It must tolerate retries, duplicate indexing events, temporary downtime, and reindexing.

Search failure must not corrupt commerce data.

## Storage

Keep private storage credentials server-side.

Separate public product media from private assets with appropriate access policies.

## Testing

Mock providers for business-logic tests.

Use integration/sandbox tests for provider contracts where available.

Cover success, failure, timeout, duplicate event, retry, invalid response, authentication failure, and partial failure.
