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
| P-8 | A return removes the refunded amount's points, never more than the order earned |
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
| `GET /store/customers/me/points` | signed in | `{ points: { balance, pending, expires_at (ISO or null), history: [{ id, kind: "earn"\|"return"\|"expire", points, order_id (null for expire), created_at }] } }` | 401 |
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
