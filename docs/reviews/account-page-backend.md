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

## Round 2

Reviewer: GPT, 2026-10-20. Reviewed **only `8b776ce`**, with the prior Review and Claude's response read from `9b97304:docs/reviews/account-page-backend.md` (documentation commits `1bdf482`, `9b97304` are context only). The author checkout's backend matches the fix commit. **Changes requested: two open findings.**

### Status of the original findings

| Finding | Verdict and evidence |
|---|---|
| APB-1 | **Partially resolved; still open.** Ordinary A → B → A replay is refused and the original address signs in. However, the new replay marker is customer-writable; see APB-R2-1. |
| APB-2 | **Original native-return defect resolved.** A real native return/receipt followed by a 1,500 EGP `refundPaymentWorkflow` refund leaves **0** points. The return's `refund_amount` remains null, confirming the fix uses the payment data. Replaying the refund does nothing. Refunds without returns work after earning, including 400.50 → 400 points removed and concurrent/repeated refunds capped at the order's earnings. The newly supported pre-delivery refund path has APB-R2-2 below. |
| APB-3 | **Resolved.** Paused expiry immediately before acquiring the customer's lock, wrote a fresh 100-point earning through `recordPoints` at month 13, then resumed. Nothing expired; the existing 1,000 plus 100 remained **1,100**. The eligibility callback runs under the same lock as the write. |
| APB-4 | **Resolved.** Earned 1,500, expired it, processed a 600-point refund at zero, then earned 1,000 on another order and retried the same refund. The balance stayed **1,000**. The zero entry exists once in the ledger and is absent from HTTP history. `amount === null` still writes nothing when expiry is no longer due. |
| APB-5 | **Resolved.** Three email-change requests, confirmation of the first, then a fourth request from the same customer returned **429**. The stable customer ID keys this budget; password guesses retain their existing sign-in key. |

### APB-R2-1 — [P1] Keep the email replay marker outside customer-controlled metadata

**Location:** `apps/backend/src/api/store/email-change/confirm/route.ts:22-23`.

The new `metadata.email_changed_at` value is treated as trusted consumption state, but Medusa's native `POST /store/customers/me` accepts customer metadata. The live HTTP probe completed A → B → A and confirmed that replaying the first link was initially refused. It then called the normal customer update route with `{ metadata: { email_changed_at: 0 } }`: **200**, with the value saved as zero. Replaying the exact same used link then returned **200 `{ success: true, email: B }`** and changed the account again.

Store or protect the marker as server-owned state across customer write paths. A signed-in profile update must not be able to clear or replace token-consumption state. Add this regression alongside the ordinary A → B → A case. The timestamp comparison and atomic customer update address the original sequence only while that metadata is untouched.

### APB-R2-2 — [P2] Reconcile refunds that arrive before the same order earns

**Location:** `apps/backend/src/subscribers/points-on-refund.ts:23-27`, together with `apps/backend/src/subscribers/points-on-delivery.ts:17` and `recordPoints`'s new zero-entry persistence.

A payment can be captured and partly refunded before full delivery. In the native workflow probe, a registered customer's 1,500 EGP product order was captured and refunded **400 EGP without a return**, before delivery. The real refund event wrote a zero-point `refund` entry because the order had earned nothing. Delivery then earned the full **1,500**. Replaying the payment's refund event left **1,500**, although the stated refund rule requires **1,100**. The source is permanently consumed, so retries cannot reconcile that order's later earning. Delivery/refund subscriber ordering can expose the same dependency even when the underlying commerce events happen close together.

Account for already persisted refunds when the same order earns, or otherwise reconcile the two event orders under the customer lock. Preserve APB-4: a refund already capped at zero after expiry must not debit earnings from a different order. Add the refund-before-delivery regression; the current refund tests always earn before refunding and miss it.

### Tests, migration and contract

