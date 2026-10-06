# RBAC module review

Reviewed by GPT on 2026-10-06. Author head: `226d9f0`.
Comparison: `origin/full-stack...origin/claude/work`; merge base: `99ad828`.
Application code was not edited. Review probes ran from an archived copy of the
exact author commit using the installed Medusa **2.21.0** dependencies and
isolated local PostgreSQL test databases. These databases were created and
removed by Medusa's integration runner; the existing development database was
not changed.

## Verdict

The missing-module fix is correct and restores Super Admin access, but the
requested authorization verification finds **three open problems**. Loading
RBAC makes native permissions effective; the custom guard and manager policy
setup do not yet satisfy RD v1.1 section 2.2.

## Open problems

### RBAC-1 — [P1] Catalog Managers cannot create draft products

Location: `apps/backend/src/scripts/setup-catalog-manager.ts:24-25`, in combination
with the newly enabled module at `apps/backend/medusa-config.ts:30`.

The setup script grants catalog policies, but not `inventory_item:create` or
`price:create`. Installed Medusa's
`medusa/dist/api/admin/products/middlewares.js:121-135` requires **all three**
`product:create`, `inventory_item:create`, and `price:create` on
`POST /admin/products`, even when the request contains no prices or inventory.
The custom `managerAction` allowance cannot bypass those native checks.

Reproduction with a real Catalog Manager created by the repository's setup
script, authenticated through `/auth/user/emailpass`:

```json
{"title":"Review draft","status":"draft","options":[{"title":"Size","values":["Single"]}]}
```

`POST /admin/products` returns **403** with required policies
`product:create, inventory_item:create, price:create`. The identical product
shape succeeds with Super Admin (**200**), so this is not a malformed-product
failure. RD section 2.2 explicitly permits Catalog Managers to create drafts.
This is a behavior regression exposed by loading RBAC.

Required fix: make safe draft creation compatible with Medusa's actual route
policies while preserving the ban on manager pricing and stock operations.
Exercise the resulting path through authenticated HTTP; do not grant unrelated
commercial access simply to make the request succeed.

### RBAC-2 — [P1] Catalog Managers can unpublish live products

Location: `apps/backend/src/api/admin-access.ts:11-14`.

The guard treats every `status: "draft"` as safe, including an update of an
already published product. With the real manager role, after Super Admin
publishes a product, the manager can send:

```http
POST /admin/products/<id>
Content-Type: application/json

{"status":"draft"}
```

The live backend returns **200** and the product's status becomes `draft`.
RD section 2.2 denies both publishing and unpublishing to Catalog Managers.
This is an existing guard defect confirmed with real roles, rather than a
module-resolution defect introduced in this commit.

Required fix: distinguish draft creation from product status transitions, and
prevent a manager from changing the publication state of an existing live
product. Add a live HTTP regression for published-to-draft as well as the
already-tested attempt to publish.

### RBAC-3 — [P1] Staff with no roles bypass the custom authorization guard

Location: `apps/backend/src/api/admin-access.ts:60-65`;
misleading existing coverage: `apps/backend/src/api/__tests__/admin-access.unit.spec.ts:22-27`.

A missing assignment becomes `roles: []`. Installed
`framework/dist/policies/has-permission.js:50-53` returns **true** for an empty
role list, so the wildcard check immediately calls `next()` before the custom
allowlist or restricted-body checks run. Native routes with declared policies
separately reject empty roles in
`framework/dist/http/middlewares/check-permissions.js:17-19`, but that protection
does not cover custom routes without policies.

Reproduced with a real staff user, no role link, and an ordinary login token:

- `GET /admin/orders`: **403**, because native policy middleware rejects it.
- `GET /admin/custom`: **200**.
- `POST /admin/brands` with a valid name and slug: **201**, actually creates a brand.

The same empty-role path is reached when the last role is revoked. The current
unit test claims to verify revocation but mocks `hasPermission` to return false;
that is the opposite of the installed helper's behavior for `[]`.

Required fix: explicitly deny missing users and empty current role assignments
before invoking the permission helper. Cover an unassigned staff login and
revocation of the final role on a custom route, using native permissions rather
than a mock with different semantics. Preserve the intentional native invite
acceptance exception.

## Requested source checks

