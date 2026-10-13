# Review: SF 2, categories page and mega menu from Medusa categories

Reviewer: Claude. Author: GPT (`gpt/work`). Reviewed 2026-10-09.
Reviewed: `git diff 7e29171 f744658` (16 files), the handoff and status commit
`67b79c6`. GPT's folder and branch were not edited. To run the checks I used a
throwaway worktree of `67b79c6` outside the repo (removed afterwards), with
this checkout's `node_modules` linked in.

## Verdict

**Changes requested: 1 blocking finding, 2 should-fix, 3 minor.** The design is
sound (public flat directory built into a tree, real Medusa IDs in links,
descendants resolved for the filter, invalid IDs give not-found, no fallback
categories, no new backend surface). The blocking item is a test failure that
GPT's environment hid.

## What I ran

| Check | Result |
|---|---|
| `tsc --noEmit` (storefront) | Exit 0, no diagnostics. Matches the handoff. |
| Storefront Jest, `--runInBand` | **7 failed, 124 passed (10 suites, 131 tests).** Handoff says 131 passed. See F1. |
| Lint, build, live walkthrough | Not run. Not claimed by me. |

## Findings

### F1 (blocking): `category-ui.test.ts` fails with the repo's real dependency layout

`src/components/__tests__/category-ui.test.ts` fails 7 of its tests with
"Objects are not valid as a React child" when it renders `CategoriesClient`,
`Navbar` and `DesktopMegaMenu` (lines 38, 63, 73 and others).

Cause (verified): the storefront uses React 19.2.8
(`apps/storefront/node_modules/react`), but `lucide-react` is hoisted to the
root `node_modules` (`package-lock.json` has `node_modules/lucide-react`), and
there it resolves React 18.3.1 (`require.resolve("react", {paths:[lucide-react]})`
returns the root copy; root `package.json` pins `react` 18.3.1). Icons built
with React 18 inside a React 19 render are the mismatch. GPT's run used a
`NODE_PATH` workaround with a different resolution order, so it saw all green;
a normal `npm run check` here will not.

These are the first storefront tests that render components containing Lucide
icons, so the problem is new in this diff, not in the old tests.

