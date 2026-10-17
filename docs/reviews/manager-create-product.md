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

## Review

Reviewer: GPT. Date: 2026-10-17. Scope: `df6d909` only, against parent `707c1ab`.

No actionable findings. The dashboard's empty `variants[].inventory_items` arrays now pass the manager guard. Non-empty arrays, malformed values, and direct inventory-link routes remain refused. The recursive check still covers nested and batch bodies. Existing stock-setting comparisons are unchanged.

The exception also applies outside product creation, so the review checked the installed Medusa 2.21 update validators: `UpdateProductVariant` is strict and does not accept `inventory_items`. Sending an empty list therefore does not provide a way to unlink stock from an existing variant through these update routes.

Validation:

- Ran `npm run test:unit -- --runTestsByPath src/lib/__tests__/manager-access.unit.spec.ts` in the existing fix checkout: **55/55 passed**. The reviewed source and test files match `df6d909`.
- Inspected the new HTTP regression: the dashboard-shaped create must return 200, while the non-empty inventory list must return 403. The parent guard rejects the empty array, so the positive assertion detects the original defect.
- Did not rerun the PostgreSQL HTTP suite or click through the dashboard as a manager. The handoff's 19-test HTTP result remains author-reported.

No open code problems.