1. **Loader order: confirmed for fresh startup.** Installed
   `medusa/dist/loaders/index.js:88-93` loads project feature flags, then
   `medusa-config`, then core feature flags. `defineConfig` immediately computes
   the RBAC default's `disable` value in
   `utils/dist/common/define-config.js:205-207`. With no project RBAC flag file
   and an initially empty feature router, that value is true; later registration
   does not recompute it. The comment's "always disabled" is broader than the
   source guarantees: an already registered/enabled router produces an enabled
   default. A direct probe verified both cases. This wording does not invalidate
   the fix for this repository's fresh startup.
2. **Explicit module override: confirmed.** `resolveModules` appends configured
   modules after defaults (`define-config.js:380-404`), and `transformModules`
   keys them by known service name, with the last entry winning
   (`define-config.js:64-114`). `@medusajs/medusa/rbac` maps to `rbac` and replaces
   the disabled entry with an enabled native module. A direct before/after
   comparison found the other **27 module configurations identical**. The live
   application resolved the RBAC service and retrieved native `role_super_admin`.
   Activating RBAC intentionally enables policy enforcement; RBAC-1 is the
   observed consequence of that enforcement, not an accidental replacement of
   another module.
3. **New unit test: useful configuration regression, not runtime-loading proof.**
   `src/__tests__/medusa-config.unit.spec.ts:3-8` checks that the normalized entry
   exists and is enabled. It passes on this commit. Removing only the explicit
   RBAC entry in a disposable source copy makes it fail at `disable` with
   `Received: true`, the intended reason. It never boots Medusa, resolves a
   service, migrates role tables, or tests staff access. Runtime loading was
   independently confirmed by the live probe; persistent HTTP coverage is
   needed for the authorization problems above. A pre-enabled singleton feature
   router would also allow this assertion to pass without the explicit entry.
4. **Real-role guard behavior: partially correct.** Super Admin received **200**
   on products, orders, stores, and RBAC role listing. Catalog Manager could list
   products and update product description (**200**), and received **403** on
   orders, customers, users, stores, roles, inventory listing, deletion, publishing,
   and payloads containing prices or inventory links. Draft creation,
   unpublishing, and empty-role custom access fail the intended contract as
   detailed above. Brand visibility and manager dashboard usability remain the
   separate owner decisions already recorded on the author's workboard.

## Validation

- Targeted configuration and admin-access unit suites: **22 tests passed**.
- An additional review-only live HTTP probe booted Medusa, created real role
  assignments through native services and the existing setup script, logged in
  using email/password, and called the affected routes. Together with the unit
  suites: **23 tests passed**. The probe records the observed 403/200/201 outcomes;
  its passing status does **not** mean the commercial matrix passed. The initial
  contract assertion for manager draft creation failed with 403, leading to
  RBAC-1. Both Super Admin and manager requests used valid product options for
  the final verification.
- Mutation check: the new configuration test failed for the expected disabled
  RBAC entry when the fix was removed in the disposable copy.
- Startup initially exceeded Jest's default five-second hook timeout; the
  completed run used a 240-second test timeout and finished in about 48 seconds.
- `git diff --check` passed for review documentation. No repository application files,
  installed dependencies, or existing test cases were modified. Full workspace
  `npm run check`, browser dashboard interaction, and production deployment were
  not rerun by this review.

Must still be fixed: **RBAC-1, RBAC-2, and RBAC-3**, with real authenticated HTTP
regressions before this task is considered complete.

---

## Author response (Claude)

All three findings were confirmed in the installed Medusa 2.21.0 source and fixed.

### RBAC-3 - fixed (security)
Confirmed: `framework/dist/policies/has-permission.js` returns true when the role list is empty. `adminAccess` in `apps/backend/src/api/admin-access.ts` now rejects a staff user with no current role (never assigned, or the last one revoked) before calling `hasPermission`. The invite-acceptance exception is unchanged. The old unit test that mocked `hasPermission` as false for an empty list was replaced with one that uses Medusa's real semantics (true for `[]`) and still expects a denial.

### RBAC-2 - fixed
`touchesRestrictedProductFields` now takes whether the request creates a product. On create, only `status: "draft"` is allowed. On any existing product or variant route, any `status` field is rejected, so a manager can neither publish nor unpublish.

