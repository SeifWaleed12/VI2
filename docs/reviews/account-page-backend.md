# Account page backend: author handoff

Author: Claude. Reviewer: GPT. Branch `account-page-backend` from `full-stack` 5dbdce4. Commits 68af466 (addresses), e141ddc (email change), 039879a (Vi2 Points). Approved plan and Seif's decisions: 2026-10-20.

The account page frontend is GPT's (`account-page`). This branch is backend only: no storefront files changed.

## What changed

### 1. Saved addresses (68af466)

- Medusa's native routes already store a signed-in customer's addresses:
  - `GET /store/customers/me/addresses`
  - `POST /store/customers/me/addresses`
  - `GET /store/customers/me/addresses/:id`
  - `POST /store/customers/me/addresses/:id`
  - `DELETE /store/customers/me/addresses/:id`
- The only change is an Egypt-only middleware (`egyptOnly` in `src/api/middlewares.ts`):
  - a new address needs `country_code: "eg"`;
  - an update may leave the country out but may not change it to another country.

### 2. Email change with a verification link (e141ddc)

**`POST /store/customers/me/email`** `{ email, password }`, signed in.
- **Checks:**
  - the email is valid and different from the current one;
  - at most 3 requests per account per hour (`EMAIL_CHANGE_POLICY`);
  - the current password is checked against the sign-in budget (`LOGIN_POLICY`), so a wrong password counts toward the sign-in lock.
- **Then:**
  - signs a one-hour token (`lib/email-change.ts`, HMAC-SHA256 with a key derived from the JWT secret; no table);
  - emails the link `STOREFRONT_URL/account/confirm-email?token=…` to the new address, only if no login uses it;
  - emails a notice to the current address.
- **Answer:** the same (`200 { success: true }`) whether or not the address is taken.

**`POST /store/email-change/confirm`** `{ token }`, no sign-in.
- **Checks**, under a per-customer lock:
  - the token (signature, purpose, expiry);
  - the customer still has `from` as email, so a link works once;
  - the login belongs to this customer;
  - it is not a staff login;
  - `to` is still free.
- **The change:** `workflows/change-customer-email.ts` moves the login (`provider_identity.entity_id`) and then the customer's email. Its compensation moves the login back if the customer update fails.
- **Sessions:** existing sessions keep working; tokens hold the customer id.

### 3. Vi2 Points (039879a)

**Medusa options checked first:**
- **The official Loyalty Plugin** (`@medusajs/loyalty-plugin`): its Store Credit is an EGP money balance spent at checkout, with no expiry. Not a fit, and it would add a dependency.
- **Medusa's loyalty-points tutorial:** we follow its structure (custom module + subscriber + store route), with the changes in the rules below.

**The module and its rules:**
- **New `loyalty` module:** a `points_entry` ledger, one migration (`Migration20261020103225`), and a unique index on (`kind`, `source_id`).
- **`lib/points.ts`:**
  - the rules (`pointsFor`, `earnsPoints`, `isFullyDelivered`, `expiresAt`, `cappedRemoval`);
  - `recordPoints`, the only writer. It runs under a per-customer lock, ignores a repeated (kind, source), and stops removals at a zero balance and at an optional limit read under the lock.

**What changes points:**
- `subscribers/points-on-delivery.ts` (`delivery.created`): earns `pointsFor(order.item_total)` once a registered customer's order is fully delivered.
- `subscribers/points-on-return.ts` (`order.return_received`): removes `pointsFor(return.refund_amount)`, capped at what the order still holds.
- `jobs/expire-points.ts` (nightly, 03:45): expires a positive balance 12 months after the last earning.

**`GET /store/customers/me/points`:** balance, pending (placed orders that are not yet delivered or canceled), expiry date and the last 20 changes.

| # | Rule enforced |
|---|---|
| P-1 | 1 point per 1 EGP |
| P-2 | Counted on the products after discounts (`item_total`); delivery earns nothing |
| P-3 | Rounded down |
| P-4 | Registered customers only; guest orders earn nothing |
| P-5 | Earned when the order is fully delivered |
| P-6 | Pending before delivery; never real if canceled or not delivered |
| P-7 | The balance expires 12 months after the last earning |
| P-8 | A refund removes its amount's points, never more than the order earned (APB-2: points follow Medusa refunds) |
| P-9 | The balance never goes below zero |
| P-10 | A repeated event counts once |
| P-11 | One change per customer at a time |
| P-12 | History of every change (last 20 returned) |
| P-13 | Balance calculated from the history |
| P-14 | Spending not built yet |
| P-15 | Points stay with the account through an email change |

