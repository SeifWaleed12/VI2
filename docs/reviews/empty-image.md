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