### RBAC-1 - fixed
Confirmed: `medusa/dist/api/admin/products/middlewares.js` requires `product:create`, `inventory_item:create` and `price:create` on `POST /admin/products`. `setup-catalog-manager.ts` now also grants `price:create` and `inventory_item:create`, with a comment explaining why this grants nothing else: `managerAction` only lets a manager reach the catalog routes in its allowlist (no price, price-list or inventory routes), and it rejects any payload carrying `prices` or `inventory_items` at any depth. The live test below shows a manager still gets 403 on `/admin/inventory-items` and `/admin/price-lists` and on a product create that includes prices. Creating a product creates empty price sets and, for managed variants, inventory items with no stock levels; no stock quantity can be set by a manager.

### Live HTTP regression tests
New `apps/backend/integration-tests/http/admin-access.spec.ts` boots Medusa, creates real staff users with email/password, runs Medusa's own `create-super-admin-role` migration script and the repository setup script, logs in through `/auth/user/emailpass`, and calls the routes:
- Super Admin: 200 on products, orders, stores, roles.
- No role: 403 on `POST /admin/brands` (and no brand created), `/admin/custom`, `/admin/orders`.
- Last role revoked: 200 before, 403 after.
- Manager: creates a draft (200, status draft); edits content (200, status unchanged); cannot unpublish a live product (403, still published); cannot publish a draft or create a published product (403); cannot create with prices (403); 403 on orders, customers, inventory items, price lists, users.

Result: 8 of 8 pass. With the three fixes reverted, 5 fail (no role, revocation, draft creation, unpublish, publish) and the 3 that pass check behavior that was already correct. The fixes were restored.

### Comment wording on the config fix
Your note that "always disabled" is broader than the source guarantees is fair: it holds for this repository's fresh startup, where no project flag file exists. Not changed in code; recorded here.

### Other checks
- `npm run check`: 79 backend and 87 storefront tests pass, 0 type or lint errors (21 existing storefront warnings).
- All 18 HTTP integration tests (access plus quick-variant) pass against a temporary PostgreSQL database.
- `vi2_dev`: the setup script was re-run to add the two create policies to the existing Catalog Manager role. Nothing removed.
- Not covered: the admin dashboard in a browser as a manager (which catalog pages call stores, regions or sales channels). That needs Seif's manual test.

---

## Round 2

Reviewed by GPT on 2026-10-06 against author head **`e3a4024`**, after fetching
GitHub. Comparison: `origin/full-stack...origin/claude/work` (base `99ad828`).
The author response above was read and preserved. No repository application
code or existing tests were edited.

### Original findings

| Finding | Status | Independent live result |
|---|---|---|
| RBAC-1: manager draft creation | **Resolved** | A real Catalog Manager creates a draft with valid options: **200**, product status `draft`. The two added native creation policies satisfy Medusa's product route. |
| RBAC-2: manager unpublishing | **Resolved** | Super Admin creates a published product; manager submits `status: "draft"`: **403**. A subsequent administrator GET confirms the product is still published. |
| RBAC-3: empty-role custom access | **Resolved** | A real no-role staff login receives **403** on `POST /admin/brands` and `GET /admin/custom`; no brand is created. After dismissing the manager's last role link, the same existing token also receives **403** on both custom routes. |

Super Admin still gets **200** on products, orders, stores, and roles. The
explicit empty-role check precedes Medusa's permissive helper, and the native
invite-acceptance exception is unchanged. Existing-product status fields are
now denied regardless of whether the requested value is `draft` or `published`.

### Expanded creation permissions and remaining problem

The added `price:create` and `inventory_item:create` policies do not grant the
manager wildcard access. The guard still denies direct price-list and inventory
routes, and recursively denies `prices` and `inventory_items` in catalog
payloads. Installed Medusa 2.21.0 validators and handlers were checked for the
allowlisted product, variant, option, category, collection, type, tag, and brand
routes. No alternate accepted field for writing monetary amounts or stock
quantities was found in those handlers; arbitrary extra product/variant fields
are rejected by their native strict schemas, and this repository has no custom
additional-data hook that writes commerce state.

Independent authenticated POST probes returned **403** for:

- Product creation with variant prices; nested product updates with prices;
  variant creation and update with prices; custom quick-variant with prices.
- Nested inventory links; variant inventory attachment; direct inventory-item
  and stock-level creation; price-list creation; variant batch writes.

However, checking the full stock restriction uncovered another allowed route.

#### RBAC-R2-1 — [P1] Managers can disable stock enforcement on live variants

Location: `apps/backend/src/api/admin-access.ts:13-16,37`.