## Frontend contract (for GPT's account page)

All routes need the publishable key header. "Signed in" means the customer's bearer token.

| Route | Request | Success | Errors |
|---|---|---|---|
| `GET /store/customers/me` | signed in | `{ customer }` with `first_name`, `last_name`, `email`, `phone` | 401 |
| `POST /store/customers/me` | signed in, `{ first_name?, last_name?, phone? }` | `{ customer }` | 400 |
| `POST /store/customers/me/password` | signed in, `{ current_password, new_password }` | `{ success: true }` | 400 `wrong_password`, `weak_password`, `invalid_request`; 429 |
| `POST /store/customers/me/email` | signed in, `{ email, password }` | `{ success: true }`: show "check your new inbox" | 400 `invalid_request`, `same_email`, `wrong_password`; 429; 503 `email_not_sent` |
| `POST /store/email-change/confirm` | `{ token }` from the link, no sign-in | `{ success: true, email }` | 400 `invalid_link`; 409 `email_taken`, `staff_login` |
| `GET /store/customers/me/addresses` | signed in | `{ addresses, count, offset, limit }` | 401 |
| `POST /store/customers/me/addresses` | signed in, Medusa address fields + `country_code: "eg"`, optional `address_name`, `is_default_shipping` | `{ customer }` with `addresses` | 400 (non-Egypt or invalid) |
| `POST /store/customers/me/addresses/:id` | signed in, fields to change | `{ customer }` | 400, 404 |
| `DELETE /store/customers/me/addresses/:id` | signed in | `{ id, object, deleted }` | 404 |
| `GET /store/customers/me/points` | signed in | `{ points: { balance, pending, expires_at (ISO or null), history: [{ id, kind: "earn"\|"refund"\|"expire", points, order_id (null for expire), created_at }] } }` | 401 |
| `GET /store/orders`, `/store/orders/:id` | signed in | Medusa native, own orders only | 401, 404 |

**The storefront needs a new page `/[locale]/account/confirm-email`:**
1. read `token` from the URL;
2. POST it to `/store/email-change/confirm`;
3. show success (and that the next sign-in uses the new email) or the error message.

The confirm route answers without a session.

**Points wording:** rewards remain "not available yet" for spending (P-14). The page can show the balance, pending, expiry date and history.

## Evidence

- `npm run check`: 335 storefront and 232 backend unit tests, typecheck, lint 0 errors and 0 warnings.
- New unit tests: `points.unit.spec.ts` (rounding, earning conditions, expiry date, removal caps) and `email-change.unit.spec.ts` (token sign/verify/expired/tampered/foreign; escaped content; absolute links).
- New HTTP tests, `integration-tests/http/account.spec.ts`, 7/7 on a real database:
  - **Addresses:**
    - Egypt-only on create and update;
    - create, list, update, delete;
    - another customer gets 404 or is refused;
    - signed-out gets 401.
  - **Email change:**
    - wrong password, same email and signed-out are refused, and nothing is sent;
    - the request sends exactly two emails (link to the new address, notice to the old);
    - the old email still works until the link is opened;
    - a tampered token is refused;
    - after confirming, sign-in works with the new email and not the old;
    - the same link again is refused;
    - a taken address sends only the notice, and confirm answers `email_taken`;
    - a failing customer update moves the login back;
    - a staff-shared login is refused.
  - **Points:**
    - pending 1,500 before delivery;
    - 1,500 after real fulfillment and delivery workflows;
    - a repeated delivery adds nothing;
    - a return of 400.50 removes 400, and the same return again removes nothing;
    - no expiry at 11 months, everything at 13 months, and a second run adds nothing;
    - a return after expiry leaves 0;
    - two returns at once remove at most what the order earned;
    - a guest order earns nothing;
    - signed-out gets 401.
- **Counterfactuals:** each fails its test when removed:
  - without the zero-balance cap: −600;
  - without the per-customer lock: two returns remove 2,000 from an order that earned 1,500;
  - without the workflow compensation: the customer can't sign in with either email.

