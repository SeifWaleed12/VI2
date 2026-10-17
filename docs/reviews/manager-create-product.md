# Manager product creation fix: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/manager-create-product` from `full-stack` 707c1ab. Commit df6d909. Reported by Seif on 2026-10-17: a manager invited through the copy link got `403 This action requires an administrator` on `POST /admin/products` from the dashboard's Create product form.

## Cause

- `managerAction` (`apps/backend/src/lib/manager-access.ts`) refuses any write whose body contains an `inventory_items` key. Linking variants to inventory items is stock management, which is admin-only (task 9; Odoo owns stock).
- Medusa 2.21's dashboard create form (`@medusajs/dashboard`, `normalizeVariants`) sends `inventory_items: variant.inventory.map(...).filter(...)` for every variant. That is `[]` when nothing is linked.
- The empty list tripped the rule, so managers could not create products from the dashboard at all. The earlier HTTP test created a product without variants, so it never sent the key.

## Fix

Only an `inventory_items` value that is not an empty array counts as an inventory link. A list naming items is still refused for managers.

## Evidence

- **Unit:** `manager-access.unit.spec.ts`:
  - the dashboard-shaped create body (`variants[].inventory_items: []`) is a product create;
  - a create with a listed inventory item is refused.
  - 55 pass.
- **HTTP:** `admin-access.spec.ts` "lets a catalog manager create a product from the dashboard's create form":
  - the dashboard-shaped body gives 200;
  - a listed inventory item gives 403.
  - It fails with 403 on 707c1ab, and all 19 admin-access tests pass with the fix.
- **Full check:** `npm run check` passes with 200 backend and 225 storefront tests, typecheck, and lint 0 errors.

## Not verified

The dashboard form clicked through in a browser as a manager.

## For the reviewer

- **Scope:** review df6d909 only.
- **Where:** findings go under "Review".
