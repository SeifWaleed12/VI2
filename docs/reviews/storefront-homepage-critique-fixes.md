# Review: storefront homepage critique fixes

Reviewer: Claude. Author: GPT (`gpt/work`). Reviewed 2026-10-10.
Latest commit `6ab9652` only rewords one `docs/WORKBOARD.md` row (adds the commit
id). The change itself is `c25bebd` (19 files), which is what I reviewed, with
GPT's review note `docs/reviews/storefront-homepage-critique-fixes.md`.
No GPT code or folder edited; nothing merged.

## Verdict

**Approved to merge after two small should-fix items (F1, F2), or with them
recorded as follow-ups if Seif prefers.** No bugs found in the new code.

## Checks run (throwaway worktree of `c25bebd`, removed afterwards)

| Check | Result |
|---|---|
| Storefront Jest | 13 suites, 152 tests, all pass (matches GPT). |
| `tsc --noEmit` | Exit 0. |
| Lint, full `npm run check`, browser | Not run by me. GPT reports the full check stops at `admin-access.spec.ts:78` (backend type error, unchanged by this commit) and that the live page was not seen because the backend was down. No visual check by either of us. |

## What is good

- `useCartAdd` (`hooks/use-cart-add.ts`): a ref blocks double submits, the result
  comes from the provider, failure shows a retryable message and never "Added",
  the timer is cleared on unmount. `addItem` now returns `true` on success and
  `false` after its existing rollback; no behaviour of the cart itself changed.
- Hero autoplay removed, selectors 44px, product rail static with names and no
  duplicated items, empty category state with reset, `View all` is a real link,
  `aria-pressed` on tabs. All match the note.
- Invented claims removed from the ticker (free-shipping threshold, "real results").
- Moving the page-wide scrollbar rules from `Navbar.module.css` into
  `globals.css` is correct; `:global(html::...)` selectors were invalid in a module.

## Findings

### F1 (should fix): popularity claims remain elsewhere

The homepage section is now "SHOP PRODUCTS", but:
- `DesktopMegaMenu.tsx:287-297` still has a "BEST SELLERS" link to
  `/#best-sellers`, which now lands on a section with a different name.
- `/best-sellers` still exists and says "Products selected by the Vi2 team as
  best sellers" (`BestSellersClient.tsx:249,276`); `page.tsx` there redirects to
  `/#best-sellers`, so the client file may be dead code.
Rename the menu link to match the section (or "SHOP PRODUCTS"), and delete or
reword `BestSellersClient` if it is unused.

### F2 (should fix or defer): same silent-success problem on other add buttons

Only `BestSellerCard` uses the new hook. Other add-to-cart buttons still call
`addItem(...)` without awaiting the result: `ProductCard.tsx:133`,
`FlashDeals.tsx:167`, `ProductDetailClient.tsx:315`, `AccountClient.tsx:291`,
`ProductValueOffer.tsx:86`. They show nothing on failure beyond the drawer
opening (the provider opens the drawer before the request and rolls back after).
The critique's priority 5 said "product-card confirmation"; `ProductCard` is the
shared card used in the shop grid, so this deserves the same hook or an explicit
deferral on the workboard.

### F3 (minor): leftovers

- `BestSellerCard` still accepts a `rank` prop that nothing passes now; delete it
  and its styles if unused.
- `rankedProducts` in `HomeBestSellers.tsx` is now `initialProducts || []`
  wrapped in `useMemo`; it can be a plain constant.
- `HomeHeroSlider.module.css` and `TrendingNow.module.css` add overrides on
  top of the old rules (`!important`, `animation: none`) instead of deleting the
  dead marquee and 2.9px rules. Works, but the dead CSS (and the
  `productRail` keyframes) should go in a cleanup.
- Each card now renders its own `role="status"` region (empty most of the time).
  Fine for a small rail; a single region per rail would be lighter.
- The new top-bar copy ("ENGLISH & ARABIC", "EXPLORE THE COLLECTION") is
  filler, not a claim. Seif may want real messages.

## Not verified

Visual result on desktop and mobile, the static rail layout after the CSS
overrides, and a real add-to-cart against Medusa. Needs a walkthrough with the
backend running.