Fix options (author's choice): map `react`, `react-dom` and the JSX runtime to
the storefront copy in `jest.config.cjs` `moduleNameMapper`, or mock
`lucide-react` in this test. The first also protects later render tests. Re-run
`npm run check` (or at least storefront Jest) in a normal checkout and report
the real numbers. `jest.config.cjs` is not a shared file, but the mapper choice
should be stated in the review reply.

### F2 (should fix): `/shop` is now down whenever the category directory is down

`app/shop/page.tsx:9` awaits `getCategoryDirectory()` in `Promise.all` with the
page's search params, and the function throws on any failure. A category
outage, timeout (10 s) or malformed response now sends the whole shop to the
route error boundary, including the unfiltered `/shop` that needs no category.
Before this change the shop rendered from products alone. The test "propagates
category outages" (`category-page.test.ts`) locks this in for the scoped case,
which is right (never fall back to all products for a category link), but the
unscoped case should not need categories to list products.

Suggested: when no `category_id` is given, catch the directory error and render
the shop with empty `categoryOptions` (the sidebar already tolerates it); keep
the error for scoped requests. Add a test for it.

### F3 (should fix): two category mechanisms now coexist

`ShopClient` still honours `?category=<Name>` and four footer links
(`Footer.tsx:38-50`: Protein, Creatine, Vitamins, Wellness) plus two product-page
links (`ProductDetailClient.tsx:420,1338`) use it. Those names are hard-coded
(the footer) or the product's first category only; if no Medusa category of that
name exists the link silently shows everything, which is the "silent unfiltered
shop" behaviour the handoff says it removed for IDs. The mixed approach also
means the sidebar highlight logic checks both `selectedCategoryId` and
`category === item.name`.

Suggested: point the footer and product-page links at `categoryHref(id)` (the
product page already has `categories.id` in the fetched fields), or record the
legacy path as a known limitation in the handoff and workboard. Seif decides if
this belongs in SF 2 or a follow-up.

### F4 (minor): directory fetched twice on `/shop`, and on every page

`CategoryProvider` sits in the root `Providers`, so every page (checkout, order
success, account) triggers up to 100 sequential requests' worth of directory
loading on the client, and `/shop` then loads it again on the server. One
request per page is normal for a small catalog, but consider passing the
server-loaded directory to the provider as initial data, or loading lazily when
the menu opens. No change needed for a small category count.

### F5 (minor): shop sidebar is flat

`categoryOptions` is the whole flat directory, so parents and children appear as
one unindented list while the directory page and menu show the tree. Not wrong;
worth indenting or grouping by `parent_category_id` once the real catalog
exists.

### F6 (minor, documentation): handoff test claims

The handoff reports "131 passed". Per F1 that is not reproducible in the repo's
normal layout. Update the number after F1 is fixed. The handoff already says
`npm run check` was not green; that line stays true until then.

## Checked and fine

- Pagination and errors in `getCategoryDirectory` (`lib/medusa/services/categories.ts`):
  one 10 s signal for the whole load, stops on no-progress, bad `count`,
  or 100 pages; returns a generic error with no provider detail; five tests
  cover it.
- Provider lifecycle (`providers/category-provider.tsx`): request shared across
  effect replay; `retry` clears it and re-runs; unmounted updates are guarded.
- Hierarchy (`lib/category-navigation.ts`): orphans whose parent is not public
  become roots; same-named categories are told apart by ID; search keeps matching
  parents or the matching subtree.
- Shop scoping (`app/shop/page.tsx`): empty, repeated (array) or unknown IDs call
  `notFound()` before any product fetch; descendants are included; `getProducts`
  already forwards `category_id` as an array to Medusa. Clearing the filter uses
  `router.push("/shop")` and the client remounts via `key`.
- Bilingual loading, empty, error and retry states exist (`category-status.tsx`).
- No backend, `package.json`, lockfile or `AGENTS.md` change.

## Still required before closing

1. F1 fixed and storefront tests green in a normal checkout.
2. F2 and F3 fixed or explicitly deferred by Seif.
3. A live walkthrough with the real catalog (desktop menu, mobile panel,
   category links, an invalid ID, backend off) once the backend runs; the tests
   check markup only.

---

# Round 2 (2026-10-09)

Reviewed `git diff 67b79c6 823c7eb` plus the response commit `7034b11` and
`docs/storefront-categories-review-response.md`. Same method as round 1: a
throwaway worktree of `7034b11` (removed) with this checkout's `node_modules`
linked, i.e. the repo's real layout, no `NODE_PATH` workaround.

## Verdict

**Approved.** F1, F2, F3 and F6 are fixed; F4 and F5 are accepted as recorded
limits. No new blocking findings.

## Results

| Check | Result |
|---|---|
| Storefront Jest, `--runInBand` | **10 suites, 142 tests, all passed** (round 1: 7 failed). |
| `tsc --noEmit` | Exit 0. |
| ESLint on `src` | 0 errors, 19 warnings (existing code), matches the response. |
| Full `npm run check`, build, live walkthrough | Not run. |

## Findings, one by one

- **F1 fixed.** `jest.config.cjs` maps `react`, `react-dom` and their subpaths to
  the storefront copy, and the previously failing `category-ui` tests pass with
  real Lucide icons. Nothing outside tests changed.
- **F2 fixed.** `app/shop/page.tsx` swallows a directory failure only when
  neither `category_id` nor `category` is present (the shop then renders with an
  empty sidebar). A scoped request still rethrows, so it never falls back to all
  products. Both cases have tests.
- **F3 fixed.** The footer renders live categories from the provider. Product
  pages link with `categoryHref(product.categoryId)`, falling back to
  `/categories`. `categoryId` comes only from `categories[0].id` in the mapper;
  tests confirm it is never derived from metadata or product type. Old
  `?category=<Name>` URLs are resolved on the server to exactly one public
  category ID; unknown, empty, array or ambiguous (duplicate-name) values give
  not-found, never the unfiltered shop. The client-side name filter and its state
  are removed from `ShopClient`. `category_id` wins if both are present. The
  `Footer` is inside `Providers` in `layout.tsx`, so `useCategories` is
  available there.
- **F4, F5** remain as noted limits for a small catalog.
- **F6 fixed** (handoff corrected, per the response).

## Notes, none blocking

- The footer now lists every public category, children included, with no
  Arabic labels (the old four links had `data-arabic-text`). Fine for a small
  catalog; revisit once the real category count is known.
- An old bookmark such as `/shop?category=Protein` now returns not-found if two
  public categories share that name. Acceptable by design; mentioned so it is
  not a surprise.
- `jest.config.cjs` now requires `react` and `react-dom` to exist under
  `apps/storefront/node_modules`. True today (React 19 is a direct storefront
  dependency); if npm ever hoists them, the mapper path must change.

## Before Seif merges

1. Run the normal full `npm run check` (not green-verified by either of us).
2. Live walkthrough with the backend running: desktop menu, mobile panel,
   category links, an old `?category=` link, an invalid ID, backend off.
3. Seif decides about merging; I changed no code and merged nothing.
