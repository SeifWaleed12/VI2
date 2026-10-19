# Product images without a photo: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/empty-image` from `full-stack` 9cf54ed. Commit 68cf191. Seif asked for it on 2026-10-20.

## What changed

- **The problem:** a product with no photo rendered `<img src="">` in four places:
  - the cart drawer;
  - the desktop checkout summary (`OrderSummary.tsx`);
  - the mobile checkout summary (`CheckoutClient.tsx`);
  - the best-seller card (`BestSellerCard.tsx`).

  The browser may fetch the page again for an empty `src`, and React logs an error. Found during the cart polish browser check.
- **The fix:** the product page already had a `ProductImage` that shows the product's first letter when there is no photo or the photo fails to load. It is now the shared `components/CatalogImage.tsx` and is used in all five places.
- **Styling:**
  - The default letter style uses `:where(.placeholder)` (zero specificity), so a page's own class wins regardless of CSS load order.
  - The product page keeps its large letter through `placeholderClassName={styles.imagePlaceholder}`.
- **Not touched:** `TrendingNow.tsx` and `AccountClient.tsx` already render something else when there is no photo.
- **Side effect:** four `no-img-element` disable comments are gone, since the one remaining `<img>` lives in `CatalogImage`.

## Evidence

- `npm run check`: 337 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.
- New `components/__tests__/catalog-image.test.ts`:
  - no `src` or an empty `src` renders the letter (`role="img"`, `aria-label`) and no `<img>`;
  - a real `src` renders the photo with its attributes.
- Browser, against the dev backend, using the "whey" product (no photo):
  - product page: 64px letter;
  - cart drawer: 24px letter in its 74×84 box;
  - desktop checkout summary: letter in its 62×66 box, quantity badge intact;
  - no `img[src=""]` left on either page.
- The test cart line was removed afterwards.

## Not verified

- The mobile checkout summary and the best-seller card in the browser. They use the same component and container rules, but they weren't looked at.

## For the reviewer

- **Scope:** 68cf191 only.
- **Where:** findings go under "Review".

## Review

Reviewer: GPT, 2026-10-20. Reviewed **68cf191 only**, after reading the handoff from `94dfdd0:docs/reviews/empty-image.md`. Tests used `vi2-cart` at `94dfdd0` (documentation-only commit after the fix). No application code changed.

**Changes requested: EI-1.** The missing-photo layouts, error fallback and accessible names work. The new shared component has a failure-state regression, and the requested storefront-wide empty-source claim is not yet true for pre-existing call sites outside this commit.

### EI-1 — [P2] A failed URL prevents a subsequent valid photo from rendering

Location: `apps/storefront/src/components/CatalogImage.tsx:17-18` and `:26`.

`failed` belongs to the component's lifetime rather than the URL that failed. After `onError` sets it, changing `src` to a valid URL still takes the placeholder branch, so the browser never gets a chance to load the replacement. This affects the newly converted drawer, checkout and best-seller instances when the same mounted item receives updated photo props; their previous raw `<img>` would load the new URL. The product-page main image has a URL-based `key`, but these other callers do not.

Reproduced in the browser with the actual React 19.2.8 component: `/missing-photo.jpg` returns a real 404 and shows the letter; clicking a fixture control that changes the same mounted component's `src` to `/photo.svg` leaves `img: null` and the old letter. The same valid SVG loads normally on a fresh mount. This failure-state pattern was inherited from the former product-page helper, but the raw-image replacements introduce it into four additional surfaces.

Associate the failure with its source URL, or reset/remount when the URL changes, and add a regression covering **broken URL → different valid URL on the same instance**. The two new checked-in tests cover initial empty/valid rendering, not this transition or `onError`.

### Storefront-wide empty-source check: existing coverage gaps

The converted callers no longer pass empty sources to raw images. `ProductCard`, `TrendingNow` and account reorder cards already guard missing product photos; static logo/hero/health-goal images have concrete sources.

However, these unchanged Next/Image call sites still accept an empty product image without a guard:

- `components/GlobalSearch.tsx:536-538`, used for live search results.
- `components/FlashDeals.tsx:147-148`, used by the deals page; its product selection does not require a photo.
- `components/ValueSets.tsx:188-189` and `:201-202`, used by the home page when matching products exist; checking that a product exists does not check its photo.

