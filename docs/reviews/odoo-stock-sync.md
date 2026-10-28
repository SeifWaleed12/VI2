# O-2: website stock from Odoo

Claude, 2026-10-28. Handoff for GPT review. No merge: Seif merges, and only after the live check (O-0).

## Who asked and why

Seif released the Odoo integration on 2026-10-28 (RD v1.1 sections 2.3 and 2.4-C: Odoo live stock on the website). The plan is `docs/ODOO-INTEGRATION-PLAN.md`, approved by GPT (162f06a). O-1 (the Odoo module, settings and check script) is approved (375ed58). This is O-2: website stock follows the Odoo warehouse within a minute.

## What to review

- Branch `odoo`, from `full-stack` `d039f3d`.
- Review `d33cae1` (the code) and `a36af1a` (ADR-001 and the ownership doc). Diff: `b1adf1e..a36af1a`.
- Earlier commits on the branch (plan, O-1) are already approved.

## What was missing

Medusa's stock was set by hand. Odoo is the real stock record and also sells through other channels, so the website could sell units Odoo no longer had, or hide units it had.

## Seif's decisions

- 2026-10-06: stock quantities come from Odoo and are never edited in Medusa.
- 2026-10-28 (plan D4b, D9, D10): Odoo also sells elsewhere; one store-wide safety stock is held back; stock follows Odoo within one minute; polling, no webhooks.
- 2026-10-28: ADR-001 accepted (Odoo owns website stock; Medusa keeps a derived copy).
- Open, Seif's (O-0): Odoo version (JSON-RPC is provisional; it moves to JSON-2 before merge if Odoo is 19+), the warehouse id, the safety number, credentials.

## The change

- `apps/backend/src/lib/odoo-stock.ts` (no I/O):
  - `websiteStock`: per SKU, on-hand − all open outgoing demand + per (website order, SKU) min(Medusa reservation, Odoo's not-cancelled move quantity for that order) − safety stock; whole units, at least 0.
  - `heldThroughout`: reservations read before and after the Odoo read, kept at the smaller, so one released meanwhile is not added back.
  - `levelChanges`: updates only changed levels; a level with no SKU, or a SKU absent from Odoo's data, goes to 0 and is reported; missing levels are created only for SKUs Odoo has.
  - `staleWebsiteDeliveries`: open Odoo moves older than 2 days whose order holds no Medusa reservation.
- `apps/backend/src/modules/odoo/service.ts`: `readWarehouseStock(warehouseId, websiteOrderIds)`. Reads the warehouse view location; `stock.move` from `child_of` the view with destination usage not internal, state open, or done for the given website orders (`sale_line_id.order_id.client_order_ref`); then `stock.quant` in internal locations under the view; then `sale.order` by name (`move.origin`) for `client_order_ref`; then `product.product` SKUs with `active_test: false`. Moves are read before quants on purpose (comment explains). Bad shapes map to `invalid_response`.
- `apps/backend/src/jobs/sync-odoo-stock.ts`: every minute under the job lock (same pattern as `remove-abandoned-carts`). Skips when Odoo or `ODOO_WAREHOUSE_ID` is not set. Finds Cairo Warehouse, maps inventory items to SKUs, reads order reservations (line to order via `query.graph`, as in `allocate-order-line-stock`) before and after Odoo, writes creates and updates in one `batchInventoryItemLevelsWorkflow` call. An `OdooError` is logged and stock left as it is; other errors throw. Stale deliveries logged once an hour, filtered to real Medusa orders.
- `apps/backend/src/lib/odoo-config.ts`: `ODOO_WAREHOUSE_ID` (whole number ≥ 1, required in production), `ODOO_SAFETY_STOCK` (whole number ≥ 0, default 0). Production refuses to start without the four connection settings (plan 2.1: from O-2 on).
- `apps/backend/.env.template`; `docs/WORKBOARD.md` (O-2 row, deploy checklist row 14a).
- `docs/decisions/ADR-001-odoo-owns-stock.md`, `docs/DATA-OWNERSHIP.md` Inventory row.

## Verification

- `npm run check` equivalent for the backend at d33cae1: 375 unit tests passed (44 suites, 20 new), typecheck and lint clean. a36af1a and this handoff change docs only.
- New tests: `src/lib/__tests__/odoo-stock.unit.spec.ts` (one case per row of the plan's 2.3 stage table, each asserting availability H−o−s−w; overlap cap, separate orders and SKUs, floor and zero, `heldThroughout`, `levelChanges`, stale), `readWarehouseStock` service tests (domains and mapping, missing warehouse, move without product), config tests (production rules, whole-number settings), the job-contention test now covers this job.
- Failing-first: not applicable. Every test covers new code with no earlier version to run against.
- Live, in the running backend on the dev database via `medusa exec` of `syncOdooStock`: no `ODOO_WAREHOUSE_ID` warns and skips; `ODOO_*` pointing at a closed local port with `ODOO_WAREHOUSE_ID=1` reads the Medusa location, inventory and reservations, logs "Odoo stock sync failed (unreachable); website stock unchanged" and writes nothing; no Odoo settings does nothing.

Not checked:
- Any real or fake Odoo. A fake Odoo would rewrite dev stock, and credentials wait on O-0.
- The `query.graph` line-to-order lookup against real order reservations: I did not confirm the dev database has any at Cairo Warehouse.
- The storefront (no change there).

## Known limits

- An order fulfilled in Medusa between the job's last reservation read and its write can show its units as available for up to a minute (`shortcut:` in the job, listed in ADR-001).
- Website stock lags Odoo by up to a minute.
- JSON-RPC is deprecated in Odoo 19 and removed in 22; the client moves to JSON-2 if O-0 says 19+.

## Things to look at

1. Do the Odoo domains match the plan: multi-step delivery (pick/pack/out counted once), returns not counted as demand, done moves only for the given website orders, archived products?
2. Is mapping moves to orders through `move.origin` = `sale.order.name` safe? Can a B2B order's `client_order_ref` be mistaken for a website order? (The stale log filters by real Medusa order ids; the stock rule only matches refs with Medusa reservations.)
3. The read order (moves, quants, then Medusa reservations again) and the remaining write race.
4. Fail-closed zeroing, and that unchanged levels are never written.
5. Production refusing to start without Odoo.
6. Does ADR-001 match what the code does?
