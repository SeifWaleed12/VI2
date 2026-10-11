# Review: category navigation and locale foundation (GPT series)

Reviewer: Claude. Author: GPT (`gpt/work`). Reviewed 2026-10-11.
Series reviewed: `d994061` (SF 2 revert) and `bd1998c`, `f739bdc`, `b1f69a3`,
`b7862c0`, with GPT's handoff `docs/reviews/storefront-category-locales.md`.
(Named `-review` here to avoid a path clash with GPT's file when merging.)
No GPT code or folder edited; nothing merged.

## Verdict

**Approved with three should-fix items (F1-F3).** Nothing blocking found.
Review the series as a whole, as GPT asks; intermediate commits are not
deployable on their own.

## What the series does

- `d994061`: full revert of SF 2 (`f744658`, `823c7eb`) at Seif's request. I did
  not reset or edit anything myself; the revert is GPT's commit.
- `bd1998c`: Turbopack root fix for the sibling-`node_modules` GPT worktree
  (`next.config.ts`; normal installs keep the workspace root).
- `f739bdc` (backend): turns on Medusa's `translation` flag and module
  (`medusa-config.ts`), plus `setup-wellness-catalog.ts` which plans and (with
  `apply`) creates 5 root and 33 child categories with Arabic translations.
- `b1f69a3` / `b7862c0` (storefront): all pages move under `/[locale]` (`en`,
  `ar`), a `proxy.ts` redirects old URLs and sets `x-vi2-locale`, keyed text
  dictionary (`lib/i18n.ts`), paginated category tree from Medusa with descendant
  filtering, shared desktop/mobile/footer menus, the `/categories` page deleted
  (404).

## Checks I ran (throwaway worktree of `b7862c0`, removed)

| Check | Result |
|---|---|
| Storefront Jest | 14 suites, 138 tests pass (matches GPT). |
| Storefront `tsc --noEmit` | Exit 0. |
| Backend tests, lint, build, live run | Not run by me. GPT reports 187 backend tests, build and a live check on ports 9001/3001. |

## Findings

### F1 (should fix, from reading the code, not run): dotted URLs bypass the proxy

`proxy.ts` matcher is `/((?!api(?:/|$)|_next(?:/|$)|.*\.).*)`. The `.*\.`
exclusion skips any path containing a dot, not only asset files. A product
handle such as `whey-2.5kg` (`/products/whey-2.5kg`) then gets no locale
redirect (404, since pages exist only under `[locale]`), and
`/ar/products/whey-2.5kg` gets no `x-vi2-locale`, so the root layout falls back
to `en`/`ltr` for an Arabic URL. Supplement handles with sizes are plausible.
Fix: exclude by file extension (`\.(?:png|jpe?g|svg|ico|css|js|map|txt|xml|webp|woff2?)$`)
or check the last path segment only, and add a test with a dotted handle.

### F2 (should fix or record): every page is dynamic and refetches the category directory

The root layout reads `headers()` (`app/layout.tsx`), so no page can be static, and
`getCategoryTree` calls Medusa with `cache: "no-store"` (up to 8 s timeout, 50 per
page). React `cache` only removes duplicates within one request. Result: at
least one Medusa round trip per page view and no CDN caching of storefront
pages. GPT lists "no persistent cache" as a design choice. Acceptable for MVP
traffic; please put it on the workboard as a known limit, and consider a short
`revalidate` per locale once traffic matters. Failure handling itself is good:
a backend outage renders the page with a retry state instead of crashing.

### F3 (should fix): production runbook missing for the translation change

`medusa-config.ts` now requires the Translation Module tables. GPT migrated the
local dev database with `--skip-links --skip-scripts --skip-search` and applied the
setup script there. For Coolify/production, nothing says: run `db:migrate`
(without those skips), then the setup script dry run, then `apply`, and that
the config change must ship together with the migration. The workboard rule
for `medusa-config.ts` changes was followed (live check), but add the deploy
steps to the workboard or `docs/`. Also: the script prints the plan but not
which database it targets; print the database host/name before `apply`.

### F4 (minor): the setup script overwrites names on reused categories

For a category matched by handle or exact English name, `apply` runs
`updateProductCategories(id, {name, rank})`. A manager's later rename or
reorder in Admin is overwritten if someone reruns `apply`. It is idempotent and
dry-run is the default, so this is acceptable; say so in the script header.

### F5 (minor, owner decision): content and scope

- Arabic category wording and the taxonomy (including names like "Magnesium
  (Glycinate, Citrate)") need review by a native speaker/Seif; I did not judge them.
- The unrelated `supplements` root stays public and has no Arabic translation,
  so the Arabic menu shows it in English (a dev warning is logged).
- Intermediate commits (for example `d994061`) leave some tests failing, as
  GPT's own workboard note says; only the final state is green.
- Legacy screens still translate by a post-hydration compatibility layer
  (`LanguageContext.tsx`). GPT documents this as the approved follow-up.
  Fragile, but contained.

## Looks right

- Locale handling in `proxy.ts`: header taken from the URL, never from the
  request (tested against a spoofed header); cookie is only `en`/`ar`; query and
  fragment kept on redirect; `/api` and `/_next` untouched; `//host` style
  hrefs are not rewritten (`localizedHref`).
- `buildCategoryTree`: orphans with a non-public parent are not promoted to
  roots; cycles throw; stable ordering by rank then id.
- Setup script: validates the whole plan before any write, refuses ambiguous
  matches and a second store, dry run by default, safe to rerun.
- No new dependency, no lockfile or `AGENTS.md` change.

## Not verified

Backend tests/build, a live Arabic walkthrough, a real Admin translation edit,
and the production migration path.

---

# Recheck of GPT's fix commit `ee4542f` (2026-10-11)

**Approved.** All of F1-F4 are fixed; F5 is recorded as owner decisions.

| Finding | Result |
|---|---|
| F1 dotted URLs | Fixed. `proxy.ts` matcher now excludes only listed file extensions. New tests use Next's own `unstable_doesMiddlewareMatch` for `/products/whey-2.5kg`, `/en/...`, `/ar/...` (all routed, correct locale header and redirect) and confirm `/api`, `/_next`, `.svg`, `.png`, `.woff2`, `robots.txt`, `sitemap.xml` stay outside routing. |
| F2 no caching | Recorded as a known limit in `docs/CATEGORY-LOCALES-DEPLOYMENT.md` and the workboard, with "measure before caching". No code change, as I suggested. |
| F3 runbook | Fixed. New `docs/CATEGORY-LOCALES-DEPLOYMENT.md`: backup, full `db:migrate` without the skip flags, dry run, apply, rerun dry run, start backend then storefront, post-release checks, failure handling. The script now prints database host, port and name (never credentials) before any read or write and refuses an unreadable URL. |
| F4 overwrite | Fixed in the script header and the runbook. |
| F5 content | Listed as owner decisions on the workboard (Arabic wording review, the `supplements` root). Correctly left to Seif. |

My checks (worktree of `ee4542f`, removed): storefront Jest 148 pass, `tsc` exit 0;
backend `wellness` and `setup-wellness-catalog` unit specs 9 pass. I did not run
the full `npm run check`, the builds or the dry run against a database; GPT reports
341 tests, both builds and a local dry run reusing all 38 categories.

Small notes: the new matcher would still skip a handle that ends in one of the listed
extensions (for example `x.pdf`), which is unlikely for a product handle. The runbook
step "start the new backend release" assumes the migration window described there;
Seif should confirm it matches how Coolify deploys this project.

Merge decision is Seif's. Remaining before production: the owner decisions, a
signed-in Admin/customer manual check, and the real deployment run.
