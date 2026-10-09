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