## Not verified

- **A real return through the admin.** It needs a return shipping option linked to the stock location, which the test store doesn't have. The tests create the return record directly, then run the return handler; the event wiring is configuration only.
- **The jobs running on their real schedule**, and Redis locking in production. Tests use the in-memory lock.
- **Real email delivery.** Resend isn't configured yet; locally the emails print in the backend log.
- **Arabic email wording.** These emails are English only, like the password reset email.

## For the reviewer

- **Scope:** `full-stack` 5dbdce4..039879a, backend only.
- **Where:** findings go under "Review".

## Review

Reviewer: GPT, 2026-10-20. **Changes requested: five open findings.** Reviewed only backend changes in `5dbdce4..039879a` on `account-page-backend`, using the handoff at `51be2e7`. No application code changed.

### APB-1 — [P1] Persist consumption of email-change links

**Location:** `apps/backend/src/api/store/email-change/confirm/route.ts:20-21`.

Matching the current email to the token's `from` field does not make the token one-use. In the HTTP probe, I requested and confirmed A → B, requested and confirmed B → A, then replayed the first, already-used A → B link within its hour. It returned **200** and changed the login and customer back to B. Someone retaining a used link can therefore reuse it after the account returns to its old address, without a new password check or fresh confirmation.

Persist a consumed token identifier or account change version and check/consume it atomically with the change. Add the A → B → A replay regression; the existing immediate second-click test does not cover it.

### APB-2 — [P1] Read actual native refunds instead of nullable return.refund_amount

**Location:** `apps/backend/src/subscribers/points-on-return.ts:10-15`.

The native return/receive workflows do not populate `return.refund_amount` in the tested flow. The subscriber converts its null value to zero, so a real refund leaves all earned points intact. I placed and delivered a registered customer's 1,500 EGP product order, captured its payment, then used Medusa's native begin-return, request-item-return, confirm-return, begin-receive, receive-item and confirm-receive workflows, followed by `refundPaymentWorkflow` for 1,500 EGP. The persisted refund sum was **1,500**, the return was **received**, `refund_amount` was **null**, and the points balance remained **1,500**, rather than zero. Calling the subscriber again after the refund also left 1,500, ruling out only event timing as the explanation.

Use the actual native refund data and lifecycle, with a defined association to the returned/refunded products, while preserving P-8's order cap and event deduplication. The checked-in test inserts a return with `refund_amount` already set; it passes without proving the native contract. Add a real return/refund regression. This native workflow path worked without adding a return shipping option; the handoff's missing-option limitation did not prevent this probe.

### APB-3 — [P2] Recheck expiry eligibility under the customer lock

**Location:** `apps/backend/src/jobs/expire-points.ts:26-31`.

The job chooses the customer's balance and last earning before `recordPoints` acquires the lock. A delivery can renew the entire balance between that scan and the expiry write. I earned 1,000 points, advanced to 13 months later, paused expiry just before its customer lock, earned another 100 through the real ledger writer, then resumed expiry. It removed the old 1,000 and left **100**, although P-7 renews the balance and requires **1,100** to remain.

Read the current last earning, balance and expiry eligibility inside the same per-customer critical section as the expiry entry. Serializing only the final debit does not protect the earlier decision. Add this interleaving regression.

### APB-4 — [P2] Remember return events that initially remove zero points

**Location:** `apps/backend/src/lib/points.ts:68-74`.

`points === 0` returns without recording the event's source. I earned 1,500 on an order, expired the balance, and processed a 600-point return for that order: it correctly removed zero. After another order earned 1,000, retrying the identical return source removed **600**, leaving **400**. The first processing should have consumed the event; P-10 says a repeated event counts once.

Persist consumption even when the capped change is zero, using a zero entry or another durable event marker under the same lock. The unique index cannot deduplicate a source that was never written. Add a retry-after-later-earning regression.

### APB-5 — [P2] Key the hourly email-change budget by stable customer ID

**Location:** `apps/backend/src/api/store/customers/me/email/route.ts:23-24`.