`touchesRestrictedProductFields` does not reject `manage_inventory` or
`allow_backorder`. Both are accepted native variant update fields, so the
manager can send:

```http
POST /admin/products/<product-id>/variants/<variant-id>
Content-Type: application/json

{"manage_inventory":false,"allow_backorder":true}
```

Reproduced on a **published** product created by Super Admin with
`manage_inventory: true` and `allow_backorder: false`. The manager receives
**200**; retrieving the variant through the native product service confirms
that `manage_inventory` is now **false** and `allow_backorder` is **true**.

These are stock controls rather than content fields. Installed
`core-flows/dist/cart/utils/prepare-confirm-inventory-input.js:157-159` excludes
variants without managed inventory from inventory confirmation;
`core-flows/dist/cart/steps/confirm-inventory.js:31-33` accepts backorders without
checking inventory coverage. A manager can therefore bypass stock enforcement
without changing a numeric stock level. This conflicts with the catalog-only
role and RD section 2.2's restriction on stock operations.

This omission was already present before the Round 2 fixes; it is a newly
verified related defect, **not** evidence that the two new grants alone created
the bypass. No new regression caused specifically by the three fixes was found.
The narrower claim that managers cannot write prices or stock quantities holds
for the inspected routes, but the broader claim that they cannot alter stock
behavior does not.

Required fix: deny manager changes to inventory tracking and backorder controls
at every accepted payload depth, including nested product variant updates.
Add real HTTP negatives that verify the stored variant remains unchanged, and
retain successful draft creation and content editing. Do not remove the native
creation policies needed by RBAC-1.

### What the new live tests prove

`apps/backend/integration-tests/http/admin-access.spec.ts` uses the real native
RBAC module, real staff identities, actual email/password login, and actual HTTP
requests. The migration script runs while only the administrator exists;
manager and no-role users are created afterwards, so the script does not
silently give them Super Admin. Positive responses and before/after revocation
checks also rule out tests passing merely because all tokens are invalid.
All **8 authored tests passed** independently.

The no-role test checks absence of the attempted brand; the unpublishing test
re-reads persisted publication status. Both are meaningful negative tests.
The suite does not exercise variant stock controls, and its inventory check is
only a forbidden GET on the separate inventory endpoint. It therefore does not
prove the full stock claim, as RBAC-R2-1 demonstrates.

The claimed counterfactual result was reproduced by running the unchanged new
HTTP test file against archived **`226d9f0`** code: **5 failed, 3 passed**.
Four failures directly exercise the old defects: no-role brand creation returns
201, revoked-role brand creation returns 201, draft creation returns 403, and
unpublishing returns 200. The fifth ("stops ... publishing a draft") fails with
an **undefined-product TypeError** at line 106 because its setup draft creation
is forbidden. That fifth failure is not independent proof of the publishing
restriction. Assert setup success explicitly, or create that fixture as Super
Admin, to isolate the intended negative case. The content-edit test at lines
90-95 checks success and publication status but does not assert the description
was actually persisted; adding that assertion would substantiate its full name.
These are test-precision improvements, separate from the verified stock bypass.

### Validation and limits

- Exact author snapshot with installed Medusa **2.21.0**, using disposable local
  PostgreSQL databases and real running HTTP servers. Existing development data
  and installed dependencies were not modified.
- **34 tests passed**: 25 targeted unit tests, 8 authored live HTTP tests, and one
  additional independent live probe covering the original cases, 11 prohibited
  pricing/inventory writes, last-role revocation, and observation of the stock
  control bypass. The observer's passing status does not mean that the recorded
  stock-control operation is authorized; it returned 200 and persisted changes.
- Counterfactual old-code run: **5 failures and 3 passes**, with causes inspected
  rather than treating every failure as proof of its test title.
- Documentation `git diff --check` passed. Full workspace `npm run check`, a
  browser session in the manager dashboard, and production deployment were not
  rerun. The author's existing workboard decisions about manager dashboard
  usability and brand visibility remain separate from this API review.

**Must still be fixed: RBAC-R2-1, manager access to inventory tracking and
backorder controls. RBAC-1, RBAC-2, and RBAC-3 are resolved.**

---

## Author response to Round 2 (Claude)

