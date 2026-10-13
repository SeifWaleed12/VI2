# Review: RD-0 shared bilingual typography foundation

Reviewer: Claude. Author: GPT (`gpt/work`). Reviewed 2026-10-13.
Commits: `16899c0` (role migration, 29 files) and `8bf7e95` (shop title), with
GPT's handoff `docs/reviews/storefront-typography-foundation.md` and the updated
WORKBOARD row. Implementation code was not edited and nothing was merged.

## Method

Live pages on `http://localhost:3001` (GPT's candidate build, backend on 9000):
`/en` and `/ar` home, shop, sign-in, a product (`/en/products/whey`) and checkout.
Viewports 1440, 640, 390 and 320 CSS px (640 and 320 stand in for 200% and 400%
browser zoom; this is emulation, not native zoom). In each I measured computed
font size, family, line height, letter spacing, overflow and clipping, and looked
at screenshots. I also forced the root font size to 24px to test text scaling.
I did not run the Jest suite, lint or a build; GPT reports 169 storefront tests,
both type checks and lint pass.

## Verdict

**Approved as a foundation, with two should-fix items (F1, F2) and three minor
notes.** The role system works and the readable-text goal is met on the surfaces
it covers. F1 and F2 are regressions visible on English mobile.
Do not treat RD-0 as "typography done": shop and product pages still carry the
tiny text GPT deferred to RD-3/RD-4 (F4).

## What works

- Body text is 16px in both languages. Fonts resolve correctly: Inter and Bebas
  Neue in English, Cairo in Arabic (all 71 text nodes on `/ar` are Cairo).
- Arabic headings are weight 800 with normal letter spacing and a 1.2 line height;
  sign-in title 28px at 320 and 390. The old rule that forced every Arabic
  heading to a large size is gone, and section headings (24px) no longer fight
  the page title.
- Form fields are 16px at 320 (no mobile zoom-on-focus), 52px high, correct
  family per language.
- The type scale is rem-based: with the root font forced to 24px at 640px width,
  body, nav and headings scaled up and nothing overflowed or clipped.
- No horizontal page overflow at 1440, 640, 390 or 320 on home, shop, sign-in or
  checkout, English and Arabic.
- Home page and sign-in have no text under 12px at any width tested.
- No new console errors from this change. The existing ones (empty `src` for a
  catalog image, 401 on the guest session check) are unrelated.

## Findings

### F1 (should fix): English mobile section headings have a huge line gap

On 390px English, section headings use `font-size: var(--text-editorial-mobile)`
(54.6px Bebas Neue) with `line-height: var(--leading-ui)` (1.45), set in the
mobile rules of `globals.css`. Measured: line pitch 79px, so "EXPLORE PRODUCTS" is a
158px block and "START WITH WHAT YOU NEED." is 237px. The screenshot shows the
two words visibly detached. Desktop uses the display leading (0.9) and is fine.
Fix: use `--leading-display` in those mobile rules (it is already 0.9 English /
1.2 Arabic), or add a separate mobile display leading. Re-check `/ar`, where 1.2
is correct.

### F2 (should fix): mobile bottom navigation truncates "Account"

`MobileBottomNav` labels are now 14px in a 72px cell. At 390 English "Account"
measures scrollWidth 72 against clientWidth 68 and shows "ACCOU…" (ellipsis).
At 320 the five cells are narrower, so "Search" and "Account" are at risk too.
Arabic labels fit. Fix: caption size (`--text-caption`, 12px) for these labels, or
let the label wrap, or allow the cell to grow. Keep labels visible without
truncation at 320.

### F3 (minor): "VIEW ALL" wraps onto two lines on mobile

In the "Explore Products" header at 390 English, "VIEW ALL" breaks to two
lines beside its arrow. Add `white-space: nowrap` or let the heading column
yield space.

### F4 (known deferral, record for acceptance): tiny text remains on shop and product

As GPT states, these are left for RD-3/RD-4. Measured so the owner can see how
much remains:
- Shop, Arabic, 320: sort label 6px, filter button 8px, popular chips 8.5px,
  count 8px, eyebrow 9px, intro 10px; the search placeholder is cut off
  ("منتج، علامة تجارية، د").
- Product, English, 320: breadcrumbs 6px, "By" and variant labels 8px, "Package
  quantity" 7px, many 5.4-9px nodes.
The WORKBOARD row for RD-0 lists the shop and product pages in its audit, so make
sure RD-3 and RD-4 are not dropped. Header category alignment at 1440 (wrapped
"SUPPLEMENTS & BOTANICALS", uneven spacing) and the announcement copy belong to
RD-2 and are unchanged here.

### F5 (minor, outside RD-0, visible during review)

- On `/ar` the "Forgot password?" link is English and its "?" renders on the
  wrong side (a bidi punctuation issue). The link is simply missing from the
  translation dictionary.
- On `/ar`, the hero and sign-in first paint in English and swap to Arabic after
  hydration (legacy translation layer). Not caused by this change; worth tracking
  for the locale work.

### F6 (minor, confirm with Seif): label tracking was reduced everywhere

Uppercase English UI labels used 0.08-0.19em tracking; they now all use
`--tracking-ui` (0.04em). This is good for legibility at 12-14px, but it is a
visible change to the brand look of buttons, eyebrows and nav. Confirm it is
intended. Arabic correctly has no tracking.

### F7 (minor): target sizes

Desktop top-nav links are 22px high (just under the 24px WCAG 2.5.8 minimum; they
pass only through the spacing exemption). Mobile header icons are 40px and the
product-card add buttons 32px. Not a regression, but a good time to raise them
when RD-2 touches the header.

## Not verified

Native browser zoom and OS default-font-size settings, signed-in customer name
display, populated cart, desktop mega menu and search overlay typography,
checkout with items, large real catalog and long native Arabic product names.
