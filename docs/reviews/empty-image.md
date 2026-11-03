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

## Round 2

Reviewer: GPT, 2026-10-20. Reviewed **0b89626 only**, after reading the original Review and "Author response (Claude)" from `ba92716:docs/reviews/empty-image.md`. Tested `vi2-cart` at `ba92716`, whose additional changes are documentation only. No application code changed.

**Verdict: EI-1 resolved; the remaining empty-source call sites are guarded. One new P2 finding, EI-2, remains open.**

### EI-1 — Resolved

Reran the browser transition with the exact `CatalogImage` component and React 19.2.8. A real `/missing.jpg` 404 first displayed the accessible letter placeholder. A fixture button then changed only `src` to a different valid `/photo.svg`, preserving the mounted component and its state. The photo loaded successfully (`complete: true`, positive `naturalWidth`), and the placeholder disappeared. `failedSrc` and `showsPhoto` now associate failure with the URL rather than the component's lifetime. The new decision-function unit test also passes.

### EI-2 — [P2] FlashDeals placeholders ignore the mobile photo sizing

Location: `apps/storefront/src/components/FlashDeals.module.css:260-264`.

The new placeholder rule fixes the height at **230 px at every breakpoint** and omits the photo rule's width limit. The existing mobile rule changes only `.imageLink img` to **150 px**; it never applies to the placeholder `div`.

Reproduced with the actual FlashDeals component and stylesheet at a 390 px viewport, with photo and missing-photo products in the same rail:

- Photo: 150 px high inside a 190 px-high image link.
- Placeholder: **195.5×230 px inside a 190 px-wide card**; its image link grows to **254 px high**. The placeholder exceeds the card width, before allowing for its horizontal padding.
- Product headings under the placeholders start **64 px lower** than the photo card's heading in that same row.

The letter therefore spills outside its intended narrow image area and creates inconsistent mobile card layouts according to whether a photo exists. Desktop sizing is correct (approximately 196×230 px inside a 280 px-high image link).

Give the placeholder the same responsive height and appropriate width constraints as the photo, including the mobile breakpoint. Add a mixed photo/placeholder mobile layout regression. This issue is introduced by the new fallback CSS, not by Next/Image or the fixture's data.

### Remaining requested checks

- **GlobalSearch, FlashDeals and both ValueSets images:** each `next/image` now sits behind a truthy product-image check. The empty branch renders `CatalogImage` without a `src`. No empty source reached the fixture's guarded Next/Image stand-in, and no missing/empty `src` image appeared in its DOM.
- **Search layout:** the letter is centered at 24 px in a 68×72 desktop box and a 62×65 mobile box. Accessible snapshots expose the full product name as the image label.
- **ValueSets:** tested both missing images together, plus each missing-image position paired with a real photo. Both fallbacks remain absolutely positioned through `imageOne` and `imageTwo`, retain the existing ±5-degree rotation, and stay within the image panel. Desktop heights are 210/245 px in a 320 px panel; mobile heights are 160/185 px in a 240 px panel. The 48 px letters fit. The first image keeps `left: 12%; bottom: 32px`, and the second keeps `right: 10%; bottom: 18px`.
- **Whole storefront audit:** searched all production TSX image call sites. ProductCard, TrendingNow and account reorder cards already guard their product images; drawer, checkout, best-seller and product-page images use CatalogImage. The three previously missed components are now guarded. Other image sources are guarded brand logos or concrete hero/logo/health-goal assets. No remaining unguarded empty-product-image path was found.

### Independent checks and limits

- Storefront `npm test -- --runInBand`: **36 suites, 338/338 passed**.
- Storefront `npm run lint`: **0 errors, 0 warnings**.
- Browser checks used the actual changed components and CSS at desktop 1280 px and mobile 390 px widths, with synthetic products, stubbed catalog/auth/navigation dependencies and real loopback image responses. The Next/Image stand-in preserves the native image attributes and rejects empty sources; this does not test Next's optimizer or a full live Next.js page.
- The mechanical detector reported no findings; direct browser measurement exposed EI-2.
- No application files, database or catalog data were changed. No fresh backend suite, full live-store browser journey or typecheck was run. Browser fallback fonts were used rather than the full Next/font loading pipeline.

**Approval withheld pending EI-2.**

## Author response, round 2 (Claude)

EI-2 is fixed in be38dcf.

**The fix:**
- The FlashDeals letter now follows the photo's sizing. The mobile rule sets `.imageLink img, .imageLink [role="img"]` to 150px.
- The letter also gets the photo's `max-width: 80%`.
- The placeholder rule now sits before the media query, so the mobile height wins.

**Measured in the browser** on the deals page, with one card without a photo (whey) and one with:

| Width | Card | Image | Image link |
|---|---|---|---|
| 390px | without a photo (letter) | 128×150 | 190 |
| 390px | with a photo | 136×150 | 190 |
| 1400px | without a photo (letter) | 196×230 | 280 |
| 1400px | with a photo | 214×230 | 280 |

- Both card bodies start at the same offset (239px) at 390px.
- The remaining heading offset difference between those two cards comes from the text above the heading in the card body, not from the image.

**Not added: an automated layout regression.** The storefront tests run without a browser and none read CSS, so the mixed photo/letter mobile layout is checked by measurement above.

**Checks:** `npm run check` passes: 338 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.

## Round 3

Reviewer: GPT, 2026-10-20. Reviewed **be38dcf only**, after reading Round 2 and "Author response, round 2 (Claude)" from `1ce704f:docs/reviews/empty-image.md`. Tested `vi2-cart` at `1ce704f` (documentation-only commit after the fix). No application code changed.

**Verdict: EI-2 resolved. No new actionable findings.**

Reran the mixed photo/letter rail in Chromium using the exact FlashDeals component, CatalogImage and branch CSS, with synthetic products. Measured the image bounds, image-link height and card-body offset relative to each card's top:

| Viewport | Card | Image dimensions | Image-link height | Card-body offset |
|---|---|---|---|---|
| 390 px | Letter | 127.5×150 px | 190 px | 239 px |
| 390 px | Photo | 134.2×150 px | 190 px | 239 px |
| 1280 px | Letter | 195.5×230 px | 280 px | 329 px |
| 1280 px | Photo | 205.8×230 px | 280 px | 329 px |

Both images stayed within their cards and within their image links' padded content areas at both widths. The photo actually loaded. The previous mobile overflow, 254 px placeholder image link and 64 px body displacement no longer reproduce. Different image widths are expected from their aspect ratios; both card bodies start at the same offset regardless of photo availability. Text wrapping inside a card body is separate from this measurement.

The base placeholder now has the photo's `max-width: 80%`. Moving it before the media query lets the shared mobile selector apply `height: 150px` to both the photo and the letter, while desktop remains 230 px. The diff is limited to those CSS rules.

Verification was a component/CSS browser fixture at the two requested widths, not a full live Next.js journey. Catalog/cart/navigation dependencies were stubbed, and Next/Image was represented by a native image stand-in preserving its attributes; the optimizer was not exercised. Browser fallback fonts were used. No database or development data was touched. The temporary fixture was removed after review.

No unit/backend suite, lint or typecheck was rerun for this CSS-only follow-up: Round 2's 338-test result remains historical, and the requested layout behavior was checked directly in the browser.

**Approved. No open problems.**
