# Category navigation and locale foundation — author handoff

Implemented on `gpt/work` in `vi2-gpt-review` under Seif's explicit approval of the full plan. Claude approved the initial series with three should-fix items; the follow-up below needs recheck and owner merge. The author checkout and unrelated review notes were preserved.

## Dependent tasks

1. **Native catalog translations and setup — f739bdc.** Enable the installed Medusa 2.21 Translation Module and feature flag. Reconcile five roots and 33 grouped child labels using native product/store/translation capabilities. Match existing IDs by handle or exact English name; validate the whole category plan before writing; reject ambiguity and parent conflicts. Preserve products, assignments, unrelated categories, supported locales, and roles. Dry run is the default; positional `apply` writes.
2. **Locale routing and category query foundation — b1f69a3.** Move storefront pages under `/[locale]`, keep APIs/assets unprefixed, redirect old URLs using the saved locale, and render navigation language and HTML direction on the server. Keyed dictionaries, localized links/router calls, explicit per-request catalog locale headers, paginated public category hierarchy, descendant IDs, invalid-ID/outage recovery, and stable product breadcrumb IDs. No shared SDK locale mutation, persistent cache, dependency, or second lockfile.
3. **Menus, removal, and compatibility completion — final commit in this review series.** Wire the same hierarchy to desktop, mobile and footer; retain separate menu styles and utilities. Desktop click/hover/keyboard entry and Escape focus return; dropdown/backdrop follow header height; labels wrap. Preserve mobile drill-in/back controls. Delete the category page/client/CSS. Complete compatibility containment after runtime testing found a hydration race: each remaining screen opts into legacy translation after its own hydration boundary; no page-wide observer or hiding. Native navigation/catalog labels are excluded from replacement.

Review the complete dependent series from `bd1998c` through the final commit, rather than deploying intermediate commits.

## Local data operation

Verified the environment resolves to **localhost:5432/vi2_dev** before writes. Applied native module migrations with `--skip-links --skip-scripts --skip-search` because the reviewer checkout does not contain unrelated newer author modules; their links and data were left intact. No production migration or deployment was performed.

Initial dry run: create 38 requested categories, retain the unrelated existing `supplements` root. Setup apply completed; a subsequent dry run reported reuse for all 38. A repeat apply for two Arabic wording corrections also reused all IDs. Native English and Arabic Store API responses both returned 39 categories with matching IDs. The old root stays active/public and therefore stays visible, as required by the automatic-directory rule. Its missing Arabic translation produces a development warning and English fallback. New requested categories are empty because existing product assignments were preserved.

From `apps/backend`, with the intended environment configured:

```powershell
node ../../node_modules/@medusajs/cli/cli.js exec src/scripts/setup-wellness-catalog.ts
node ../../node_modules/@medusajs/cli/cli.js exec src/scripts/setup-wellness-catalog.ts apply
```

Use the installed native Admin category, translation and store-locale controls for subsequent catalog edits. Storefront names, rank and hierarchy are read from Medusa on refresh. Native translations carry `en-US` / `ar-EG`; storefront routes use `en` / `ar`.

## Validation

The final repository `npm run check` passes (tests, both type checks, and both lint commands).

- Backend: **187 unit tests pass**; setup-specific three tests repeated after native error handling changes. Type checks, native lint and full backend/Admin build pass.
- Storefront: **138 tests in 14 suites pass**, covering locale routing, removed routes, native ID mapping, paginated categories, concurrent locale isolation, descendant filtering, invalid IDs, outages, rendered Arabic links, and deferred compatibility translation. Type checks, lint and production webpack build pass. The existing **19 storefront lint warnings** remain; no lint errors.
- Impeccable source scan of the changed menus reports no primary findings. Existing design context and desktop/mobile surfaces were preserved. No visual-world replacement or new dependency.
- Live local Medusa on 9001 and storefront on 3001: requested hierarchy and Arabic labels present; new empty groups return empty results; all-products shop retains the two existing products. Category directory fallback and invalid IDs are covered by tests; stopping the backend also produced the real catalog error with retry and all-products recovery.
- Direct Arabic response has `lang="ar"`, `dir="rtl"` and Arabic category navigation before hydration. Saved Arabic preference redirects `/shop?q=vitamin` to `/ar/shop?q=vitamin` (307).
- Language switch preserves category ID, query and fragment, with server-rendered language/direction after reload. A real creatine cart item survived Arabic-to-English switching; the temporary test line was then removed and the cart confirmed empty through Medusa. Auth APIs and cookie/cart identifiers remain unprefixed and shared.
- `/categories`, `/en/categories`, `/ar/categories` return **404 with no Location header**. No internal links target that interface. The production route manifest contains no categories page. Shared Medusa category services and tests remain.
- Account, sign-in, checkout and confirmation routes respond under the locale paths. Fresh Arabic shop, homepage and checkout loads have no hydration errors after the compatibility fix.
- Desktop 1440×1000, mobile 390×844, and both sides of the 980px breakpoint were checked. No horizontal overflow. ArrowDown/Enter enter the desktop menu; Escape closes it and returns focus; mobile drill-in and back work.
- Temporary dev servers and verification tabs were stopped/closed after checks. Preview captures are `category-desktop.png` and `category-mobile-ar.png` in the task's visualization directory.

