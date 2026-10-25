# Review: promo code applied but the total doesn't drop

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-24 after a manual test on the merged `full-stack` (#23).

Branch `claude/promo-total-fix` from `full-stack` `bdeb686`. One commit to review: `ff639dc`.

## What Seif saw

Checkout said "VI20 applied." and showed the VI20 chip, but the order summary had no Discount line, and the total stayed 570 EGP (500 item + 70 delivery).

## Investigation

- **Medusa was right.** For the reproduced cart, Medusa had `discount_total` 100, `total` 400 (before shipping) and a VI20 adjustment of 100 on the item.
- **The storefront asked for the wrong fields.**
  - `CART_FIELDS` gained `items.adjustments.code,items.adjustments.amount,shipping_methods.adjustments.*` in `90c13ed` (checkout-fixes round 2, so that `promoOutcome` could read real savings).
  - Those fields had no `+` prefix. In Medusa, a field without `*` or `+` replaces the default fields, so `total`, `discount_total` and `item_subtotal` stopped coming back.
  - `checkoutTotal` then fell back to the item sum (500) minus `discountTotal` (0), plus delivery: 570.
  - "Applied" still showed, because `promoOutcome` reads the adjustments, which were requested.
- Seif's test order at 12:22 UTC (cart `cart_01M5DP9A…`) was placed at 570 with no promotion attached. It's test data.

## Change

- `apps/storefront/src/lib/medusa/services/cart.ts`: the four adjustment fields get a `+` prefix, so they are added on top of Medusa's defaults.
- `cart-promotion.test.ts`: a test that every `CART_FIELDS` entry starts with `*` or `+`. It fails on the parent commit.

## Verification

- `npm run check`: backend 266, storefront 487 tests; typecheck and lint pass.
- **Live in the reviewed baseline,** same cart, desktop: Subtotal 500, Discount −100, Delivery 70, Total 470. Before the fix: 570 and no Discount line.
- **Not seen on screen:** the mobile summary. It uses the same `total` and `discountTotal` values in `CheckoutClient.tsx`.

## Things to look at

- Is a static check on the field string enough as the regression test, or do you want a `getCart` test that asserts the totals map through?
- **Other storefront `fields` strings without a prefix:** `categories.ts:76`, `orders.ts:86` and `tags.ts:8`. Each one lists every field it uses on purpose, and the order receipt includes `total`. None touches carts. Say if you see one that relies on Medusa's defaults.
