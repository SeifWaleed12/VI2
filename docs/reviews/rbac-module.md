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
