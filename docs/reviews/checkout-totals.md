# Checkout totals fix: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/checkout-totals` from `full-stack` 1da0723. Commit bcd7dde. Reported by Seif on 2026-10-16: the checkout summary showed whey at 100 EGP, but "Subtotal 0 EGP", "Delivery FREE", "TOTAL 0 EGP".

## Causes

1. **`LegacyTranslations` restored stale text** (`context/LanguageContext.tsx`, `translateDomText`).
   - It stored each text node's first value and, on every later DOM change in its scope, wrote that first value back (English) or its translation (Arabic).
   - The summary first renders before the cart loads ("0", "FREE"). React later wrote "100" and "70", and the next mutation in the scope restored "0" and "FREE".
   - Any changing text on a page wrapped in `LegacyTranslations` can be hit, not only checkout.
2. **The total ignored the selected delivery.**
   - `total` used Medusa's `cart.total` whenever it was above 0.
   - Medusa only includes delivery once a shipping method is on the cart, which happens at order time. So 100 + 70 showed 100.

## Fix

1. **`sourceText(current, lastWritten, original)`:**
   - When a node's text differs from what the translator last wrote, React changed it, and that text becomes the new source.
   - Otherwise the stored source is kept, so Arabic translations are not re-translated from their own output.
   - The translator also skips writing when nothing changed.
2. **`checkoutTotal(cartTotal, cartShippingTotal, subtotal, discountTotal, delivery)`** in `checkout/checkout-total.ts`:
   - The total is Medusa's total minus the cart's own shipping, plus the delivery shown.
   - While the cart is still loading, it is the item sum minus discounts, plus delivery.
   - Never below 0.

`LanguageContext.tsx` is the shared dictionary file that GPT owns. Only `translateDomText` and the new exported helper changed; no dictionary entries were touched.

## Evidence

- **Reproduced on the merged release** (`localhost:3000`, full-stack 1da0723): whey in the cart, and checkout's visible summary showed 0 EGP / FREE / 0 EGP inside `[data-legacy-translation]`. Medusa's cart (`GET /store/carts/:id`) had `item_subtotal` 100 and `total` 100.
- **After the fix,** on `localhost:3001` (this branch, same backend): the visible summary shows **Subtotal 100 EGP, Delivery 70 EGP, TOTAL 170 EGP**. A hidden, zero-height `<main>` copy that Next keeps for navigation still holds old text; it is not shown.
- **Tests:** `checkout/__tests__/checkout-total.test.ts` (3) and `lib/__tests__/legacy-translation-source.test.ts` (3).
- **Full check:** `npm run check` passes with 225 storefront and 199 backend tests, typecheck, and lint 0 errors / 19 warnings.

## Not verified

- **Arabic checkout live.** The same helper covers it, and is unit-tested only.
- **Placing an order end to end** after the change.
- **A debug guest cart** (`cart_01M52VCCAP4XEW689B8ZQ48EKK`, one whey) was created in `vi2_dev` to reproduce the bug and left unused.

## For the reviewer

- **Scope:** review bcd7dde only.
- **Where:** findings go under "Review".
