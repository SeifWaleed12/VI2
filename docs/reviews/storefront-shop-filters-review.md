# Review: RD-3 shop layout and native catalog filters (`0d8dd3a`)

Reviewer: Claude. Author: GPT (`gpt/work`, baseline `707c1ab`). Reviewed 2026-10-17.
Author handoff: `docs/reviews/storefront-shop-filters.md` (on `gpt/work`).
Nothing edited or merged; my checkout (`claude/redis-dev`) is untouched.

## Verdict

**Changes requested: 2 should-fix items (S1, S2) and 1 recommended (S3); 3 minor notes.**
The core is sound: one bounded Medusa page with the real total, server-side
filtering, canonical category URLs with correct redirects and 404s, clean EN/AR
layouts and a well-behaved mobile sheet. S1 is a user-facing regression that
should be fixed before merge; S2 breaks keyboard use of the desktop filters.

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `0d8dd3a` (sparse worktree, removed) | 30 suites, **262 tests pass** (matches GPT). |
| `tsc --noEmit` | Exit 0. |
| Live `localhost:3001` against GPT's backend on 9001 | EN and AR at 1440 and 390 px; HTTP checks of 20 URL shapes; real keyboard and mouse on the desktop filters and the mobile sheet. |
| Not run | Lint and the build (GPT reports 0 errors, 15 warnings and a pass), physical devices, native zoom, signed-in states. |
| Not verifiable live | Backend outage and retry (the 9001 backend is GPT's shared preview, so I did not stop it); pagination with several pages (the database has one product and every brand matches zero). These rest on GPT's tests and live run. |

## What I verified

- **Server filtering and URL contract (curl, EN and AR).** `/shop/<handle>` 200; unknown handle 404; `/categories`, `/en/categories`, `/ar/categories` 404. Legacy links redirect once with 308 to the canonical handle: `?category_id=<id>` and `?category=<name>` to `/shop/vitamins-minerals`, with unrelated parameters kept (`q`, `utm`, `brand_id`) and the locale kept (`/ar/...`). `?brand=<name>` redirects to `?brand_id=<id>`. A handle plus a different `category_id` shows the invalid-filter state; repeated or malformed values, unknown brand IDs, a 201-character search and any of the removed parameters (`goal`, `form`, `diet`, `allergen`, `rating`, `sort`, `availability`) show the invalid-filter state; `page=0` is invalid; a huge page number gives the past-end state. `/shop` redirects to the locale first.
- **Pagination.** 24 products per request, the real count and offset in the status line; `page=2` shows "1 product" with "There are no products on this page" and links back to the first page. Page links keep other parameters and point at the results section.
- **Layout, EN and AR, 1440px.** The sidebar and the search box start at the same top edge; in Arabic the sidebar is on the right. Body text 14-16px, page title 56px, Cairo in AR; no horizontal overflow.
- **Mobile, 390px, EN and AR.** A 48px "Filters" button; the sheet is a modal `dialog` named "Filters". Real Enter opens it with focus on "Close filters"; 80 Tabs (AR: 60) stay inside; selecting a brand changes only the draft (the URL stays the same until "Apply"); Apply navigates to `?utm=1&brand_id=...`, closes the sheet, unlocks scrolling, shows the removable chip and returns focus to "Filters"; Escape also returns focus to "Filters". Browser Back restores the previous state.
- **URL preservation.** Chip removal and "Clear all" keep unrelated parameters and drop `page`; the language switch from `/en/shop/sports-nutrition?q=whey&brand_id=...&utm=1` landed on `/ar/shop/sports-nutrition?q=whey&brand_id=...&utm=1` with the search box filled.
- **Entry points.** The header category menu, the footer, the brands page and the product page link to `/shop/<handle>`; brand cards link to `?brand_id=<id>`.

## Findings

### S1 (should fix): every "Health Goals" link now lands on the "filters unavailable" page

RD-3 removed the `goal` filter, but its entry points remain and still link to it:
- The mobile menu's Health Goals panel has eight links (all `/shop?goal=...`, for example "Immune & Seasonal Support" goes to `/en/shop?goal=Immune%20Support`; the Arabic panel has the same links), defined in `Navbar.tsx` near lines 347-360.
- The homepage "health goals" tile links to `/shop?goal=Muscle%20%26%20Recovery` (`HomeDiscovery.tsx:351`).

Each of these now shows "These filters are unavailable" (I confirmed the page for `?goal=...`). The invalid-state recovery link works, but the user clicked a menu item the store itself published. The goals are also hard-coded, not catalog data. Smallest fix: remove the Health Goals drill-in and the goal-tile links (or turn the tiles into plain content), in both languages, until goals exist in the catalog. Add a test that no rendered link carries a removed parameter.

### S2 (should fix): keyboard filtering on desktop drops focus and breaks arrow keys

The sidebar applies every change immediately (`onChange={navigate}`) and disables its whole `fieldset` while the transition is pending. I reproduced:
- Focus the "Big Ramy Labs" checkbox and press Space: the URL updates, but `document.activeElement` becomes `BODY`, so a keyboard user restarts from the top of the page.
- Open the category branches and press ArrowDown on "All products": the first press selects the next radio, navigates to `/en/shop/vitamins-minerals` and drops focus to `BODY`. Browsing the category radios with arrow keys is therefore impossible (every arrow press is a navigation).
(With the branches collapsed, which is the default, ArrowDown stayed put, so most people will not hit the second case unless they open a group.)
Fix: do not disable the fieldset during the transition (use `aria-busy` on the results instead), and either restore focus to the same input after navigation or make the category list plain links (it is navigation, not a form), keeping radios and checkboxes only inside the sheet where Apply is explicit.

### S3 (recommended): no page title, canonical or robots for the new URLs

Every shop page, including `/shop/<handle>`, serves the site-wide title "Vi2 — Live Well, Live Fully" with no canonical link and no robots directive (checked in the HTML). With canonical category URLs, `?q=`, `?page=` and tracking-parameter variants will compete with each other, and the invalid-filter state is returned as HTTP 200, so crawlers see it as a real page. Add a per-page title (category name, search, page), a canonical pointing at the clean category URL, and `noindex` for the invalid, search-result and past-end states. An unknown handle already returns 404, which is correct.

### S4 (minor): 308 for name-based legacy links

`?category=<name>` and `?brand=<name>` are redirected permanently (308), which browsers cache indefinitely. IDs are stable, names are not; use 307 for name matches and keep 308 for IDs.

### S5 (minor): duplicate live regions on empty results

An empty search announces "0 products" in one status region and again in the empty-state panel (`role="status"` twice). Keep one.

### S6 (note): items GPT lists as limits are accurate

One published product, so category/brand results and the empty and past-end states are what I could see live; a populated multi-page result and a real outage were not exercised by me. Please run both once on a seeded catalog before release (RD-6).

## Not verified

Backend outage and retry on the live page, multi-page navigation with real products, physical devices, native zoom, signed-in states.

---

# Recheck of `ff05125` against `0d8dd3a` (2026-10-17)

GPT's response is the "Claude review response" section of
`docs/reviews/storefront-shop-filters.md` (on `gpt/work`). Nothing edited or merged;
my checkout (`claude/redis-dev`) untouched.

**Verdict: approved. S1-S5 are fixed. Two minor findings remain (R1, R2), and R1
should be settled before production.**

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `ff05125` (sparse worktree, removed) | 30 suites, **273 tests pass** (11 more than `0d8dd3a`). |
| `tsc --noEmit` | Exit 0. |
| Live `localhost:3001` (GPT's frontend, backend on 9001) | HTTP checks of redirects, titles, canonical and robots across 10 URL shapes; real keyboard on the desktop sidebar (1440) and the mobile sheet (390), EN and AR. |
| Not run | Lint and the build (GPT reports 0 errors, 15 warnings, build pass), physical devices, native zoom, a populated multi-page catalog, a live backend outage (still S6/RD-6). |

## Finding by finding

| # | Result | Evidence |
|---|---|---|
| S1 dead Health Goals links | **Fixed** | No `goal=` link in application source (`git grep`), and none in the rendered HTML of `/en`, `/ar`, `/en/shop`, `/en/brands`, `/en/deals` or a product page. The mobile menu's "Shop by" list is Brands, Health Goals, Deals (EN and AR); Health Goals is a plain link to `/en#health-goals` and `/ar#health-goals`, and that anchor exists on the home page. The drill-in with eight goal links is gone. The home tile's call to action is now "All products", linking to `/shop`. |
| S2 keyboard filtering | **Fixed** | The desktop sidebar now has 0 inputs and 45 links with `aria-current` on the selected ones; nothing is disabled. Enter on the "Big Ramy Labs" link updated the URL to `?utm=1&brand_id=...` and focus stayed on that same link. Radio/checkbox controls remain only inside the mobile sheet. |
| S3 metadata | **Fixed** | Titles, canonical and robots in the HTML: `/en/shop` "Shop \| Vi2", canonical `/en/shop`, `index, follow`; `/en/shop/vitamins-minerals` "Vitamins & Minerals \| Vi2", canonical to itself; with `?q=whey&utm=1`: title "... — Search: whey", canonical the clean category URL, `noindex, follow`; brand-filtered, search, page 2 and the invalid state are `noindex, follow`; the Arabic category page has an Arabic title. Unknown handle still 404. |
| S4 redirect codes | **Fixed** | ID links give 308 (`?category_id=...&utm=1` to `/shop/vitamins-minerals?utm=1`); name-based category and brand links give 307, including a mixed ID plus brand-name link and the Arabic category name. Unrelated parameters survive. |
| S5 duplicate live region | **Fixed** | One `role="status"` in the HTML on every page I checked, including the empty-result page. |
| Mobile sheet (regression check) | **Still correct** | 390px EN: Enter opens it, 70 Tabs stay inside, it holds 39 radios and 6 checkboxes, a selected brand changes only the draft; Apply navigates, closes the sheet, unlocks scrolling and returns focus to "Filters". |

## Remaining findings

### R1 (minor, settle before production): the canonical origin comes from request headers

`getShopMetadata` builds the canonical URL from the `Host` and `X-Forwarded-Proto`
headers. A request with `Host: evil.example` and `X-Forwarded-Proto: https` returned
`<link rel="canonical" href="https://evil.example/en/shop/vitamins-minerals">`.
Behind a CDN or any shared cache that ignores `Host`, one such request could poison
the cached HTML with a canonical (and `metadataBase`) pointing at another domain.
GPT chose not to invent a domain, which is fair; the fix is a configured site URL
(for example an environment variable set per deployment) used for `metadataBase`,
falling back to the request only in development. Add a test with a hostile `Host`.

### R2 (minor): focus after choosing a category by keyboard

A category link is a real page navigation, so after pressing Enter on "Vitamin C"
the new page loads with focus on the page body (I measured `BODY`). A keyboard user
must tab through the header and the 45 sidebar links again. Brand links keep focus
because the route does not change. Consider moving focus to the results heading
(or the sidebar's selected link) after a category change. Not a blocker.

### R3 (note): canonical on later pages

Page 2 and later (when they have products) are indexable but their canonical points
to page 1. That is allowed, but products that only appear on later pages then rely on
internal links; revisit with a real multi-page catalog (RD-6).

## Not verified

Live backend outage and retry, multi-page navigation with real products, physical
touch, native zoom, other browser engines and signed-in states.
