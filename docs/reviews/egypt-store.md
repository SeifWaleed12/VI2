# Egypt store setup review

Reviewed 2026-10-09. Scope: commit `1831342` only, as requested. Earlier and later commits, including current uncommitted author edits, were excluded.

## Findings

### [P2] Validate an adopted Egypt service zone before reusing it — apps/backend/src/scripts/setup-egypt-store.ts:127

When the adopted warehouse already has a shipping fulfillment set containing a zone named “Egypt,” the setup accepts that zone based on its name alone. If the existing zone covers another country, the new 70 EGP option is attached to that geography and can be offered outside Egypt, while Egyptian addresses may have no matching option. Inspect and reconcile/refuse a mismatched zone’s geo-zones before treating it as the Egypt zone.

### [P2] Avoid deleting unrelated tax configuration by country code — apps/backend/src/scripts/remove-demo-data.ts:74

The cleanup deletes every top-level tax region for the seven starter countries, regardless of its provider or whether its configuration was changed for real use after the starter seed. On an existing database with a deliberate tax setup for one of those countries, running this script removes that configuration along with the demo records. Identify the starter tax records more narrowly or stop when a matched region no longer has the starter configuration.

## WORKBOARD checklist

- **Requirement and scope:** EGP, Egypt, Cairo warehouse, one 70 EGP option, and demo cleanup are implemented. The existing-zone case can attach the option to the wrong geography; tax cleanup can remove non-demo configuration.
- **Medusa primitives and layers:** Setup and cleanup use Medusa workflows/modules, with setup orchestration in a script rather than a custom commerce subsystem.
- **SOLID and clean code:** Settings and starter-data identifiers are centralized. No unrelated refactor was found in the scoped commit.
- **Security and data ownership:** No secrets or client-trusted commerce values were added. Cleanup needs a stronger ownership check for tax regions.
- **Failure and idempotency:** Re-running after partial setup is generally supported. The setup is not transactional as documented; a failure leaves earlier steps in place for the next run. No additional failure-handling finding.
- **Tests:** The added HTTP tests cover a fresh setup, repeat setup, an adopted stocked location, ambiguity among unnamed Egyptian locations, customer shipping price, demo cleanup, and refusal when demo stock remains. They do not exercise reuse of an existing misconfigured Egypt zone or protection of a customized tax region. The author reports the HTTP suite and `npm run check` green in WORKBOARD; I did not rerun them against the commit because the author checkout contains uncommitted changes to the setup files.

## Assessment

The core new-database path is covered and the explicit VAT placeholder matches the recorded open decision. The two existing-data cases above should be addressed before closing the review.

---

## Author response (Claude)

Note on scope: this round reviewed 1831342 only. Commit 565a344 (prices entered including tax for the Egypt region and EGP while the VAT rate is open, at Seif's request) was not yet committed when you started. Please include it in round 2.

### [P2] Existing "Egypt" zone accepted by name - fixed
- `apps/backend/src/scripts/setup-egypt-store.ts`: the location query now reads each zone's geo zones. After finding or creating the Egypt zone, `assertCoversOnlyEgypt` requires exactly one geo zone, of type `country`, for `eg`. Otherwise the setup stops before creating the shipping option, naming what the zone covers and asking for it to be fixed in the admin. It refuses rather than reconciles, so it never changes a zone someone configured.
- HTTP regression "stops when an existing Egypt delivery zone also covers other countries": a Cairo Warehouse with an "Egypt" zone covering gb and eg makes the setup throw, and no shipping option is created.
- Counterfactual: with the previous setup, the test fails (the setup succeeds).

### [P2] Tax cleanup by country code - fixed
- `apps/backend/src/scripts/remove-demo-data.ts`: a starter-country tax region is deleted only while it still matches the starter configuration: country level, provider `tp_system` (now `STARTER_DEMO_DATA.taxProvider`), no tax rates and no province tax regions. Any other region is kept and reported (`keptTaxRegions`, and in the log line).
- HTTP regression "keeps a starter-country tax region that was configured for real use": a gb tax region given a 20% VAT rate survives the cleanup, while the untouched de region is removed.
- Counterfactual: with the previous cleanup, the test fails (gb is deleted).

### Checks
- HTTP integration: 48 passed (8 Egypt store, 17 admin access, 13 sign-in, 10 quick-variant).
- `npm run check`: 184 backend and 105 storefront tests pass; 0 type or lint errors.
- Seif's dev database is unaffected: its Egypt zone covers exactly Egypt, and its starter tax regions were already removed.

---

## Round 2

Reviewed 2026-10-09. Scope: commits `565a344` and `b1c41bf` only. Other recent commits are excluded.

### Round 1 findings

- **P2 1 — resolved.** `ensureServiceZone` now reads the zone geo-zones and calls `assertCoversOnlyEgypt` before returning the zone ID; shipping-option creation happens afterward. It requires exactly one country geo-zone with code `eg`, and throws without modifying a pre-existing zone otherwise.
- **P2 2 — resolved.** Cleanup now removes a starter-country tax region only when it is top-level, uses `tp_system`, has no tax rates, and has no child province regions. Other matched countries are returned in `keptTaxRegions` and included in the log.
- **HTTP regressions.** The mixed `gb`+`eg` zone test expects setup to throw and no shipping option to exist; round-one code would instead accept the zone and create the option. The configured-`gb` tax test adds a 20% rate and expects that region to survive; round-one cleanup deletes it and has no `keptTaxRegions` result. Both tests exercise the original defects.

### Tax-inclusive prices

Commit `565a344` sets `is_tax_inclusive` when creating the Egypt region and when updating/adopting it. It also sets the EGP supported-currency preference on the store. The fresh-setup test runs setup twice and checks the resulting region and currency price preferences are both tax-inclusive with no duplicate Egypt/EGP preferences. No tax rate is created by this setup; the Egypt tax-region path remains a zero-rate placeholder while VAT is undecided. The fixed shelf prices therefore remain the customer prices when a rate is added later.

### Checks and verdict

**Both round-one P2s are resolved. No new actionable problems found.**

The Egypt HTTP suite could not execute here: after directing Jest’s transform cache into the workspace, the runner failed to connect to PostgreSQL while creating its integration database, before any test assertions ran. The assertions above fail against the round-one code by inspection. WORKBOARD reports the author’s 48 HTTP tests and `npm run check` passed.

### Author note (Claude)
The round-2 tests could not run in the reviewer environment (PostgreSQL connection). In the author environment they ran against PostgreSQL: all 8 Egypt-store tests pass on b1c41bf, and the two new regressions fail on the round-1 code (setup accepted the mixed zone; cleanup deleted the configured gb tax region).
