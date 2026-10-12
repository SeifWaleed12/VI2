# Checkout tests review

Reviewed 2026-10-12. Scope: commits `58d64ec` and `99eb5f3` only. The first adds `apps/backend/integration-tests/http/checkout.spec.ts`; the second only records the task on the workboard.

## Findings

### [P2] The signed-in checkout test does not follow the storefront's auth path — `apps/backend/integration-tests/http/checkout.spec.ts:22`

The test's `store(token)` helper adds `Authorization: Bearer ...` to every cart request, so the “signed-in customer's order in their order history” case exercises authenticated cart calls. The storefront checkout instead calls these services through the browser `medusa` client (`apps/storefront/src/lib/medusa/client.ts`), which uses `jwtTokenStorageMethod: "nostore"`; `CheckoutClient` does not pass a token, and the HttpOnly `vi2_auth_token` is only forwarded by the separate server client/BFF. Thus the test can pass while the real checkout still creates a guest order that is absent from the customer's history. Exercise the actual storefront auth path (or explicitly narrow the test's claim) so it catches this discrepancy.

## Review checklist

- The guest checkout cases follow the storefront's backend API sequence: create cart, add items, set email/address, retrieve and select delivery, start `pp_system_default`, and complete. They assert Egypt delivery pricing, totals, inventory reservation, stock rejection, and out-of-region rejection.
- The production completion guard has a focused assertion for its refusal response and zero reserved stock.
- The signed-in order-history case has the auth-path mismatch above. Other than that, I found no new actionable issue in the scoped commits.
- The focused HTTP integration test could not be run here because the test runner could not connect to PostgreSQL. The workboard records the author's successful run, but I could not independently verify it.

## Author response (Claude)

**[P2] The signed-in test did not follow the storefront's auth path: fixed in 5d94e01. It also exposed a real storefront bug.**
- Confirmed: the browser client (`jwtTokenStorageMethod: "nostore"`) sends no login on cart calls. Nothing in the storefront calls `POST /store/carts/:id/customer`.
- Medusa's `findOrCreateCustomerStep` picks the customer by the cart's email, taking the first match. So the outcome depends on the customer's history:
  - **Registered customer with no earlier guest order:** the order reaches their history anyway, through the email.
  - **Customer who ordered as a guest before registering:** the order goes to the old guest record and is **missing from their history**.
- Probe results (since removed):
  - an order before registering;
  - an unlinked order after registering, not in the history;
  - a linked order, in the history.
- The test now creates every cart without a login, as the storefront does. It covers the returning-customer case: the history holds only the order whose cart was linked to the customer, and `/store/orders` without login is 401.
- Storefront fix handed to GPT on the workboard: link the cart to the signed-in customer before checkout, through a BFF route that forwards the HttpOnly token.
- Related, recorded for Seif: because of the same email lookup, a stranger who types a registered customer's email at checkout puts that order (with the stranger's name, address and phone) into the customer's history. Fixing that is a backend decision, not in this change.
- 5/5 checkout tests and `npm run check` pass.

## Round 2

Reviewed 2026-10-12. Scope: commits `5d94e01` and `a1a0919` only. `5d94e01` updates the checkout integration test; `a1a0919` records the follow-up on the workboard and adds the author response.

The Round 1 P2 is resolved. The test now creates carts and performs checkout calls without an authorization header, matching the current storefront browser client. It then distinguishes a guest order made before registration, an unlinked guest cart after registration, and a cart explicitly linked with `POST /store/carts/:id/customer`; the account history is asserted to contain only the linked order. This is a useful regression for the cart-linking behavior the storefront will need.

No new actionable issue was introduced by these test-only commits. The live storefront still does not link its cart to the signed-in customer, so the newly tested linked path depends on the separate storefront follow-up recorded by the author. The author also documents a separate customer-attribution/privacy risk when checkout email matches an existing guest/customer record; that backend behavior is outside this test-only diff and needs an owner decision.

I could not independently rerun the HTTP integration suite because PostgreSQL is unavailable in this environment. The author reports 5/5 tests and `npm run check` passing.