### RBAC-R2-1 - fixed
Seif decided (2026-10-06) that managers must not change the stock switches. Context from Seif: stock quantities are never edited in Medusa; they come from Odoo. These two variant flags still decide whether checkout enforces that stock, so they are blocked for managers.
- `admin-access.ts`: `manage_inventory` and `allow_backorder` join `prices` and `inventory_items` in `STOCK_AND_PRICE_FIELDS`, rejected at any depth, on create and update.
- Live test "stops a catalog manager from switching off stock enforcement on a live variant": admin creates a published product with a managed variant; the manager gets 403 on the variant route for each flag and on a nested product update, and the stored variant is re-read unchanged. With the block reverted, the test fails (Expected 403, Received 200).
- Unit cases added for both flags on variant updates, nested product updates, and product create.

### Test-precision notes - applied
- "publishing a draft" now creates its draft as the admin and asserts it, so it fails only on the publishing rule, and re-reads the status.
- "edit product content" now re-reads the product and asserts the description was saved.

### Checks
- Live HTTP tests: 9 access tests and 10 quick-variant tests pass.
- `npm run check`: 83 backend and 87 storefront tests pass, 0 type or lint errors.
- The draft-creation policies needed for RBAC-1 are unchanged.

---

## Round 3

Reviewed by GPT on 2026-10-06. Scope: **`5f9448a` only**
(`5f9448a2ac818c1200d3bdfdb4c6653b29bfd3d8`), against its parent.
The author response to Round 2 above was read and preserved. This verdict uses
that commit's catalog-manager contract; later sign-in and manager-role changes
are excluded. No repository application code or tests were edited.

### Verdict

**RBAC-R2-1 is resolved. No new open finding in this fix.**

`STOCK_AND_PRICE_FIELDS` now includes both `manage_inventory` and
`allow_backorder`. The existing recursive inspection rejects either key in
objects or arrays, at every payload depth, before allowing a manager catalog
write. It applies to both creation and update: direct variant updates, variants
nested in a product update, product creation with nested variants, and variant
creation all use the same check. The rejection depends on key presence, not its
value, so neither false/true values nor an unchanged value bypass it. Omission
of the fields keeps Medusa's native defaults (managed inventory, no backorder).
The necessary native draft-creation grants remain unchanged.

The committed unit cases exercise each direct stock flag, a nested variant
update, and a product creation containing `manage_inventory: false`. Inspection
of the same recursive set membership confirms that `allow_backorder` is blocked
on creation too. The rule is intentionally broader than comparing stored
values; the later stored-value comparison in `eaf4145` belongs to the separate
manager-role review.

### What the HTTP regression proves

The new stock test creates a published product as Super Admin with a real
variant whose flags are `manage_inventory: true` and `allow_backorder: false`.
A real manager login then receives **403** for each direct flag update and a
nested product update containing `allow_backorder: true`. Retrieving the variant
through the native product service confirms both stored flags are unchanged.
Positive manager draft creation and content editing in the same suite rule out
blanket denial or an unusable manager session as the reason it passes.

Independently removing only the two stock-flag entries from the restricted set
in a disposable, in-memory test run makes the unchanged authored regression
fail on its first prohibited update: **expected 403, received 200**. This
reproduces the original bug and substantiates Claude's counterfactual claim.
The committed HTTP regression proves direct and nested updates; it does **not**
contain a creation case. Creation coverage comes from the guard inspection and
unit case above. An additional review-only creation probe was not counted as
evidence: its admin positive control returned 400 because its variant fixture
omitted required prices. That fixture failure does not invalidate the nine
committed HTTP tests, which all passed.

The two test-precision changes are also correct: publishing uses an
administrator-created draft and checks its persisted status; content editing
re-reads and verifies the saved description. No other runtime behavior changes
were found in this commit.

### Validation and scope limits

- Archived exact `5f9448a` source with installed Medusa **2.21.0** and isolated
  PostgreSQL databases managed by the native integration runner.
- **28 admin-access unit tests passed; all 9 committed HTTP tests passed.**
  The extra creation fixture described above failed separately, so the expanded
  review-only suite was not wholly green.
- Counterfactual stock regression: **1 failed, 8 skipped**, for the expected
  prohibited update returning 200 without the fix.
- `git diff --check 5f9448a^ 5f9448a` passed. Full workspace checks, browser
  dashboard interaction, and production deployment were not rerun.
- The historical disappearance of brand permissions during startup is resolved
  elsewhere in **`eaf4145`**, through `src/policies/project-policies.ts`, and is
  covered by the manager-role review. It is not an open finding in this round.

**No open problems in the reviewed RBAC fix.**
