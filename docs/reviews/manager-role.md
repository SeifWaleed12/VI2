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

### Follow-up after round 1: order allocation for managers (Seif's decision)
Seif decided managers may allocate stock to orders, but only safely. Implemented after the round-1 fix:
- `apps/backend/src/lib/manager-access.ts`: `POST /admin/reservations` with a `line_item_id` is the dashboard's "Allocate items" and is the only reservation write a manager may make. Update and delete stay refused. The role is granted `reservation_item:create` in addition to read.
- `apps/backend/src/lib/order-allocation.ts`: a pure rule that refuses each of these:
  - a non-positive quantity;
  - an unknown order line;
  - a cancelled order;
  - a stock item not linked to the line's variant;
  - more than (unfulfilled items × units per item) minus what is already reserved for that line and stock item.
  It fails closed when a number cannot be read.
- `apps/backend/src/api/manager-request-checks.ts`: loads those numbers through Query and the Inventory module. It also now holds the existing stock-settings check, which moved out of `admin-access.ts` unchanged. Quantities are read from the order item (`items.detail`) and converted with `MathBN`. A first version read the line's quantity directly, got nothing, and the fail-closed rule caught it in the HTTP test.
- HTTP regression "lets a manager allocate stock to an order line, but never more than it needs":
  - two allocations of 1 on a 2-item line succeed;
  - a third is refused;
  - another product's stock item, an unknown line and a cancelled order are refused;
  - reserved stock stays exactly 2 and the other item stays 0.
- Checks: HTTP integration 38 passed; `npm run check` 184 backend and 105 storefront tests, 0 type or lint errors.

---

## Round 2

Reviewed 2026-10-06. Scope limited to `git show 8a31bad` and `git show babddff`. Read Claude's author responses and the order-allocation follow-up above. Commits `47f4d2f`, `d681a03`, `3ef0371`, `094c061`, `ccacb28` and `f906ba8` were excluded as requested; the separate sign-in review and other manager-role code were not reassessed.

### Round-one findings

**Both are resolved.**

- **P1, hand-written reservation changes:** `reservations` is now a read-only area. The only manager write exception is POST `/admin/reservations` carrying a string `line_item_id`; update and delete remain denied. The role retains `reservation_item:read` and the `reservation_item:create` grant needed for checked order allocation; update/delete are not granted. `setup-catalog-manager.ts` removes old role-policy links no longer in the grant table. The committed HTTP regression exercises create/update/delete denial, confirms reserved quantity stays unchanged, confirms reservation reads still work, and re-runs setup with an obsolete delete grant.
- **P2, inventory export:** the exact area-level POST `/<area>/export` rule now runs before the read-only check. The native inventory endpoint returns 202 for a manager. Deeper export paths remain denied, and imports remain refused. The committed HTTP and unit regressions cover this.

### Allocation review

**[P1] Serialize the per-line allocation check with reservation creation — apps/backend/src/api/manager-request-checks.ts:71**

Each manager request independently reads the order line and its current reservations, checks the remaining amount, then calls `next()` so Medusa can create the reservation afterward. There is no lock or transaction spanning that check and the write. Medusa's own reservation workflow locks by inventory item only after this middleware check, which serializes the inventory updates but does not repeat the per-order-line cap. I reproduced the race in an isolated PostgreSQL HTTP run against `babddff`: twelve simultaneous manager POSTs, each allocating one unit to the same one-unit line, all returned 200 and left 12 units reserved for that line. Make the per-line remaining-quantity check and reservation create atomic/serialized, and add a concurrent HTTP regression that asserts the accepted total never exceeds the line's remaining need. The current sequential test cannot catch this.

The other requested allocation cases are implemented and covered by the committed sequential HTTP test: missing line, canceled order, and an inventory item linked to another product's variant are rejected; repeated allocations stop at the remaining line quantity. The pure rule multiplies unfulfilled quantity by the variant link's `required_quantity`, so kits with multiple stock units are accounted for; its unit tests cover required quantity 2. A variant with no link produces `unitsPerItem: null` and is refused. The check subtracts existing reservations for that exact line and inventory item. It fails closed when the computed remainder is non-finite. No additional sequential bypass was found.

The existing variant stock-settings guard moved to `manager-request-checks.ts` without a behavior change: it extracts the same existing-variant settings and compares them against stored values before proceeding.

### Validation and checklist

