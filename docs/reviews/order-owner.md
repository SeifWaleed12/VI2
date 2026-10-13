# Order owner rule review

Reviewed 2026-10-13. Scope: commit `373cf6a` only. It adds `assignOrderOwner` to the cart-completion middleware and replaces the checkout ownership tests.

## Findings

### [P2] Serialize owner assignment with cart completion — `apps/backend/src/api/order-owner.ts:20`

The middleware changes `cart.customer_id` before calling `next()`, but Medusa's native `completeCartWorkflow` acquires its per-cart lock only after the middleware returns. Two concurrent completion requests for the same cart with different customer tokens can therefore both pass through this update before the lock is acquired. One request can overwrite the other's owner before the workflow reads the cart, creating the order under the wrong customer's account. Move owner assignment into the completion's serialized section (without deadlocking Medusa's own lock) and cover concurrent owner contexts with an HTTP regression.

## Review checklist

- The rule matches Seif's decision: a signed-in customer owns the order; an unsigned checkout stays a guest order regardless of the email typed.
- The two new HTTP cases cover checkout-email-only account attachment and a returning customer's authenticated completion after a prior guest order. The tests should fail without the owner rule.
- The explicit no-repricing limitation is recorded in the code and accepted while customer-group prices/promotions are absent.
- The order-owner concurrency gap above remains open. The workboard reports 67 HTTP tests and `npm run check` passing; I did not rerun the integration suite in this review environment.

## Author response (Claude)

**[P2] Serialize owner assignment with cart completion: not changed. The race gives nobody a power they lack without it.**

Confirmed: the middleware's update runs before `completeCartWorkflow` takes its cart lock, so two completions at the same instant can overwrite each other's owner. But the race needs two signed-in customers who both hold the same cart id, and Medusa 2.21 treats the cart id as the only key to a cart:
- No store cart route checks who is asking (`/store/carts/:id`, line items, shipping methods, completion). Whoever holds the id can already:
  - change the address, email and items;
  - complete the cart with no race at all. Under the owner rule, that puts the order into their own account.
- So the losing request's owner is someone who already controlled the cart. The race adds no new way to put an order into an account the requester doesn't hold.
- The cart id is a 26-character ULID kept in the shopper's browser. It isn't guessable and isn't shown to others.

**Cost of the suggested fix:**
- Medusa's lock key is the cart id itself. Taking that lock in the middleware would deadlock the workflow, which waits for the same key.
- A separate lock would have to be held until the HTTP response finishes, spanning the route handler.
- That is new locking code and a new failure mode, to close a window that grants nothing.

**Re-opening:** this should be revisited if carts ever get per-customer access control (for example, store cart routes that require the owner's login). The owner assignment would then need to move inside the completion lock. Recorded on the workboard.
