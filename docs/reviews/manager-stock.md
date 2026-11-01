# Manager stock and Cairo badge — review handoff

## Who asked and why

Seif, 2026-11-01. The client postponed Odoo. It will return, so it is parked, not cancelled. Until then nothing outside Medusa corrects stock, so managers must be able to edit it.

- Branch: `claude/manager-stock`
- Base: `full-stack` `81f03d4` (PR #30 merged)
- Commit: `3b3a2c0`

## What was wrong

- Managers could only view stock. `manager-role.ts` and `manager-access.ts` refused quantities, inventory items and variant links because "stock comes from Odoo".
- Rule 14 listed Odoo as a production checkout blocker.
- SF 4 was blocked on an Odoo contract.

## Seif's decisions

- Medusa holds stock until Odoo returns. `claude/odoo-orders` and `odoo` stay parked.
- Managers edit quantities and may delete inventory items, since they can already delete products.
- Reservations and stock locations do not change.
- Shared docs change with the code.
- Cairo wording shows on low stock only. "In Stock" and "Out of Stock" stay.

## The change

- `manager-role.ts`: `inventory-items` and `inventory_level` are now full access. Added `inventory_item:*` and `inventory_level:*`.
- `project-policies.ts`: defines those two `*` permissions. Medusa's bulk routes check them, and Medusa removes permissions no code defines.
- `manager-access.ts`: removed the inventory-route and inventory-link refusals and the unused `bodyHas`.
- `setup-catalog-manager.ts`: role description.
- Storefront: `getStockLabel`, the Arabic match in `arabicLocalization.ts`, and both `lowStock` strings in `ProductDetailClient.tsx`.
- Docs: `WORKBOARD` (decision row, blocked rows, SF 4, rule 14, this row), `DATA-OWNERSHIP`, `INTEGRATIONS`, `MVP-SCOPE`, `ARCHITECTURE`.

## Verification

- New tests failed on the old code first: 11 backend unit tests and 2 storefront tests.
- Backend unit: 48 suites, 415 tests passed.
- Storefront: 64 suites, 587 tests passed.
- Lint: backend and storefront clean.
- `integration-tests/http/admin-access.spec.ts` on a real database: 26 of 26 passed. The new test runs a manager through create item, create level, single edit, both bulk routes, link, relink, unlink and delete, and reads the stored quantity after each edit.
- `integration-tests/http/security-stock.spec.ts`: 4 of 4 passed.
- Badge at 375px: the longest English label wraps to two lines in the 165px card with no page overflow. This was measured by swapping the text in the browser, not with a real low-stock product.

## Not checked

- The dashboard was not clicked through as a manager. Routes were tested over HTTP.
- The Arabic card label and the product page label were not viewed live, only asserted or edited.
- `npm run check` was run in parts, and only the two integration specs above were run.
- Whether Medusa already defines the two `*` permissions was not settled. They are defined here regardless, and the bulk tests pass.

## Known limits

- **Type check is not clean, and not from this branch.** `npx tsc --noEmit` in `apps/backend` reports 5 "possibly null" errors, all from PR #30: `src/api/return-receipt-access.ts` (3) and `integration-tests/http/security-stock.spec.ts` (2). This branch touches neither file.
- **CSV import cannot load quantities.** Medusa lists `Variant Inventory Quantity` under "Fields no longer present in v2". The first stock count must be entered in the dashboard or by a separate script.
- **No change history.** Medusa does not record who changed a stock number.
- **Card height.** A low-stock card's badge is two lines on phones, so it is one line taller than its neighbours.
- **"Cairo Warehouse" is fixed text.** It assumes the single warehouse. A second warehouse would need the label reworked.

## After merge

Rerun `setup-catalog-manager` on each deployed database, or the role will not get the new permissions.

## Things to look at

1. Can a manager reach anything beyond stock through `inventory-items` now that it is full access? The `export` route still maps to read, and `inventory-items/imports` stays refused.
2. Deleting an inventory item that is linked to a variant or has reservations.
3. A quantity set below what is reserved. The storefront clamps available stock at 0.
4. `reservations` stays read-only with the single allocation exception. Confirm nothing here widened it.
