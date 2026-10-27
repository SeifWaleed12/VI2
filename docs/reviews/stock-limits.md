# Review: stop at the stock limit and say why

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-27 after his manual test.

Branch `claude/stock-limits` from `full-stack` `05d78a6`. One commit: `c60349a`. Started before #27 lands, by Seif's choice. It merges cleanly with #26, #27 and #28 together; see Verification.

## What Seif saw

1. **Cart drawer:** with 2 in stock, **+** showed 3, then snapped back to 2 with no message.
2. **Product page:** with "Only 1 left" and that one already in the cart, Add to cart said "Could not add to cart. Please try again.", which no retry can fix.
3. **Console:** Medusa's refusal ("Some variant does not have the required inventory") showed as a red Next.js console error.

Medusa refusing is correct and stays as the final guard. The storefront just didn't know the limit, or explain it.

## Change

- **`maxQuantity` on variants and products** (`types/product.ts`, `mapMedusaProduct`): tracked stock (`manage_inventory` not false, `allow_backorder` not true, `inventory_quantity` known), floored at 0. Unset means no limit we know of.
- **Product page:**
  - The quantity it allows is the limit minus what the cart already holds of that variant, capped at 10 as before.
  - When nothing more can be added: "You already have the last one in your cart." (or "all N"), with **View cart**. Add to cart and Buy now are disabled.
  - **After a refusal**, it reads the variant fresh (`listProducts({ id, fresh: true })`, the bounded uncached route) and says "Sorry, this just sold out." or "Only N more available." instead of "try again". Real failures still say "Could not add to cart".
  - EN/AR copy is in the page's own `COPY`.
- **Cart drawer:**
  - `useStockLimits` (new hook) reads fresh limits for the cart's products each time the drawer opens.
  - **+** is disabled at the limit.
  - A line at the limit says "Only N available."; above it, "Only N available now. Lower the quantity to check out." or "Sold out. Remove it to check out." (`cart.*` keys, EN/AR).
- **Cart provider:** `isStockRefusal` stops a stock refusal from being logged with `console.error` (the Next dev overlay). Real failures are still logged. The provider's public API is unchanged, to keep the clash with #27 small.

## Verification

- `npm run check` on the branch: backend 266, storefront 501; typecheck and lint pass.
- **The branch merged with #26, #27 and #28** (local reviewed baseline, `2420a16`): clean merge; backend 341, storefront 573; typecheck and lint pass.
- **New tests:**
  - variant limit mapping (tracked, negative, untracked, backorder, unknown);
  - product page: last one already in the cart (EN/AR, Add disabled, View cart), all N in the cart, and a refusal followed by fresh stock 0 ("just sold out", not "try again", Add disabled);
  - drawer: **+** disabled only at the limit, plus the at, over and sold-out notes;
  - provider: a stock refusal returns false with no `console.error`.
- **Live** (baseline with all four branches, "NutriNation Omega-3", 1 in stock): after adding it, the page shows the note with View cart and disables Add; the drawer's **+** is disabled with "Only 1 available."

## Known limits

- `useStockLimits` reads the first 24 products in the cart (the fresh route's page size). Larger carts get no **+** limit for the rest (`shortcut:` comment). Medusa still refuses.
- In the drawer, a refusal between opening and clicking **+** (someone else buying) still snaps back silently. The next time the drawer opens, the limit is fresh.

## Things to look at

- Is fresh reading on drawer open plus after a product-page refusal enough, or should the drawer also re-read after a snap-back?
- `isStockRefusal` matches Medusa's message text ("required inventory"). Medusa 2.21 gives no error code for this.

## Seen while testing, not part of this change (#28)

On a product page, React reports a hydration mismatch in `ProductReviews`: the server renders "Checking your account…" (disabled), the client renders "Sign in to write a review". The reviews section streams inside `<Suspense>` and hydrates after `CustomerProvider` has finished loading, so `authLoading` differs between server and client. It shows as "1 Issue" in the dev overlay. Likely fix in #28: treat "not hydrated yet" as loading (or render the account-dependent button after mount).

## GPT review, round 1 (2026-10-27)

- **[P2] Refresh the cart drawer limit after a stock refusal.** The drawer read stock only when it opened. A refused **+** snapped back silently with the old limit, and could be repeated. A failed read also kept stale limits indefinitely.
- **Scope:** the #28 hydration mismatch is not from this commit; it stays with #28.
- Read-only review.

## Author response (`cee1c5b`)

- **Refusal handled.** `updateQuantity` now returns whether Medusa accepted the change (`Promise<boolean>`; removal returns true, a missing cart or line returns false). On a refused **+**, the drawer calls `refresh()` from `useStockLimits`, which reads the cart's stock again, so **+** disables and the note shows the new limit.
- **Failed reads** clear the limits instead of keeping stale ones. Medusa still refuses anything it can't fulfil.
- **New test:** a refused **+** triggers exactly one re-read, and an accepted one triggers none. It fails on `c60349a`'s handler.
- `npm run check`: backend 266, storefront 502; typecheck and lint pass.

Round 2 requested: `cee1c5b` only.

### Combining with #27 (done on the local reviewed baseline, `dc2cec0`)

#27 rewrote `updateQuantity`. When this branch is updated after #27 merges:
1. **Keep #27's body.** It reads the confirmed line from the queue. Return its `sendChange(...)` result, and return `false` when there is neither a cart nor a target.
2. **#27's two early exits** (stale session version, busy queue) return `false`, not `undefined`.

With #26, #27 and #28 together: backend 341, storefront 574; typecheck and lint pass.
