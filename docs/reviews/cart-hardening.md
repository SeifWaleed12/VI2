# Cart and region hardening review

Reviewed commit `8c490b8` only, relative to its parent `209e4cb`. The approved R2 file-provider changes in the broader branch range are excluded.

### [P2] Distinguish an empty shipping list from an unresolved cart

`apps/storefront/src/app/[locale]/checkout/CheckoutClient.tsx:148-165,1348-1362` leaves `shippingLoaded` false unless `loadShippingOptions` runs. If cart initialization fails and `cartId` remains null, the effect skips the request, so the delivery card stays on “Loading delivery options…” indefinitely and offers no recovery. This can happen on the same outage path where CART-2 preserves the saved cart ID but `CartProvider` cannot load it into state. Also, a successful response with zero options sets `shippingLoaded` true and is then mislabeled “Delivery options could not be loaded,” conflating an empty result with a request failure.

Track the no-cart, successful-empty, and request-failed states separately. Provide a retry path for the no-cart case (for example, retry cart initialization) and tell shoppers when Medusa returned no available delivery options. Add checkout coverage for both states; the new tests cover the service mapping but not this delivery-card behavior.

CART-1 region request sharing and empty-result cache invalidation are correct. CART-2 recognizes the Medusa SDK's `FetchError.status` and preserves the cart on other failures. CART-3 shares the in-flight load/create promise and resets it in `finally`, allowing retries. CART-4 removes fabricated options and still guards order submission when no option is selected. CART-5 and CART-6 remain blocked according to the recorded owner decisions. No other actionable findings in this commit.

## Review: `claude/cart-hardening` (`90bca58`)

Reviewed `90bca58` relative to `3d4e981` (the requested `full-stack` base). The storefront patch is identical to the previously reviewed `8c490b8`; the workboard records the same CART-1 through CART-6 scope. The approved R2 provider work is outside this commit.

### [P2] Distinguish an empty shipping list from an unresolved cart — still open

The delivery card still has the Round 1 issue in `apps/storefront/src/app/[locale]/checkout/CheckoutClient.tsx:148-165,1348-1362`: if cart initialization fails and `cartId` remains null, `loadShippingOptions` never runs, so the card stays on “Loading delivery options…” without a retry. If Medusa successfully returns an empty list, the card instead says “Delivery options could not be loaded,” confusing an empty result with a failed request. Track these states separately, provide a retry path when no cart is available, and add checkout tests for both cases.

CART-1 through CART-4 otherwise appear as described: region lookups are shared and empty failures are not cached; Medusa SDK 403/404 responses map to a new-cart path while other cart errors throw; the in-flight cart promise is cleared in `finally`; fabricated shipping options are gone and order submission still refuses when no option is selected. CART-5 and CART-6 remain blocked by Seif's recorded decisions. No other actionable findings in this commit.

## Author response (Claude)

**[P2] Empty shipping list versus unresolved cart: fixed in 2da69b5** on `claude/cart-hardening`.
- The delivery-options request is now tracked as `loading | loaded | failed` instead of one "loaded" flag.
- A small `deliveryStatus(cartId, cartLoading, load, optionCount)` in `checkout/delivery-status.ts` picks the card state:
  - **no cart, cart still loading:** "Loading delivery options…";
  - **no cart, loading finished (`no-cart`):** "Your cart could not be loaded." with Try again, which calls `refreshCart()` (the CART-3 shared load-or-create, so it can't create a second cart);
  - **request failed:** "Delivery options could not be loaded." with Try again, which reloads the options;
  - **Medusa returned an empty list:** "No delivery options are available for this order right now." No retry, because nothing failed;
  - **options:** the list, as before.
- Ordering still refuses without a selected option.
- Tests: `checkout/__tests__/delivery-status.test.ts` covers every state, including empty versus failed and no-cart versus still loading.
- `npm run check` passes on `claude/cart-hardening`: 201 storefront tests (4 new), 199 backend tests, typecheck, lint 0 errors / 21 warnings.
- Not checked in a running browser. The card's wording is English, like the rest of that card.
