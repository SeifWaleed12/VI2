# Manager role review

Reviewed 2026-10-06. Scope: `git log 6e96ac6..claude/work` and `git diff 6e96ac6..claude/work`, exactly commit `eaf4145` (`feat(auth): give managers full shop access and hide admin-only pages`). Seif's updated decision in WORKBOARD replaces RD v1.1 section 2.2. Earlier RBAC and sign-in findings are outside this review.

## Findings

### [P1] Restrict direct reservation writes to administrators — apps/backend/src/lib/manager-role.ts:31

`reservations: full("reservation_item")` both admits POST/DELETE requests through the project guard and grants the native permissions for them. Medusa's standalone reservation API accepts an inventory item, location and quantity without an order (`line_item_id` is optional), then changes the inventory level's `reserved_quantity`. A manager can therefore reduce available stock manually, or delete existing reservations to release it, despite the decision that inventory is view only. In a real HTTP probe after `syncRegisteredPolicies`, a manager posted a reservation of 7 against stock of 10 with no order; the response was 200 and stored reserved quantity changed from 0 to 7. Make the standalone reservation area read only and remove its write grants; retain the authorized order workflows, which perform their own reservation operations internally. Add HTTP regression coverage for creating, updating and deleting standalone reservations, and verify that order fulfillment/edit/cancellation still work.

### [P2] Recognize read-only exports before rejecting POST — apps/backend/src/lib/manager-access.ts:46

The read-only-area check returns null for every non-GET request before the export exception on line 49 can run. Medusa 2.21 implements inventory export as `POST /admin/inventory-items/export`, requiring only `inventory_item:read`, so managers with inventory viewing access cannot export the same data. A real HTTP probe returned 403 instead of the native 202 export response. Apply the export-as-read rule before rejecting writes to read-only areas, preferably for the installed export endpoints explicitly, while continuing to reject stock writes and imports. Add coverage for inventory export as well as the existing product/order export mappings.

## Requested checks

- **Route boundaries:** Unlisted first segments are denied even when a native handler omits its own permission declaration, including API-key detail, staff, roles, workflows and search. Current nested order operations fall within Seif's full-order decision. Product inventory links and CSV imports are denied. The standalone reservation exception above is a concrete stock-writing escape. The table also admits future nested routes in listed areas automatically; changes to native routes should be reviewed when upgrading Medusa.
- **Existing variant stock settings:** The extractor covers direct variant URLs, nested product variants, product batch updates and variant batch updates by their IDs. The stored-value comparison rejects changed settings and permits unchanged booleans. Installed Medusa's direct variant update accepts a body ID and uses that ID in its module update; the extractor follows it too. No additional supported-payload bypass was established. New variants deliberately retain the submitted settings; WORKBOARD still records this as awaiting Seif's confirmation, so that assumption remains explicit rather than being silently approved here.
- **Layout response wrapping:** The path expression limits it to `/admin/layouts/:zone/configuration`, and only recognized zones for a manager receive the transform. The response method is bound correctly; defaults and personal configurations are copied rather than modifying stored data. Error responses and unrelated routes pass through. Native layout validation requires a boolean `is_default`; shared writes are denied, and native DELETE clears the actor's own configuration. Unit and HTTP checks confirm hidden settings entries and unchanged admin responses. Native permissions already hide Roles and Policies. No actionable defect found in this wrapper.
- **Registered permissions:** Installed payment/order middleware checks `refund:create`, `capture:create` and `credit_line:create`; the price-list batch handler checks `price:*`. Registering those keys makes the existing checks satisfiable and protects them from startup cleanup. Definitions do not assign permissions to every role; setup attaches grants to Catalog Manager. Startup sync can restore previously deleted matching policies, so a role already linked to one regains that intentionally assigned permission. No unrelated-role widening found.
- **Known dashboard limits:** Settings opening on Store, the empty Developer heading and visible buttons for refused actions are treated as the reported limitations, not new findings.

## WORKBOARD checklist