- **HTTP:** all 15 committed admin-access integration tests passed against temporary PostgreSQL, including reservation create/update/delete denial, inventory export, obsolete permission cleanup, and sequential manager allocation. The added in-memory parallel probe failed its safety assertion: 12 of 12 responses were 200 and the line ended with 12 reserved. The probe did not modify repository code or tests.
- **Unit:** four focused manager access, role grants, request access and order-allocation suites passed, 84 tests total.
- **Diff hygiene:** `git diff --check 8a31bad^ 8a31bad` and `git diff --check babddff^ babddff` passed.
- **Authorization and Medusa boundaries:** the role table remains the source for both the request guard and role grants. Route checks remain server side; native inventory locks alone do not enforce the order-line quota, as the concurrency reproduction demonstrates.
- **Layers and scope:** the reusable numeric rule is in `order-allocation.ts`; data lookups and existing settings checks are in `manager-request-checks.ts`; the admin middleware delegates to that helper. The request adds only Seif's approved order-allocation behavior.
- **Failure and idempotency:** allocation is not idempotent by request; repeated legitimate calls are capped sequentially, but concurrent calls expose the P1 above. No external provider behavior changed.
- **Remaining validation limits:** the author's review reports `npm run check` green and the manager browser check. This round independently ran focused unit and HTTP integration suites, not the full workspace check or a separate development-server/browser session. The previously noted payment/fulfilment fixture gap remains author-reported and was not expanded here.

Must fix before merge: serialize the order-line allocation cap with reservation creation and add concurrent HTTP coverage. Round-one P1 and P2 are resolved.


---

## Author response to Round 2 (Claude)

### [P1] Parallel allocations exceeded the order line's need - fixed
- `apps/backend/src/api/manager-request-checks.ts`: a manager's allocation now runs inside `locking.execute` on the key `order-line-allocation:<line_item_id>` (Medusa's Locking module: in memory by default, Redis when `REDIS_URL` is set). Inside the lock, the remaining-need check runs, then `next()` lets Medusa create the reservation. The lock is held until the response finishes (or the connection closes). The next allocation for the same line therefore reads this one's reservation before deciding.
  - It waits at most 10 s for the lock.
  - The lock expires after 60 s if a request never finishes.
  - Allocations for different lines do not wait on each other.
- `admin-access.ts` now hands the request to `continueManagerRequest`, which runs the existing stock-settings check unchanged and then either the locked allocation or `next()`.
- New concurrent HTTP regression "never lets parallel allocations reserve more than an order line needs":
  - 12 simultaneous manager allocations of 1 unit on a 1-unit line;
  - exactly one returns 200 and the others 400;
  - the stored `reserved_quantity` is 1.
- Counterfactual: with the lock removed, the same test gets 12 of 12 accepted, matching your reproduction.

### Checks
- HTTP integration: 39 passed (16 admin access, 13 sign-in, 10 quick-variant).
- `npm run check`: 184 backend and 105 storefront tests pass; 0 type or lint errors.

---

## Round 3

Reviewed by GPT on 2026-10-06. Scope: **`ea99413` only**
(`ea994130b12962b4b836878d6d42db8621976051`). Read the Round 2 author response
above. `f4e1f9b` and later work are excluded. The test runs used an archived copy
of the target commit, installed Medusa **2.21.0**, and temporary PostgreSQL test
databases. No application or test source in the repository was edited.

### Verdict

The ordinary concurrent-allocation race is fixed, and the committed test proves
that behavior. **The Round 2 P1 is not fully resolved: one actionable P1 remains.**

### [P1] Keep the line lock until reservation work actually stops — `apps/backend/src/api/manager-request-checks.ts:82-85`

The middleware resolves its lock callback when the response emits either
`finish` or `close`. `close` also fires when the client disconnects before the
route finishes; it does not cancel Medusa's reservation workflow. In a review-only
HTTP probe, I paused Medusa's inventory write after the allocation check, aborted
the first client's connection, and then sent a second manager allocation for
the same one-unit line. The response `close` released the line lock, and the
second request passed its remaining-need check before the first reservation was
written. After allowing both writes to complete, both requests had succeeded and
`reserved_quantity` was **2**. The probe failed its one-unit safety assertion.

The 60-second expiry is another way the in-memory provider can hand the key to
a second request while the callback is still waiting: Medusa 2.21's in-memory
provider does not renew leases. The configured Redis provider normally renews
its lease every third of the expiry, but after losing a lease it aborts a signal
that this callback does not consume; the route can continue its side effect
until the response closes, while `execute` only reports the lost lock after the
callback resolves. These cases share the same defect: the quota check can be
re-entered before an earlier reservation write has definitively stopped.

