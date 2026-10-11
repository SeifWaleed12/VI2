# Category translations: staging and production release

The Translation Module configuration and its native migrations ship as one release.
Deploy the complete category/locale series plus the review follow-up, alongside the
other already-approved backend modules. Do not replace newer backend configuration
with the older GPT checkout or deploy intermediate series commits independently.

## Release order (Coolify or another deployment runner)

1. Back up the target database using the existing database backup procedure. Verify
   the release runner uses that environment's database configuration, not the local
   `vi2_dev` environment. Keep the old release serving until the migration window;
   pause backend/worker restarts while the release operations run.
2. Run native migrations using the **complete release configuration** before starting
   the new backend or workers. Do not use the local review-only
   `--skip-links --skip-scripts --skip-search` flags in staging/production.
3. Run the category setup dry run. Its first output identifies only the database
   host, port and name; credentials and connection options are never printed.
   Confirm that target and inspect every create/reuse entry and unrelated category.
   Ambiguous matches or conflicting parents must be resolved in native Admin before
   applying. A dry run still requires the new Translation Module tables to exist.
4. Run `apply` only after the dry run matches the intended taxonomy and database.
   Apply also prints the target before any catalog writes. Rerun the dry run and
   confirm the 38 manifest categories now reuse their existing IDs.
5. Start the new backend/worker release, then the storefront release. Keep Redis and
   other configured services reachable under the existing deployment configuration.
6. Verify the native Admin translation controls and English/Arabic Store API category
   responses use the same IDs. Check both menu layouts, Arabic HTML language/RTL,
   parent/child shop filters, and a signed-in customer's language switch with a cart.
   Check `/categories`, `/en/categories`, and `/ar/categories` all return 404.

Run these commands from `apps/backend` in the full release workspace, with its
installed dependencies and the **target environment** supplied by the deployment
runner. This is a release operation, not a command to run against a production
checkout while the new server is already accepting requests.

```powershell
node ../../node_modules/@medusajs/cli/cli.js db:migrate
node ../../node_modules/@medusajs/cli/cli.js exec src/scripts/setup-wellness-catalog.ts
node ../../node_modules/@medusajs/cli/cli.js exec src/scripts/setup-wellness-catalog.ts apply
node ../../node_modules/@medusajs/cli/cli.js exec src/scripts/setup-wellness-catalog.ts
```

If the runtime image contains only compiled output, run these operations through a
release runner retaining the source workspace and dependencies; do not assume the
source script is present in the compiled server image. A migration/setup error stops
the release: preserve the previous image and database backup, inspect the error, and
rerun the dry run before retrying. Do not delete translation tables or categories as
a rollback shortcut. No staging or production operation was performed for this fix.

## Setup is reconciliation, not ongoing synchronization

`apply` restores manifest English names, sibling ranks and Arabic names on every
matched category. It overwrites subsequent Admin renames, reorderings and Arabic
label edits, including when a category is matched by its unchanged handle. Existing
IDs, products, assignments and unrelated categories are retained. Use native Admin
for routine edits after setup; rerun `apply` only for deliberate reconciliation.
The dry run identifies matched categories but is not a field-by-field diff.

## Recorded MVP limits and owner decisions

- Reading the locale in the root layout makes storefront pages dynamic. Category
  requests use `no-store`; React `cache` deduplicates only within that request and
  locale. Every page view therefore needs at least one Medusa category request
  (additional requests beyond 50 categories), with up to an 8-second timeout per
  request and no full-page CDN caching. This preserves Admin updates on refresh.
  Directory failure renders the existing retry state and leaves unfiltered shopping
  usable. If traffic/latency warrants caching, measure first and agree a short
  per-locale revalidation period and freshness expectations before changing it.
- Seif/native-speaker review of the Arabic manifest wording remains open. No labels
  were silently changed in the review follow-up.
- The unrelated active/public `supplements` root and its existing assignments remain
  intact. Missing Arabic text falls back to English with a development warning.
  Seif must decide whether to translate it, reorganize it, or change its visibility
  through native Admin. Do not delete it merely to show exactly five roots.
- Legacy screens still use the contained translation compatibility path. Full
  checkout/account/description translation remains a separate approved follow-up.
