# Recheck: review fixes `adba911` and candidate `43a7b97`

Reviewer: Claude. Author: GPT (`gpt/work`). Rechecked 2026-10-15.
Author response: `docs/reviews/storefront-review-fixes.md`. `f97d08c` only merges the
already-approved RD-1 baseline (`a68cbd1`); I did not re-review backend code, and
the incoming docs and backend files were not read line by line.
No implementation edited, nothing merged.

## Verdict

**Approved: all seven findings (F1, F2, F3, T1, T2, T3, N1) are fixed in both
English and Arabic.** Two minor leftovers, neither blocking.

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `43a7b97` (sparse worktree, removed) | 18 suites, **186 tests pass**. |
| `tsc --noEmit` | Exit 0. |
| Live pages, `localhost:3001` | EN and AR at 320, 390, 982, 1024, 1100, 1280 and 1440 px, mobile menu, sticky behaviour, dropdown anchoring. |
| Not run by me | Lint, production build, root `npm run check` (GPT reports 186 storefront + 199 backend tests, lint, both type checks and a build pass), native browser zoom, signed-in and populated-cart states. |

## Finding by finding

| # | Finding | Result | Evidence |
|---|---|---|---|
| F1 | Mobile editorial headings too loose | **Fixed** | 390px EN: line-height 0.90; "EXPLORE PRODUCTS" 98px (was 158), "START WITH WHAT YOU NEED" 148px (was 237). AR: 1.20, headings 29px or 58px for two lines. No page overflow at 390 or 320. |
| F2 | Bottom nav truncated "Account" | **Fixed** | 12px labels with `clip` instead of ellipsis. EN "Account" scrollWidth 50 = clientWidth 50, all five labels fit at 390 and 320. AR labels (الرئيسية, المتجر, بحث, الحساب, السلة) fit at both widths. |
| F3 | "VIEW ALL" wrapped | **Fixed** | Three collection links `white-space: nowrap`, single line (about 30px high) in EN and AR at 320 and 390. |
| T1 | Hero statement overprints neighbour | **Fixed** | EN and AR at 982, 1024, 1100: statement fits its box (EN 720/720, AR 577/577) and the decorative footer line is hidden. At 1280 and 1440 the footer line is shown with no overlap (boxes do not intersect). Text stays 16px. |
| T2 | Hidden `<br>` glued words | **Fixed** | Statement is now one localized string with real spaces: "PREMIUM SUPPLEMENTS FOR A STRONGER, HEALTHIER YOU." and "...عالية الجودة لصحة أفضل وقوة أكبر." |
| T3 | Mobile menu under bottom nav | **Fixed** | With the menu open the bottom nav is absent from the DOM in EN and AR; the drawer scrolls to the viewport bottom (844px) and every item is reachable. |
| N1 | Whole 178-222px header sticky | **Fixed** | 1100x768 scrolled 672px: only the search/account/cart row is pinned (73px tall, `sticky; top: 0`), in EN and AR; the announcement and category rows scroll away. |

## Remaining findings (minor)

### R1: an open category menu detaches from its trigger when you scroll

After N1 the category band scrolls away but the open dropdown does not close. At
1440px I opened Vitamins at scrollY 60 (menu top 118 = button bottom 118, correct),
then scrolled to 400: the menu stayed open at top 73 under the pinned search row
while its button was 222px above the viewport. It is dismissible with Escape or the
backdrop, so this is cosmetic, but it looks orphaned. Smallest fix: close the menu
when the band scrolls out of view (or on any scroll past the band).

### R2: landmarks after the header split

The announcement/language strip and the category `<nav>` are now outside the
`<header>` banner, and the two desktop `<nav>` landmarks have no accessible name
(the mobile one is named). Screen-reader landmark lists will show several unlabeled
navigations and loose controls (language, currency). Fix: give the desktop category
and secondary navs an `aria-label` (for example "Main categories", "Shop by"), and
wrap the utility strip in a labeled region or keep it inside the banner.

## Carried forward (unchanged, as GPT states)

Shop and product pages still contain 5-10px text for RD-3/RD-4, announcement copy
for RD-2, and the existing untranslated "Forgot password?" and English first paint on
`/ar`. The compact secondary row (N2) scrolls away with the band; accepted.
Categories are not reachable from the pinned bar while scrolled, so a visitor must
scroll up or use search; that follows the requested trade-off, but is worth a look
once RD-2 reworks the header.

## Merge note for Seif

UI fixes sit only on `gpt/work` (not in `full-stack`). The fix commits are clean
to merge; `f97d08c` already brings the approved RD-1 baseline into the same branch,
so the backend diff against `full-stack` should be empty (GPT reports this).
