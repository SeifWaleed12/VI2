# Cart polish: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/cart-polish` from local `full-stack` 9e59489 (has RD-3 and RD-5). Seif (2026-10-19): do all of them; for the postal code and cart retention, follow best practice.

## What changed

1. **Right flavor, right quantity** (a28c661, storefront):
   - The cart drawer's +, - and remove buttons passed the product id. With two flavors of one product, the provider matched the first line with that product id, so + on one flavor could change the other. They now pass the cart line id (`CartDrawer.tsx`); the list key is the line id too.
   - The quick add matched on the product; it now matches on the variant.
   - Fast clicks: each click sent its own request and every answer was shown as it arrived, so an older answer could land last. `lib/medusa/cart-queue.ts` sends cart changes one at a time, in click order, and the provider shows only the newest answer (`latest`). Add, update and remove go through it.
2. **No fake postal code** (d5e38bf): `setCartAddress` saved `00000` when there was none (the checkout form has no postal field). It now leaves the field out; one `toMedusaAddress` replaces three copies. Egyptian shoppers rarely know a postal code, and Bosta locates by city and district. The backend checkout HTTP test now places orders without a postal code.
3. **Abandoned guest carts** (305a477, 0ea0365, backend): `src/jobs/remove-abandoned-carts.ts` runs nightly at 03:30. It deletes carts with no customer and no `completed_at` whose cart and items were all last changed more than 30 days ago. Their links go through `link.delete`; their items and addresses go through the cart module.
4. **Lint warnings, 15 to 0** (a46044c):
   - Real fixes: `variants` memoized in `ProductDetailClient`; unused `onOpenSearch` prop removed from `MobileBottomNav`; `Navbar` adjusts state during render (React's documented pattern) instead of two effects.
   - Marked with the reason instead: loading data or browser storage on mount (cart, customer and region providers, checkout recovery and delivery options, recent searches), and plain `<img>` for catalog images from any host, as the product page already does.
5. **Checkout split** (6a96bb9):
   - `OrderSummary.tsx`: the desktop summary with the promo code. It owns the promo state, which nothing else used.
   - `checkout-details.ts`: form fields, governorates and the phone check.
   - `formatPrice` moved to `checkout-total.ts`.
   - The JSX is moved as it was.

## Evidence

- `npm run check`: 333 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.
- New tests:
  - `cart-queue.test.ts`: click order is kept when an earlier request is slower; a failure doesn't stop the queue.
  - `cart-address.test.ts`: no postal code is sent when it's empty, and it's trimmed when given.
  - `checkout-details.test.ts`: Egyptian phone formats.
  - `integration-tests/http/abandoned-carts.spec.ts` (real database):
    - at 29 days nothing is removed;
    - at 31 days only the guest cart goes, with its items; customer and completed carts stay;
    - a cart whose item changed recently stays.
    - Counterfactual: without the item check, the last case fails.
- Browser, against the dev backend:
  - three fast + clicks in the cart drawer ended at 4 in the drawer and 4 in Medusa;
  - the checkout summary showed items and totals;
  - an unknown promo code showed Medusa's "invalid" message;
  - the test cart line was removed afterwards.

## Not verified

- **Two flavors of one product in the cart, live:** the dev database has only one flavor in stock per product. This is covered by reading the code path and the line-id change.
- **The job running on its schedule in production:** it needs the Redis workflow engine, which is already configured.
- **Payment collections:** a deleted cart's unpaid payment collection is left (documented `shortcut:` in the job).
- **An existing warning, not from this branch:** a product without an image renders `<img src="">` in the cart and summary.

## For the reviewer

- **Scope:** `full-stack` 9e59489..0ea0365.
- **Where:** findings go under "Review".