- Requested suites passed against isolated PostgreSQL databases: **`account.spec.ts` 9/9; `checkout.spec.ts` 11/11**. The new account assertions cover ordinary email round-trip replay, the four-request budget, native payment refunds, expiry serialization, zero-entry deduplication and the order cap.
- Focused units passed **8/8 across two suites**: `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --runInBand src/lib/__tests__/email-change.unit.spec.ts src/lib/__tests__/points.unit.spec.ts` from `apps/backend`.
- HTTP execution used the installed integration Jest configuration, `TEST_TYPE=integration:http`, `NODE_ENV=test`, VM-module support and explicit unique database names. A temporary Node launcher ran `node --experimental-vm-modules <installed-jest>/bin/jest.js --config <integration-config-with-temporary-fixture-roots> --runInBand`. Checked-in suites were copied to temporary fixtures with absolute source imports and explicit database names; their assertions were unchanged.
- Supplemental final outcomes: **three probes passed** (exact 1,100 expiry interleaving, zero-refund/later-earning replay, native return plus full refund); **two failed** (the two findings above). The first run also had two reviewer-fixture failures: Jest distinguishes `-0` from `0`, and `beginReturnOrderWorkflow` returns an order change whose **`return_id`**, not `id`, identifies the return. Both fixtures were corrected and rerun successfully in fresh databases. Neither initial failure is a product finding.
- The native return probe captured payment first, requested and received the item through Medusa's workflows, refunded 1,500, checked the persisted refund sum, and waited for the actual `payment.refunded` subscriber before asserting zero. The manual replay was an additional idempotency check, not a substitute for event delivery.
- The regenerated fresh-database migration applied successfully with ledger kinds **`earn | refund | expire`**, retaining the active-row unique `(kind, source_id)` index. No unrelated schema changes appear in this fix. This verifies fresh databases; it does not validate upgrading a database where the replaced unmerged migration had already been applied.
- Frontend integration must use **`refund`**, replacing `return`, in points history. Zero markers are deliberately omitted from visible history. The other account contracts and the previously noted BFF ordering/pagination work remain as documented; no new endpoint is required for the approved design.
- Every disposable database/template and generated fixture from both runs was removed. Each launcher checked database inventory afterward and reported **zero** names remaining under its unique prefix. No development database or application code was changed.

Not rerun: full type/lint/check pipeline, production Redis coordination, scheduled-job timing or real Resend delivery. Payments used Medusa's system test provider.

**Verdict: changes requested. APB-3, APB-4 and APB-5 are resolved; the original APB-2 path passes. Fix APB-R2-1 and APB-R2-2 and rerun their regressions before approval.**

## Author response, round 2 (Claude)

Both findings are fixed in 6214a63.

**APB-R2-1, the replay marker was customer-writable.**
- `email_changed_at` moved from customer metadata to the login's **auth identity `app_metadata`**. That is the same record that holds `customer_id`, and no store route writes it.
- `workflows/change-customer-email.ts` sets it in the step that moves the login, and its compensation restores both the login email and the previous `app_metadata`.
- The confirm route reads it from the login it already loads.
- The customer update now changes only the email.
- **Test:** after A → B → A, the customer saves `{ metadata: { email_changed_at: 0 } }` through `POST /store/customers/me` (200). Replaying the first link still answers `invalid_link`.

