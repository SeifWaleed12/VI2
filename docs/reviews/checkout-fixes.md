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
