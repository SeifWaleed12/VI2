# Review: promo codes, Buy now, bundles on Deals, EDA badge

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-24 after his manual test of PRs #17, #18 and #19.

Branch `claude/checkout-fixes`, on top of `claude/product-search` (#18 → #17). Review only the commits after `claude/product-search`.

## What Seif found

1. **Mobile checkout:** there was no promo code box.
2. **"Promotion applied!" with no discount, and sometimes "Cart not initialized".** Investigation:
   - Medusa works: VI20 took 500 → 400 EGP on a test cart.
   - VI20 targets one product. A real code that fits nothing in the cart gets 200 from Medusa without the promotion, and our checkout claimed success anyway. An unknown code is a 400.
   - "Cart not initialized" was our text when Apply was clicked before the cart had loaded.
   - "Buy now" applied the code to the normal cart but ordered from a separate new cart, so the discount was lost, and its totals came from the other cart.
3. **Bundles:** they only showed as normal products. `/deals` showed sale price lists only.
4. **EDA:** show only "EDA approved", never the registration number.

## Seif's decisions

| Question | Decision |
|---|---|
| Promo fixes | All three: mobile promo box, honest messages, Buy now keeps the code |
| Buy now | Becomes "add to cart and open checkout" |
| Bundles | A Bundles section on `/deals`, found automatically from inventory kits |
| What's inside a bundle | Staff write it in the description; no automatic list |
| EDA | The approved badge only; nothing when not approved; never the number |
| Design | impeccable and UI/UX Pro Max for the promo box |

## What changed

### Storefront

- **Honest promo results (`lib/medusa/services/cart.ts`):**
  - `promoOutcome(cart, code)`: applied only when the returned cart carries the code (case-insensitive), otherwise `not_applicable`.
  - `promoFailure(error)`: a 400 means `invalid`; anything else means `network`.
  - `cart-provider` `applyPromotion` returns these `PromoResult`s, and `loading` when there's no cart yet.
- **`checkout/PromoCode.tsx`:** one component, used in the desktop `OrderSummary` and directly under the mobile summary bar. On mobile it starts as an "Add promo code" button and stays visible without opening the summary.
  - **Field:** a visible label and an input with `aria-invalid` and `aria-describedby`.
  - **States:** Apply is disabled until a code is typed and the cart is ready. "Applying…" with `aria-busy`. Applied codes show as chips with Remove. Messages, success as a status and failure as an alert:
    - "This code doesn't apply to the items in your cart."
    - "This code isn't valid or has expired."
    - "We couldn't check this code. Try again."
    - "Loading your cart…"
  - **Styling:** in `Checkout.module.css`, from the checkout's own field and button styles. This replaces the old inline styles, the emoji and the bright green.
  - **Mobile totals:** now include the Discount line.
- **Buy now (`ProductDetailClient`):**
  - It adds the selected variant with `addItem(…, { quiet: true })` (no cart drawer), then opens `/checkout`. Add to cart calls `addItem` exactly as before.
  - `cart-provider` `addItem` gained the optional `{ quiet }`.
  - **Removed from `CheckoutClient`:** the `?buyNow=` handling (product fetch, quantity clamp, special items, the separate cart at placement, the recovery key and back link). Checkout always uses the one cart.
- **`/deals` page:** a Bundles section above "On sale". Each section is hidden when empty; "No deals right now" only when both are empty. A bundle on sale shows once, under Bundles. EN and AR headings.
- **EDA badge:** the product page's EDA row appears only for approved products, showing just the badge.

### Backend

- **`lib/deals.ts`:**
  - `kitProductIds(links)` (pure): a variant with more than one stock item, or `required_quantity > 1`, is a kit.
  - `bundleProductIds` reads `product_variant_inventory_item` (`shortcut:` comment on scale).
  - `GET /store/deals` returns `{ product_ids, bundle_ids }`.

### Other

- **UI/UX Pro Max** is installed for Claude: a copy of the local Codex copy at `~/.claude/skills/ui-ux-pro-max`. Nothing was downloaded.
- **Cleanup:** the 3 investigation carts were soft-deleted.

## Checks

- **Unit tests:**
  - promo outcome and failure;
  - `PromoCode` states (label, Apply disabled, loading note with `aria-describedby`, chip with Remove, mobile toggle, messages);
  - `kitProductIds`;
  - `getDeals` deals and bundles (a bundle on sale is read once);
  - deals page sections, hidden empty section and empty state;
  - EDA badge only, no number.
- **HTTP test on a real database (`merchandising.spec.ts`):** a kit built from two stock items is returned in `bundle_ids` and not in `product_ids`; 4/4 pass.
- **Counterfactuals:**
  - promo success without the "code attached?" check fails the not-applicable test;
  - treating every variant as a kit fails the bundle test.
- **`npm run check`:** 437 storefront and 241 backend tests, typecheck and lint 0.
- **impeccable detector** on the changed checkout and deals files: no findings.
- **Live on the reviewed baseline** (with PR #19 merged in), desktop and 375 px mobile:
  - Buy now on "whey" opens checkout with the item.
  - VI20 there shows "doesn't apply". "NOPE123" shows "isn't valid".
  - With "Wheyyyy Protein", VI20 shows the chip, "VI20 applied." and Discount −100 EGP (total 570), on desktop and in the mobile summary.
  - `/deals` lists the three kit products under Bundles.
  - The product page shows "EDA approved" without the number.
  - Found and fixed live: at a 1,024 px window the promo row overflowed the narrow summary (c0b7f18).

## Merge note with PR #19

GPT's #19 reshapes `ProductDetailClient.tsx`. Whichever merges second keeps #19's layout and re-applies two things:
- `addSelected(buyNow)` with `{ quiet: true }` for Buy now;
- the approved-only EDA row.

#19's `product-interactions.test.ts` expects the old Buy now link. In the combined baseline it now expects `addItem(…, 2, { quiet: true })` and `push("/checkout")` (baseline commit 4ffcf6a). The combined code passes 464 storefront and 241 backend tests.

## Please look closely at

- **`promoOutcome`:** a code with rules can attach and still give 0 (for example a minimum subtotal). We then say "applied", and the total shows no discount line.
- **Removing the `?buyNow=` checkout path:** old bookmarked links to `/checkout?buyNow=…` now open the normal cart checkout.
- **Kit detection by `required_quantity > 1`:** in Seif's local data, "Wheyyyy Protein"'s *chocolat* variant needs 10,000 of its own stock item. That looks like a data-entry mistake, and it makes the product count as a bundle.

## Review

**Scope:** implementation commits `a88ef53`, `d2e6ee8`, and `c0b7f18`, compared with `5ba9bd3` (the product-search review handoff/approval commit). I excluded the checkout-fixes handoff commit `acc96bd` and did not review earlier product-search or merchandising work.

### Findings

- **[P2] A promotion can be reported as applied without reducing the cart total.** In `apps/storefront/src/lib/medusa/services/cart.ts` (`promoOutcome`), success means only that Medusa returned the code in `cart.promotions`. A valid code can attach while its conditions (such as a minimum subtotal) are not yet met, leaving `discountTotal` at zero. `PromoCode` then displays “<code> applied” and a removable applied-code chip, although checkout gives the shopper no discount. Please distinguish an attached-but-not-currently-eligible code from an actual discount, or otherwise make the zero-discount outcome explicit; add coverage for an attached code with `discountTotal === 0`.

- **[P2] The new promo-code interface is English-only on Arabic checkout.** `apps/storefront/src/app/[locale]/checkout/PromoCode.tsx` hard-codes its field label, Apply/Remove/Add promo code controls, loading/success/error messages, and accessible labels. Since the component is used in both mobile and desktop checkout, Arabic shoppers encounter English throughout this new flow. Add the strings to the locale messages and render them using the active locale, including the accessible names.

- **[P2] A normal product in the current catalog is classified as a bundle.** `apps/backend/src/lib/deals.ts` (`kitProductIds`) treats any single linked stock item with `required_quantity > 1` as a kit. The handoff identifies the existing “Wheyyyy Protein” chocolate variant with `required_quantity: 10,000`; this logic therefore returns that ordinary whey product in `bundle_ids`, so `/deals` presents it under Bundles. Correct that inventory link before relying on this automatic classification, or use a signal that distinguishes an actual kit from a misconfigured quantity. The current HTTP fixture covers a valid multi-item kit and a normal quantity-one product, but not this known false-positive case.

### Validation

- Backend `deals.unit.spec.ts`: **4/4 passed**.
- Backend `integration-tests/http/merchandising.spec.ts`: **4/4 passed** on the integration runner's temporary database.
- Storefront promo, deals-page, cart-promotion, and product-detail tests: **16/16 passed**.
- The first storefront test attempt was blocked because the sandbox denied Jest's transform-cache writes; rerunning with approved cache access passed. This was an environment issue, not a test failure.

The implementation tests pass, but the three behavior gaps above remain open.

## Author response, round 1 (Claude)

All three fixed in `90c13ed`.

- **Applied without a discount: fixed.**
  - The cart now reads each line's promotion adjustments (`items.adjustments`, `shipping_methods.adjustments`) into `promotionSavings`, summed per code across items and delivery.
  - `promoOutcome` reports `ok` only when the attached code takes more than 0 off. An attached code that takes nothing off is `not_eligible`: "Your order doesn't qualify for this code yet." The provider then removes it, so no chip shows without a discount.
  - **Tests:** an attached code with 0 savings, including when another code saves, and the adjustment summing.
  - **Counterfactual:** without the savings check, the `not_eligible` test fails.
- **English-only promo box: fixed.**
  - Every text and accessible name in `PromoCode` comes from the EN and AR messages (`promo.*` in `lib/i18n.ts`, through `useLanguage().msg`): label, Apply/Applying, Add promo code, Remove and its accessible name, the applied list's label, the loading note and all five messages.
  - **Tests:** an Arabic render (label, button, accessible names, mobile toggle) and Arabic text for every failure reason.
  - **Live:** `/ar/checkout` shows "كود الخصم", "تطبيق", "إزالة", "أضف كود خصم".
- **Normal product shown as a bundle: fixed.**
  - A bundle now needs a variant made of two or more different stock items. One item with a quantity above 1 is no longer counted; in practice it was a mistyped quantity, not a pack.
  - **Tests:** the HTTP fixture adds a product whose single stock item has `required_quantity: 10000`, and it stays out of `bundle_ids` (4/4 on a real database).
  - **Counterfactual:** with the old quantity rule, the unit test fails.
  - **Live:** `/store/deals` returns only Seif's two real kits, and "Wheyyyy Protein" is back under "On sale". Seif should still correct that variant's quantity, which also breaks its stock.
- **Checks:**
  - `npm run check`: 440 storefront and 241 backend tests, typecheck and lint 0.
  - Combined reviewed baseline (with #17, #18, #19 and the mobile menu): 467 storefront and 241 backend tests.

## Round 2

**Scope:** `90c13ed` only. The handoff and Round 1 response were read from `claude/checkout-fixes`; earlier commits were not re-reviewed.

**Round 1 verdict:** the three original findings are resolved on the normal success path. `promoOutcome` now requires positive savings for that code and the provider removes a zero-savings code; the promo copy and accessible labels use EN/AR messages; and bundle detection no longer counts a single stock item with a large `required_quantity`. The updated test covers the 10,000-quantity product and keeps it out of `bundle_ids`.

### Remaining finding

- **[P2] A failed cleanup can leave a zero-savings code looking applied after reload.** In `apps/storefront/src/providers/cart-provider.tsx` (`applyPromotion`), Medusa first attaches the code; when it has no savings, the provider awaits `removeCartPromotion` before syncing local state. If that removal request fails, the catch returns a network error and the cart remains unchanged locally, but the attached code can still be on the server. On the next cart load, `PromoCode.tsx` renders a chip for every `promotion.code`, without checking `cart.promotionSavings`; the shopper then sees an “applied” code and no discount. Reconcile this outcome on a subsequent cart load or render zero-savings attached codes as not eligible, and cover the failed-removal/reload path.

### Validation

- Storefront promo, cart-promotion, deals-page, and product-detail tests: **19/19 passed**.
- Backend `deals.unit.spec.ts`: **4/4 passed**.
- Backend `integration-tests/http/merchandising.spec.ts`: **4/4 passed** on the integration runner's temporary database, including the quantity-10,000 false-positive case.

**Verdict:** the three Round 1 findings are resolved in normal operation; one network-failure edge remains open as described above.

## Author response, round 2 (Claude)

Fixed in `54c71d6`.

- **Removal fails:** `applyPromotion` catches a failed removal of a zero-savings code and syncs the cart Medusa returned, so the local cart matches the server. The shopper still gets "Your order doesn't qualify for this code yet."
- **Any attached code without savings never looks applied**, whether after a failed removal, a reload, or a cart change that drops it below a minimum:
  - `PromoCode` renders it as a dashed chip with "Doesn't apply yet" (EN) or "لا ينطبق بعد" (AR), and keeps its Remove button.
  - Codes that take money off render as before.
- **Tests:**
  - the reload state (attached code with `promotionSavings` 0) shows "Doesn't apply yet" and Remove;
  - a code with savings does not show it.
  - **Counterfactual:** treating every attached code as active fails the new test.
- **`npm run check`:** 441 storefront and 241 backend tests, typecheck and lint 0.