## Limits and reviewer focus

- Full translation of checkout/account/descriptions remains the approved follow-up. Legacy screen text still translates after hydration; migrated navigation and search controls use keyed text on the server.
- A live authenticated customer language switch and native Admin edits through a signed-in staff session were not exercised. Session preservation is covered by unchanged identity storage/API paths and existing session/auth regression coverage. Review native staff translation access without expanding permissions.
- Future category additions/renames/rank changes are handled by fresh native requests and covered by hierarchy/rank tests; a separate manual Admin rename/reorder session was not performed. Parent descendant filtering is covered by service/query tests; real products were not reassigned to the new groups merely for QA.
- Existing catalog imagery includes an empty image and an image URL on localhost:9000; the separate verification backend ran on 9001. Image warnings are existing catalog data issues, outside this taxonomy/routing change.
- Review Arabic catalog wording and the decision to keep the unrelated `supplements` root during the normal owner-controlled review. No owner merge, production deployment, permissions rewrite, or external integration was performed.

## Claude review follow-up (2026-10-11)

Seif requested fixes after Claude's review at `5ec5812`, recorded in the author
checkout as `docs/reviews/storefront-category-locales-review.md`.

- **F1:** Replace the blanket dotted-path exclusion with static file extensions.
  The actual Next.js matcher and proxy are tested with unprefixed/English/Arabic
  `whey-2.5kg` handles; APIs, framework paths and existing static assets stay outside
  language routing.
- **F2:** Record dynamic rendering and per-request/no-store category fetching in the
  workboard and deployment guide. Preserve refresh freshness; no speculative cache.
- **F3:** Add `docs/CATEGORY-LOCALES-DEPLOYMENT.md`: complete-release migration without
  local skip flags, dry run, apply, reuse verification, and post-release checks.
  Setup reports the configured database host/port/name before catalog queries or
  writes, excludes credentials/options, and refuses an unreportable target.
- **F4:** Script header and runbook explicitly warn that rerunning apply overwrites
  matched English/Arabic names and ranks. Routine later edits belong in Admin.
- **F5:** Record Arabic editorial review and the unrelated public supplements root as
  pending owner decisions. Preserve existing data and the agreed compatibility scope.

No catalog data, permissions, dependency files, reviewer-authored notes, or production
state were changed. Runtime customer/Admin checks and production migration execution
remain pending; this follow-up does not claim to have performed them.

### Follow-up validation

- Workspace `npm run check` passes: **193 backend tests + 148 storefront tests =
  341**, both type checks, and lint. After resolving a new Medusa error-class
  warning, the final native backend lint reports no issues; storefront retains
  its **19 pre-existing warnings**. The six setup-target tests were repeated
  against the final script and pass.
- Storefront production webpack build and full backend/Admin build pass.
- Native Medusa exec dry run, guarded to the existing local development database,
  prints `localhost:5432/vi2_dev` and reports **reuse for all 38 requested categories**.
  No `apply`, migration, catalog write, production operation or dev server startup.
- No menu markup, styling, content labels or identity handling changed. Visual
  walkthroughs were not repeated for this routing/script/documentation follow-up.
- Final follow-up is ready for Claude's recheck and Seif's owner-controlled merge.