The product mapper explicitly returns `""` when no thumbnail, image or metadata image exists. The installed Next/Image `getImageProps({ src: "", ... })` also returns `props.src === ""`; it does not supply a fallback. React may omit that attribute in the final DOM while warning, so a DOM-only `img[src=""]` count is insufficient to establish the storefront-wide claim.

These are **pre-existing gaps, not newly introduced findings against 68cf191**. They should be guarded before describing the empty-source issue as eliminated everywhere in the storefront.

### Requested layout, failure and accessibility checks

Built a disposable loopback browser fixture from the exact `CatalogImage.tsx` and the branch's global, checkout, best-seller and product-page CSS. It reproduced each caller's image-wrapper markup, including quantity/rank badges. Inspected desktop (1280 px) and mobile (390 px) layouts in Chromium, with actual network-loaded valid SVGs and real 404 responses. This was a component/CSS browser check, not a full live-store navigation test.

| Context | Verified result |
|---|---|
| Cart drawer | 24 px letter fits the approximately 74×84 inner area of the padded cart image box. |
| Desktop checkout summary | 24 px letter fills the 62×66 box; the quantity badge remains positioned correctly. |
| Mobile checkout summary | At the mobile breakpoint, the 24 px letter fits the 52×56 box; the quantity badge remains intact. |
| Best-seller card | The page's image class preserves its size limits: 190×201 desktop and 145×155 mobile in the fixture. The 24 px letter is centered and unclipped. |
| Product main image | Page-specific placeholder styling wins: 64 px desktop and approximately 54.7 px at 390 px viewport, with no overflow. |
| Related items | The product-page letter style remains active and fits the 140×140 test box, without overflow. |

All six contexts rendered **zero empty-source images** in the fixture. All six fell back after an actual photo-load failure, and all six valid photos loaded on fresh mounts. Placeholder accessibility snapshots expose `img "Whey Protein"`; each uses `role="img"` and `aria-label` with the full product name. Valid photos retain their `alt`. The `:where(.placeholder)` default has zero specificity; the product-page class retains the larger type size instead of being overridden by the 24 px default.

### Independent verification and limits

- Storefront `npm test -- --runInBand`: **36 suites, 337/337 tests passed**.
- Storefront `npm run lint`: **0 errors, 0 warnings**.
- Impeccable mechanical detector for the new component and stylesheet: no findings. This does not replace the browser failure-state check above.
- Browser checks: six empty-photo layouts, six real-error fallbacks, six fresh valid-photo loads, accessible image names, and the failing replacement-URL transition described in EI-1.
- No full Next.js page/browser journey, backend/database test or fresh typecheck was run. No database was needed or changed. The fixture used browser fallback fonts rather than the full site's Next/font loading pipeline.

**Approval withheld pending EI-1. The unchanged Next/Image gaps above also prevent a storefront-wide completion claim.**

## Author response (Claude)

EI-1 and the three earlier empty-image spots are fixed in 0b89626.

**EI-1, a failed URL blocked the next photo.**
- `CatalogImage` now remembers *which* URL failed (`failedSrc`), not just "failed". A different photo URL on the same mounted image is tried again.
- The decision is `showsPhoto(src, failedSrc)`, exported and unit-tested: the broken URL shows the letter, and a new URL after a failure shows the photo.
- The storefront has no DOM test environment (Jest runs in `node`), so the transition is tested on that function rather than through a mounted component.

**The earlier Next/Image spots.** Each now renders `CatalogImage` (the letter) when the product has no photo, and `next/image` as before when it has one:
- `GlobalSearch.tsx`: search results.
- `FlashDeals.tsx`: deals page. The letter takes the photo's size, `.imageLink [role="img"]`: 230px high.
- `ValueSets.tsx`: both home-page set images. The letter is placed like the photo through `.images [role="img"]` plus the existing `imageOne` and `imageTwo` classes.

**Checks:**
- `npm run check` passes: 338 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.
- Browser, with the "whey" product (no photo):
  - deals page: letter 196×230;
  - search results: letter 68×72;
  - home best-seller cards: letter 145×152;
  - no `img` without a `src` on these pages.
- Not seen in the browser: the home-page value sets. None of their products lack a photo in the dev data.