Keep serialization coupled to completion of the reservation operation itself,
including when the client disconnects or the lock lease is lost. Add an HTTP
regression that aborts a request after its quota check but before the reservation
write, then verifies a second allocation cannot pass early and the final
reserved total stays within the line's need.

### Round 2 P1 and concurrent regression

For the tested simultaneous-request case, the fix works. The check and the
reservation route run under the same `order-line-allocation:<line_item_id>`
lock. Against the exact `ea99413` snapshot, all **16 committed admin-access
HTTP tests passed**. The new test sent 12 simultaneous allocations of one unit
to a one-unit line: exactly one response was 200, the rest were 400, and the
stored reserved quantity was 1. With only the line-lock call removed in a
counterfactual run, the same committed test failed: **12 responses were 200**
and the test expected one. This confirms the test catches the original race,
but it does not cover the disconnect case above.

The lock wait limit is ten seconds. Requests that exceed it fail before
entering the critical section. Normal errors inside the callback release the
lock through Medusa's `execute` cleanup. I found no lock cycle with Medusa's
reservation workflow: the middleware holds an order-line key, while the native
workflow takes inventory-item keys, and the inspected path does not acquire
those keys in reverse order. The separate stored-value check for manager stock
settings is byte-identical to the prior version.

### Validation and scope

- **Unit:** four focused suites passed, **84 tests**.
- **HTTP:** all **16** committed admin-access integration tests passed against a
  temporary PostgreSQL database, including the 12-request race test.
- **Counterfactual:** removing only the order-line lock made the concurrent
  regression fail with 12 accepted requests, as expected.
- **Abort probe:** confirmed a reproducible over-allocation after `close`, as
  described in the P1 finding. This probe was injected only into a disposable
  snapshot and did not change repository files.
- The author reports the other HTTP suites and `npm run check` passing; this
  review did not rerun those checks. Redis was inspected at the installed
  provider implementation level; no live Redis service was configured for this
  review.

**Must still be fixed: hold the quota lock through completion or cancellation of the reservation write, even after a client disconnect or lease loss.**

---

## Author response to Round 3 (Claude)

### [P1] The line lock was tied to the HTTP response, not to the write - fixed
The lock no longer lives in the request. A manager's allocation is now a workflow, built the same way as the quick-variant workflow:
- `apps/backend/src/workflows/allocate-order-line-stock.ts`: `acquireLockStep(order-line-allocation:<line>)` → `check-order-line-need` step (the existing pure rule plus the lookups, moved here from the middleware) → Medusa's `createReservationsWorkflow` as a step → `releaseLockStep`. If any step fails, `acquireLockStep`'s compensation releases the lock.
- `apps/backend/src/api/manager-request-checks.ts`: a manager's `POST /admin/reservations` no longer calls `next()`. It validates the body (`allocationSchema`: the native fields, with `line_item_id` required), runs the workflow and answers `200 { reservation }`, the native route's shape. A client disconnect therefore cannot end the critical section: `workflow.run` is awaited by the server whether or not anyone is listening. Admins still use Medusa's native route unchanged.
- **Lease expiry:** the critical section is now only the need check and the reservation write. It contains no wait for the client, so the 120 s lease is reached only if the process hangs mid-write. This is the same residual risk as the quick-variant lock that Seif accepted as R3-2. With Redis, losing a lease needs renewals to fail, meaning Redis is unreachable; the reservation write then needs a working database but nothing else. I'm reporting that as residual, not as resolved.
- New HTTP regression "keeps an order line locked until its reservation is written, even if the manager disconnects", on a 1-unit line:
  - the test pauses the first reservation write after its quota check (wrapping the Inventory module's `createReservationItems`);
  - it aborts that client's connection and starts a second allocation;
  - after 500 ms it resumes the first write;
  - the second answers 400 "At most 0 more", and `reserved_quantity` is 1.
- Counterfactual: with the previous middleware lock (ea99413's `manager-request-checks.ts`), the same test gets 200 for the second request, matching your probe.
- The parallel and sequential allocation tests still pass unchanged.

### Checks
- HTTP integration: 40 passed (17 admin access, 13 sign-in, 10 quick-variant).
- `npm run check`: 184 backend and 105 storefront tests pass; 0 type or lint errors.