- **Requirement and scope:** Mostly met; the two findings remain open. No Phase-2 integration work or unrelated application refactor found. The sign-in test's changed forbidden-route assertion follows the newly allowed Orders access.
- **Medusa primitives:** Uses native RBAC policies, modules, layout configuration and order/catalog handlers. No replacement commerce subsystem or dependency added.
- **Layers:** Shared role/action rules live in the library; middleware applies authorization and presentation filtering. No storefront business-rule changes.
- **SOLID and clean code:** Shared table removes duplicated permission definitions. No unnecessary abstraction identified. Future nested route admission remains an upgrade-review concern.
- **Security:** Server-side checks retain current database role assignments and deny users without roles. Direct stock reservation writes violate the inventory boundary. No secrets or client-authoritative prices/payment success introduced.
- **Failure, timeout and idempotency:** No new external provider calls. Setup only adds missing role-policy links. No additional applicable failure/idempotency defect established.
- **Tests:** Four targeted unit suites passed: 69 tests. In an isolated snapshot of `eaf4145`, all 12 existing admin-access HTTP tests passed against temporary PostgreSQL, including startup policy synchronization. Two reviewer probes injected only in memory failed as described above: inventory export returned 403, and standalone reservation creation returned 200 and changed reserved stock. Repository source and test files were not edited.
- **Style:** Changed application files follow the repository's no-semicolon, double-quote, two-space and kebab-case conventions. `git diff --check 6e96ac6..claude/work` passed.

The author's WORKBOARD reports `npm run check` and a manager browser check passing. This review independently reran the targeted unit and HTTP checks; it did not rerun the entire workspace check or repeat a separate development-server/browser session. Native refund/capture and fulfillment operations were traced through their installed permission checks but were not exercised end to end with payment/fulfillment fixtures.

Must fix: block standalone reservation writes for managers and allow inventory exports as reads. Seif's confirmation of initial stock settings for new variants remains outstanding.

---

## Author response (Claude)

### [P1] Standalone reservation writes - fixed
- `apps/backend/src/lib/manager-role.ts`: `reservations` is now a view-only area (`reservation_item:read`), next to inventory, with the reason in a comment. Managers keep GET; POST, update and DELETE on `/admin/reservations` are refused, and the write permissions are no longer granted.
- `apps/backend/src/scripts/setup-catalog-manager.ts` now also removes role permissions the table no longer grants. Before this, an existing Catalog Manager role would have kept its reservation write links. Re-run on Seif's dev database.
- HTTP regression "stops a manager from reserving or releasing stock by hand, but lets them export it":
  - admin stocks 10 units and reserves 2;
  - the manager gets 403 on create (7, no order), update and delete;
  - the stored `reserved_quantity` stays 2.
- HTTP regression "removes permissions the role no longer grants when the setup runs again".
- Counterfactual: with the previous `manager-role.ts` and `manager-access.ts`, the reservation test fails (manager create returns 200).
- One correction to the review: the dashboard's order "Allocate items" step is not internal. It calls this same `POST /admin/reservations` with a `line_item_id`, so managers can no longer allocate stock to an order line; an admin must. This only matters for variants that track stock. Order cancel and edit release and adjust reservations inside their workflows, so they are unaffected. Reported to Seif; if managers should allocate, the follow-up is to allow only order-line allocations within the line's quantity.

### [P2] Exports in view-only areas - fixed
- `apps/backend/src/lib/manager-access.ts`: an area's own export endpoint (`POST /admin/<area>/export`) is now treated as a read before the view-only check, so inventory export works. Deeper paths ending in `export` are not treated as exports. Imports stay refused.
- The HTTP regression above asserts the manager's inventory export returns 202. Unit cases added for inventory, product and order exports, and for a deeper path that is not an export.

### Open items, unchanged
- Seif's confirmation on starting stock settings for new variants.
- Payment and fulfilment were not exercised end to end with fixtures (traced only), as you noted.

### Checks
- HTTP integration: 37 passed (14 admin access, 13 sign-in, 10 quick-variant).
- `npm run check`: 170 backend and 105 storefront tests pass; 0 type or lint errors (the 21 old storefront warnings are unchanged).
