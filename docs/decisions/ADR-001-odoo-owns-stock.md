# ADR-001 — Odoo owns website stock

## Status
Accepted (Seif, 2026-10-28).

## Context
RD v1.1 sections 2.3 and 2.4-C make Odoo the source of website stock ("Odoo
Live Stock Badge"; "Odoo to Website: Inventory Balance, SKU, Warehouse
Quantities, Safety Stock"). Seif decided on 2026-10-06 that stock quantities
come from Odoo and are never edited in Medusa, and on 2026-10-28 that Odoo
also sells through other channels, that one store-wide safety stock is held
back, and that stock must follow Odoo within one minute.
`docs/DATA-OWNERSHIP.md` lists inventory as "Odoo if explicitly confirmed" and
says changing ownership needs an ADR.

## Decision
Odoo is the source of truth for stock. Medusa keeps a derived copy at its one
stock location (Cairo Warehouse), so carts, checkout reservations and the
storefront keep using Medusa's native inventory.

- Direction: Odoo to Medusa only. Medusa never writes stock to Odoo.
- Trigger and frequency: the `sync-odoo-stock` job, every minute, reads the
  whole warehouse (no cursor) and writes only levels that changed.
- Rule: Medusa stocked quantity = Odoo on-hand − all open outgoing Odoo demand
  + per website order the overlap of its Medusa reservation and the units
  Odoo already counts for it − safety stock, whole units, at least 0
  (`docs/ODOO-INTEGRATION-PLAN.md` 2.3).
- Matching: Medusa inventory item SKU = Odoo product Internal Reference.
- Conflicts: Odoo wins. A Medusa level changed by hand, or lowered by Medusa
  on fulfilment, is overwritten on the next run.
- Failure: Odoo unreachable or refusing leaves Medusa's stock as it is and
  logs the failure; the next run retries. No partial writes.
- Fail closed: a level whose item has no SKU, or whose SKU has no stock or
  moves in the Odoo warehouse, is set to 0.
- Recovery: none needed beyond the next run, because every run reads the full
  state. Website orders whose Odoo delivery stays open for 2 days without a
  Medusa reservation are logged hourly for staff.

## Alternatives Considered
- Medusa owns stock and pushes sales to Odoo: two sources of truth, since
  Odoo also sells through other channels (D4b).
- Odoo webhook per stock change: needs a public endpoint, and Odoo's webhooks
  are unsigned; polling meets the one-minute target (D10).
- Odoo's free quantity (on-hand − all reservations) copied as-is: website
  orders would be subtracted twice, once in Odoo and once by Medusa's
  reservation.
- Live Odoo check at checkout: adds Odoo to the checkout's critical path;
  Medusa's reservations plus the one-minute poll cover it.

## Consequences

### Positive
- One source of truth; staff manage stock only in Odoo.
- Checkout keeps Medusa's native reservations and never waits on Odoo.
- Self-healing: an outage only delays updates.

### Negative / Tradeoffs
- Website stock can lag Odoo by up to a minute.
- An order fulfilled in Medusa in the milliseconds between the job's last
  read and its write can be counted as available for up to a minute
  (shortcut noted in the job).
- Production cannot start without Odoo settings and the warehouse id.

## Scope / Impact
`apps/backend`: `src/jobs/sync-odoo-stock.ts`, `src/lib/odoo-stock.ts`,
`src/modules/odoo`, `src/lib/odoo-config.ts`. Admin users must not edit
stock levels in Medusa (already blocked for managers in
`src/lib/manager-role.ts`); an admin's edit is overwritten within a minute.

## Follow-up
- `docs/DATA-OWNERSHIP.md` Inventory row updated to Odoo (ADR-001).
- O-0: set `ODOO_WAREHOUSE_ID` and `ODOO_SAFETY_STOCK`; run the job against a
  test Odoo and compare a few SKUs by hand.
- Revisit if the website sells from more than one warehouse.