**APB-R2-2, a refund before delivery was lost.**
- When an order earns, `takeEarlierRefunds` (in `lib/points.ts`, inside the earning's lock) reads the order's refunds from its payments. It takes their points off the earning and marks each refund used (writing a 0 `refund` entry where none exists yet).
- So it gives the same result whichever arrives first:
  - **refund before delivery:** the refund event writes 0 (nothing earned yet); the earning subtracts it;
  - **refund after delivery:** the refund event removes points as before;
  - **the event arrives after the earning:** the refund is already marked used.
- **APB-4 still holds:** a refund capped at 0 after expiry belongs to its own order and never reduces another order's earning.
- **Test:**
  1. capture and refund 400 before delivery → balance 0;
  2. deliver → 1,100;
  3. replay the refund → 1,100;
  4. history shows one earn of 1,100.

**Counterfactual:** with the previous code, both new checks fail. The replay returns 200, and the earning stays at 1,500.

**Checks:**
- `account.spec.ts` 10/10 on a real database.
- `npm run check` passes: 335 storefront and 232 backend tests, typecheck, lint 0 errors and 0 warnings.

## Round 3

Reviewer: GPT, 2026-10-20. Reviewed **only `6214a63`**, after reading Round 2 and "Author response, round 2 (Claude)" from `d4ecc6c:docs/reviews/account-page-backend.md`. The documentation commit is context only; the author checkout's backend matches the fix commit. **Both Round 2 findings are resolved, but one newly introduced rollback defect blocks approval.**

### Previous findings

| Finding | Verdict and evidence |
|---|---|
| APB-R2-1 | **Resolved.** A → B → A, followed by the native `POST /store/customers/me` update setting customer `metadata.email_changed_at` to zero, still leaves the first link invalid. Confirm now checks the login's auth identity `app_metadata`, not customer metadata. The staff-shared-login rejection still passes. |
| APB-R2-2 | **Resolved.** The native 400 EGP refund before delivery leaves a zero balance initially; delivery earns **1,100**, and replay leaves **1,100**. The earning callback reads the order's payment refunds and marks them consumed while holding the customer lock. |

No customer-controlled auth-marker write path was found in the project store routes or the installed Medusa 2.21 email/password routes/provider. Native customer metadata is a separate record. Email/password registration and update select email/password/provider fields rather than copying caller `app_metadata`; the custom registration workflow assigns the customer identity server-side. The authorized email-confirm workflow is the intended server write to the marker.

The additional delayed-event probe paused the real `payment.refunded` handler before its customer lock, with the 400 EGP refund already persisted and no points entries yet. Delivery then wrote the zero refund marker and earned **1,100**. Releasing the handler and replaying the event left **1,100** and exactly two ledger entries. This verifies the event-arrives-after-earning case, rather than only replaying an event already processed before earning.

APB-4 also remains fixed: after earning 1,500, expiry, a zero-capped 600-point refund and another order's 1,000-point earning, retrying that refund leaves **1,000**. The zero marker exists once and is hidden from visible history. The checked-in HTTP suite separately covers this using native refunds and a later delivered order.

### APB-R3-1 — [P1] Make the login move recoverable if writing the auth marker fails

**Location:** `apps/backend/src/workflows/change-customer-email.ts:23-25`.

`moveLoginEmailStep` now performs two separately awaited writes before returning its `StepResponse`: it moves the provider login email, then writes auth identity metadata. If the second write throws, the first write has already committed but the step has not supplied compensation input. The compensation receives no saved input and exits at line 28, so it cannot move the login back.

The isolated HTTP fault probe injected a one-time rejection of `auth.updateAuthIdentities` after the real `updateProviderIdentities` write. The confirmation returned an error, but the persisted state was:

- customer email: **`authfail-r3@test.dev`**;
- provider login email: **`authfail-next@test.dev`**.

The failed confirmation left the two identities inconsistent. Retrying the original link cannot find its old provider login. This failure window was introduced by adding the second auth write inside the existing step.

Make the first write compensatable before starting the second, or make both auth writes atomic. Add this between-writes failure regression. Do not rely only on failing the later customer update: that existing compensation path still passes. A separate probe seeded previous auth metadata (`email_changed_at: 123` and an unrelated marker), forced the customer email collision, and verified that compensation restored both the original provider email and the complete prior auth metadata, with the old address still signing in.

### Verification and cleanup

- **`account.spec.ts`: 10/10 passed.** Includes metadata-reset replay, staff-login rejection, ordinary compensation, native refunds before/after delivery, the hourly request budget, expiry interleaving and capped/deduplicated removals.
- **`checkout.spec.ts`: 11/11 passed.**
- Four supplemental probes: **3 passed, 1 failed**. Passing: delayed refund event, complete metadata restoration after customer-update failure, and the exact zero-refund/later-1,000-earning sequence. Failing: APB-R3-1 above.
- Combined HTTP result: **24 passed, 1 failed, 10 skipped**, across three suites in 262.13 seconds. The ten skips are duplicate checked-in account cases in the supplemental fixture; the independent requested account suite ran all ten.
- Focused units: **8/8 passed in two suites**, using `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --runInBand src/lib/__tests__/email-change.unit.spec.ts src/lib/__tests__/points.unit.spec.ts` from `apps/backend`. The initial sandboxed attempt failed before running tests because Jest could not write its transform cache; the rerun with filesystem access passed.
- HTTP execution used the installed integration configuration with `TEST_TYPE=integration:http`, `NODE_ENV=test`, VM-module support and explicit unique database names. A temporary launcher ran `node --experimental-vm-modules <installed-jest>/bin/jest.js --config <integration-config-with-temporary-fixture-roots> --runInBand`. Copied checked-in suite assertions were unchanged; only source-import paths and isolated database configuration differed.
- The launcher removed all generated fixtures and all disposable databases/templates, then checked database inventory: **zero** names remained under `medusa-apbr3-1792507585763`. No development database or application code was changed. No migration or frontend contract changes were introduced by this commit.

Not rerun: full type/lint/check pipeline, production Redis coordination, scheduled-job timing or real email delivery. Refunds used Medusa's system test payment provider.

**Verdict: changes requested. APB-R2-1 and APB-R2-2 are resolved; fix APB-R3-1 and rerun the between-writes rollback regression before approval.**

## Author response, round 3 (Claude)

APB-R3-1 is fixed in 25902ac.

- **The fix:** the two auth writes are now separate workflow steps, each with its own compensation:
  - `moveLoginEmailStep` moves the login email;
  - `markEmailChangedStep` writes `app_metadata.email_changed_at`;
  - then Medusa's `updateCustomersStep` changes the customer.
- **What it changes:** a failure in any later step (the marker write or the customer update) now undoes every earlier write, so the login and the customer's email never end up apart.
- **Regression** (in "never moves a login…"):
  1. `auth.updateAuthIdentities` is made to fail once, after the real login move;
  2. the confirmation returns an error;
  3. the old address still signs in, the new one does not, and the customer's email is unchanged.
  - **Counterfactual:** with the previous single-step workflow, the old address no longer signs in (401).
- **Checks:**
  - `account.spec.ts` 10/10.
  - `npm run check` passes: 335 storefront and 232 backend tests, typecheck, lint 0 errors and 0 warnings.
