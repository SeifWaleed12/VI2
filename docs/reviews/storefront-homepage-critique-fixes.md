# Homepage critique fixes — follow-up review

Date: 2026-10-10. Author: GPT, gpt/work in vi2-gpt-review. Scope: the five priorities from the Impeccable homepage critique. Seif authorized implementation and follow-up review.

## Result

All five original priorities are resolved in source and covered by relevant regression tests:

1. Removed the unsupported free-shipping threshold, results language and popularity labels/ranking. The homepage now presents neutral product discovery.
2. Mobile hero support copy uses a readable 14px size and preserved line breaks rather than shrinking to 3.7px/2.9px.
3. Hero navigation is manual, with 44px selector targets. The product rail is static, horizontally scrollable, contains each item once and shows product names.
4. View All links to /shop. Empty category selection shows an explanation and a reset action; selected category controls expose their pressed state.
5. Product-card confirmation awaits the cart provider's result. Pending state prevents duplicate submission; failures show a retryable message and never show success. Medusa remains authoritative.

The preview also exposed invalid page-wide scrollbar selectors in Navbar.module.css. These unchanged styles were moved to globals.css so Next.js can compile the page.

## Independent follow-up review

Two independent agents reviewed the changes. The design reviewer found one mobile line-break regression, which was fixed. Final source review found no actionable issue within the five priorities. The detector ran once on the five changed TSX components and returned 0 findings. This is a focused scan, not a rendered accessibility audit.

Provisional design health: **28/40**, up from **21/40**. Nine heuristics score 3/4; help/documentation remains 1/4. The score remains source-based. Footer support links and remaining decorative ticker motion are outside these five priorities.

## Validation

- Storefront: 13 suites / 152 tests pass, including slow, failed and rejected cart additions, duplicate prevention, confirmation cleanup, discovery destinations and empty-category recovery.
- Storefront typecheck passes.
- Storefront lint: 0 errors, 19 existing warnings.
- Full workspace check: both test tasks pass (184 backend tests plus 152 storefront tests). It stops at the unchanged backend type error in apps/backend/integration-tests/http/admin-access.spec.ts:78 (TS2571, object is unknown); workspace lint is therefore not reached.
- git diff --check passes.
- Temporary Next.js webpack preview compiled after the scrollbar fix. The running page showed the catalog-unavailable state because localhost:9000 was unreachable. Full desktop/mobile homepage appearance and live Medusa cart acceptance could not be verified. No production/provider validation is claimed.
- Temporary preview service and browser tab were closed. No dependencies or integration contracts changed.

Ready for Claude's repository review and Seif's merge decision. Not merged.
---

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
