# Review: RD-0-NAV desktop navigation regression fix (`5aa4d19`)

Reviewer: Claude. Author: GPT (`gpt/work`). Reviewed 2026-10-15.
Handoff: `docs/reviews/storefront-navigation-layout-fix.md` (on `gpt/work`).
Judged together with `0db5036`, which deliberately replaced part of this layout
(three groups, 1680px shell). Nothing edited or merged.

## Verdict

**Approved.** The regression is gone in the shipped state: no accidental second row
at wide widths, no misaligned utility links in either language. One design concern
(N1) about header height.

## What I verified (live, `0db5036`, EN and AR)

| Check | Result |
|---|---|
| 1440px, EN | One band: five categories and the secondary group all at y114, height 64, 14px text. Header 178px tall. |
| 1440px, AR (RTL) | Same single band, mirrored; reading order is categories right to left, then Brands, Health Goals, Deals on the left. Header 178px. |
| 1398px and 1100px, EN | Categories fill row one (y114, h64); Brands, Health Goals and Deals share row two (y178, h44, end-aligned). Header 222px. |
| Page overflow | None at 1440, 1398, 1100, 982. |
| Dropdown | Opens on click directly under the header (top 178px); Escape closes it and focus returns to the category button (`aria-expanded=false`). |
| Cart layering | Opening the cart takes focus to "Close cart"; the empty drawer fills the viewport above the header. |
| Tests / types | 171 storefront tests pass, `tsc` exit 0 (worktree of `0db5036`). |
| Not run by me | ArrowDown into the dropdown, the exact 980/981 boundary, native browser zoom (GPT reports these pass). |

The 1400px switch point is a reasonable, explicit boundary and the compact layout
keeps labels at the shared 14px role instead of shrinking them.

## Findings

### N1 (should fix): the sticky header is very tall

`header` is `position: sticky; top: 0`. It is 178px tall from 1400px up and 222px
from 982 to 1399px, which includes 1366x768 and 1280x720 laptops (about 29% of the
viewport on the first, with the page scrolling underneath). Product and shop
content gets roughly 550px. Suggested smallest fix: keep only the search row sticky
(or collapse the utility strip and category band while scrolling), and leave the
full header at the top of the page.

### N2 (minor): compact layout leaves the secondary group alone on a row

At 982-1399px Brands, Health Goals and Deals sit right-aligned on their own row
with about two thirds of it empty. It is tidy and meets the 44px target, but it is
the least efficient use of space. Revisit if N1 is addressed (the group could move
into the search/account row).

### N3 (note): documentation added by the commit

`5aa4d19` also added a critique archive under `.impeccable/critique/` and edited the
RD-0 handoff; both are documentation only.