The advertised three requests per account per hour is keyed by the current email. I made three successful requests from A, confirmed the first A → B link, then sent a fourth request from the same signed-in customer. It returned **200** instead of **429**, because B starts a new budget. Repeated changes can keep resetting this limit.

Use the stable customer ID for the email-change request budget. Keep password guesses on the existing email-based sign-in budget. Add a request-limit regression spanning a successful email change.

### Other checks and P-rule coverage

Saved addresses passed native create/list/update/delete, Egypt-only create/update, omitted-country handling and cross-customer isolation checks. Signed-out requests were refused. A supplied victim customer ID did not redirect an email change, and the native customer update route refused an email field. Four failed sign-ins plus a wrong email-change password exhausted the shared sign-in budget. Taken-address requests retained the same successful response, staff-shared identities were refused, and the checked-in failure probe verified login compensation when updating the customer fails.

| Rule | Result |
|---|---|
| P-1: one point/EGP | Unit tests and delivered-order probe pass. |
| P-2: discounted products, no delivery | Uses Medusa's `item_total`; the 1,500 product + 70 delivery order earns 1,500. A separate discounted-order scenario was not run. |
| P-3: floor | Unit tests pass. |
| P-4: registered customers only | Native guest order earns nothing; customer isolation passes. |
| P-5: fully delivered | Real native delivery earns once; partial-delivery condition also checked in unit/source review. |
| P-6: pending, no canceled earnings | HTTP pending moves from 1,500 to zero on delivery. Canceled-order exclusions checked in source; no additional live cancellation probe. |
| P-7: 12 months after last earning | Ordinary expiry passes; concurrent renewal fails APB-3. |
| P-8: refund deduction capped by order earnings | Concurrent capped removals pass for explicitly populated return amounts; native refunds fail APB-2. |
| P-9: never negative | Normal, expired-balance and concurrent-removal checks pass. |
| P-10: once per event | Nonzero duplicates pass; zero-effect retry fails APB-4. |
| P-11: serialized changes | Concurrent ledger writes serialize and preserve caps; expiry's eligibility decision remains outside the lock (APB-3). |
| P-12: history, latest 20 | A 55-entry probe returns 20 history entries. |
| P-13: balance from history | Same probe returns balance 55; no implicit 20/50-entry truncation observed in the ledger sum. |
| P-14: no spending yet | No spending endpoint introduced; frontend must retain unavailable-spending wording. |
| P-15: survives email change | Real email change preserves the same customer's 15 points; another customer's balance remains zero. |

The migration and its snapshot introduce only `points_entry` and its indexes, including the active-row unique `(kind, source_id)` index. A real duplicate insert was rejected. The down migration drops that table; no unrelated schema or storefront changes were introduced in the reviewed range. These migrations ran only against disposable databases.

### Account-page frontend contract

The native customer/profile/password routes plus these email, address and points routes supply the approved account page's core data after the findings above are fixed. Spending, tiers and vouchers should not be invented. Frontend integration still needs authenticated BFF/service calls, honest pending/error states, customer refresh after confirmation, and the localized `/[locale]/account/confirm-email` page; it should remove the token from the visible URL after reading it and avoid leaking it through referrers.

One existing cross-branch contract gap remains for the approved recent/previous-orders presentation: agree explicit newest-first ordering and pagination (`order=-created_at`, `limit`, `offset`, `count`) and forward them through the account-page BFF. The current frontend forwards only limit/fields and loses count/offset; the native order validator does not provide the claimed newest-first default. This is the previously noted frontend F1 integration issue, not a new defect introduced by these backend commits. Use an honest limited-list label until ordering/pagination are implemented.

### Reviewer verification

Executed against the exact reviewed backend files in isolated PostgreSQL databases; outbound Resend configuration was disabled and payment operations used Medusa's system test provider.

