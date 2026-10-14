# Review: navigation simplification (`0db5036`)

Reviewer: Claude. Author: GPT (`gpt/work`, base `5aa4d19`). Reviewed 2026-10-15.
Handoff: `docs/reviews/storefront-navigation-simplification.md` (on `gpt/work`).
Nothing edited or merged.

## Verdict

**Approved.** The change does what Seif asked (New, Bundles and Shop Products gone),
cleanly, with tests. Two notes.

## What I verified

- **Desktop, EN and AR, 1440px:** the header has exactly eight destinations: five
  catalog categories plus Brands, Health Goals and Deals. No New, Bundles or Shop
  Products anywhere in the header.
- **Mobile drawer, EN, 390px:** Categories (five, each with a drill-in arrow), then
  "Shop by": Brands, Health Goals, Deals. Account, orders, rewards, language/currency
  and Sign in sit below; I scrolled to the end and every item clears the bottom bar.
- **Category dropdown:** the old promotional sidebar and its duplicate Deals link are
  gone. Vitamins & Minerals shows the title, "Shop all", and eight real child links
  (nine destinations), 14px, panel 220px tall, anchored at the header bottom.
  Escape closes it and returns focus.
- **Code:** three desktop and two mobile shortcuts removed with their now-unused
  imports; no leftover `categoryPromos`, `bundleLink` or sidebar CSS found. New
  rendered tests cover both locales (three secondary links, no removed shortcuts,
  category ID links kept). 171 storefront tests pass; `tsc` exit 0 (worktree of
  `0db5036`).
- **Arabic order:** RTL reading order follows the logical order (Deals at the far
  left end).

## Notes (non-blocking)

1. **No direct link to the full product list in the header on desktop.** The only
   routes to `/shop` are the per-category "Shop all", the bottom nav on mobile, the
   home "View all" and the footer. That follows Seif's request; confirm it is
   intended, since a first-time desktop visitor can no longer reach "all products"
   in one click from the header.
2. **Unused dictionary keys** (`nav.new`, `nav.bundles`, the old `nav.shop` copy) were
   kept on purpose to avoid translation churn; remove them in a later cleanup.
3. The header height concern (N1) is in `storefront-navigation-layout-review.md`.
   The announcement strip copy is still the RD-2 wording.

## Not verified

Native browser zoom, populated cart, signed-in state, arbitrary category counts.