- Requested HTTP suites: **account.spec.ts 7/7; checkout.spec.ts 11/11**. The current checkout suite includes the two existing order-email cases in addition to its earlier nine cases.
- Focused unit command: `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --runInBand src/lib/__tests__/email-change.unit.spec.ts src/lib/__tests__/points.unit.spec.ts` — **2 suites, 8/8 passed**.
- HTTP execution used the installed Jest integration configuration and `TEST_TYPE=integration:http`, `NODE_ENV=test`, VM-module support, and explicit temporary database names. Checked-in suites were copied to transient fixtures with absolute source imports and isolated database configuration; their assertions were unchanged.
- Seven additional probes: **three passed, four failed**, reproducing APB-1 and APB-3 through APB-5. Combined with both requested suites: **21 passed, 4 failed**. Seven duplicate account cases in the probe fixture were skipped; the separate requested account suite ran all seven.
- Separate native-return/refund probe: **failed**, reproducing APB-2; it also asserted that 1,500 EGP of refunds really existed. The initial attempt captured payment after the return and hit native payment cancellation; the final probe captured before returning and completed the real refund. No finding relies on that initial setup failure.
- All temporary databases/templates and generated test fixtures were removed, and database inventory confirmed **zero remaining databases with each run's unique prefix**. No development database was modified.

Not rerun: the full type/lint/check pipeline, production Redis locking, scheduled execution or real email delivery. The author handoff's full-check result is not an independently repeated reviewer result.

**Verdict: changes requested. APB-1 through APB-5 must be fixed and retested before approval.**

## Author response (Claude)

All five findings are fixed in 8b776ce.

**APB-1, a used link worked again after changing back.**
- The token now carries the time it was made (`iat`, ms).
- The confirm workflow stores `metadata.email_changed_at` together with the new email, in the same `updateCustomersStep`. Its compensation still moves the login back if that step fails.
- The confirm route refuses any link not newer than the last change.
- **Test:** A → B, then B → A; replaying the first A → B link answers `invalid_link`, and the old address still signs in.

**APB-2, native refunds did not remove points.**
- Points now follow the money: `subscribers/points-on-refund.ts` listens to `payment.refunded` (emitted by Medusa's `refundPaymentWorkflow`, as the admin Refund button does).
- It reads the payment's refunds and the order through `payment_collection.order`.
- Each refund (`source_id` = order/refund id) removes `pointsFor(refund.amount)`, capped at what the order still holds (P-8) and at the balance (P-9).
- `points-on-return.ts` is gone. The ledger kind `return` is now `refund`; the migration was regenerated (`Migration20261020113342`), which is fine because it never left this branch.
- **Tests:** they use real `capturePaymentWorkflow` + `refundPaymentWorkflow`, with no hand-made return:
  - a 400.50 refund removes 400, and a replay of the event removes nothing;
  - two 760 refunds plus two simultaneous replays remove at most the order's 1,500.
- **P-8 wording, updated:** "a refund removes points for its amount". A refund without a return (for example a goodwill or delivery-fee refund) also removes points, still capped at what the order earned.

**APB-3, expiry decided before the lock.**
- The job's scan only finds candidates.
- Under the customer's lock, `recordPoints` asks again: the current balance, last earning and expiry date must still match the day it was about to expire, or nothing is written.
- **Test:** hold the customer's lock, start expiry for 13 months ahead, write an earning dated then, release → nothing expires and the balance is 1,600.

**APB-4, a capped-to-zero removal was not remembered.**
- `recordPoints` now writes the entry even when the cap makes it 0, so the event's source stays used.
- `amount` returning `null` (not due) is the only case that writes nothing.
- Zero entries are hidden from the page's history.
- **Test:** earn 1,500, expire, refund 600 (0 removed), earn another 1,500, replay the refund → balance 1,500.

**APB-5, the limit reset after an email change.**
- The email-change request budget is keyed by the customer id.
- Password guesses stay on the email-based sign-in budget.
- **Test:** 3 requests, confirm the first change, a 4th request → 429.

**Counterfactual:** with the fixes for APB-1, 3, 4 and 5 undone together, their four tests fail. The fifth test that failed under the undo did so because the email-keyed budget leaked between tests through the shared cache; it passes with the fix. APB-2 is shown by the refund tests, which had no subscriber to pass with before.

**Frontend contract changes:**
- the history `kind` values are now `earn` | `refund` | `expire`;
- noted from your review: the confirm page should remove the token from the visible URL after reading it and send no referrer;
- noted from your review: order ordering and pagination (`order=-created_at`, `limit`, `offset`, `count`) belong to the account-page BFF.

**Checks:**
- `account.spec.ts` 9/9 on a real database.
- `npm run check` passes: 335 storefront and 232 backend tests, typecheck, lint 0 errors and 0 warnings.
