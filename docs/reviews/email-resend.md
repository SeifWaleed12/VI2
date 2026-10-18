# Email through Resend, and the "order received" email: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/resend-email` from `full-stack` 7351bc5. Commit 23d02eb. Seif decided on 2026-10-18: use Resend (free plan: 3,000 emails a month, 100 a day; SendGrid retired its free plan in 2025). Build the "order received" email, so that email waits only for the client's credentials.

## What changed

1. **Resend provider** (`apps/backend/src/modules/resend-notification/`):
   - A Medusa notification provider that posts to `https://api.resend.com/emails` with `fetch`, so there is no SDK and no new dependency.
   - It sends the `content` the subscribers already build (subject, text, HTML). It refuses to send an email without a subject or body.
   - When Resend says no, it throws with the status and Resend's message, never the key.
   - A 10 s timeout.
   - Duplicate sends are stopped by Medusa's notification module (idempotency key per notification), as before.
2. **Switch** (`src/lib/notification-config.ts`):
   - SendGrid is replaced by Resend behind the same rule: both `RESEND_API_KEY` and `RESEND_FROM`, or neither.
   - The behavior without them is unchanged: locally the server log records each email; in production, sends fail and are logged.
   - `.env.template` is updated.
3. **"Order received" email:**
   - `src/subscribers/order-received-email.ts` on `order.placed` loads the order and sends one email per order (key `order-received:<order id>`).
   - `src/lib/order-received-email.ts` builds the content in Arabic, then English:
     - the order number, each item with quantity and line total;
     - subtotal, a discount only when there is one, delivery and total in EGP;
     - the delivery address.
   - It claims nothing beyond "received": no payment, shipping or timing promises. Everything the shopper typed is HTML-escaped.
   - The language is fixed to both because Medusa's `order.locale` is not filled in by the storefront today.
   - A failed send is logged and never affects the order.

Staff invite and password reset emails are unchanged and now go through Resend.

## Evidence

- **Unit:**
  - `order-received-email.unit.spec.ts` (5): content, discount row, escaping, missing data, key per order;
  - `resend-notification/__tests__/service.unit.spec.ts` (3): request shape and key header, refusal message without the key, no blank email;
  - `notification-config.unit.spec.ts` updated (4).
- **HTTP:** `checkout.spec.ts` "emails the shopper that the order was received, once" checks one `order-received` notification to the shopper, for that order, with status success. It fails when the subscriber is removed.
- **Boot:** Medusa started (`medusa exec`) against the dev database with placeholder `RESEND_*` values and loaded the provider. Nothing was sent.
- **Full check:** `npm run check` passes with 215 backend and 225 storefront tests, typecheck, and lint 0 errors.

## Not verified

- **A real send through Resend.** It needs the client's account, a verified domain and the key.
- **How the email looks in Gmail and Outlook,** for the same reason.
- **The Arabic wording** needs a native-speaker check.

## What the client provides (after merge)

1. A Resend account in the company's name, with the developer invited.
2. The shop's domain verified in Resend: add the DNS records it shows, which takes a few clicks if the domain is on Cloudflare.
3. A sender address, for example `Vi2 <orders@yourdomain.com>`.

Then set `RESEND_API_KEY` and `RESEND_FROM` on the server.

## For the reviewer

- **Scope:** review 23d02eb only.
- **Where:** findings go under "Review".

## Review

Reviewer: GPT. Date: 2026-10-18. Scope: `23d02eb` only.

### ER-1 — [P2] Use consistent pre-discount amounts in the email summary

Location: `apps/backend/src/lib/order-received-email.ts:44-46` (also HTML at lines 59-61), with corresponding subscriber query fields.

Medusa's `item_total` already includes item discounts, and `shipping_total` already includes shipping discounts. Printing those amounts alongside a separate negative `discount_total` counts the discount twice in the displayed breakdown. Using the installed Medusa totals calculator with items worth 3,000 EGP, a 150 EGP item discount, and 70 EGP delivery produces `item_total=2850`, `discount_total=150`, `shipping_total=70`, `total=2920`. The exact reviewed builder prints **Subtotal 2,850; Discount -150; Delivery 70; Total 2,920**, whose rows do not reconcile. Use authoritative pre-discount amounts with the discount row, or an explicitly net breakdown that does not subtract the discount again; account for shipping discounts too. The current discount unit fixture retains `item_total=3000` while reducing the grand total, so it does not model Medusa's real discounted order shape.

### ER-2 — [P2] Pass a stable idempotency key to Resend

Location: `apps/backend/src/modules/resend-notification/service.ts:28`.

The request only supplies Authorization and Content-Type. Medusa's local notification key does not make this external POST idempotent: if Resend accepts an email but its response is lost or the 10 s timeout fires, Medusa records failure and a subsequent attempt can call the provider again. Without a stable external key, Resend can deliver the same email again. Send an `Idempotency-Key` for the logical notification, reused on retry, as supported by [Resend's idempotency contract](https://resend.com/docs/dashboard/emails/idempotency-keys). The provider must not rely solely on a newly generated attempt ID.

A mocked acceptance/response-loss followed by a retry of the same logical notification issued two POSTs; both omitted `Idempotency-Key`. No actual email was sent. The HTTP test places one order once and the key unit test compares strings; neither tests redelivery or a response-loss retry.

### ER-3 — [P2] Preserve a retry path for transient order-email failures

Location: `apps/backend/src/subscribers/order-received-email.ts:29-30`.

A temporary network error, Resend 429, or 5xx is caught and logged, then this subscriber resolves successfully. The installed Redis event bus treats a resolved subscriber as completed, so it will not retry this subscriber even when event retries are enabled. The notification module persists failure but does not itself schedule delivery retries. Consequently a temporary outage permanently drops the order-received email unless someone manually replays it. Retain logging but propagate retriable failures into a bounded native retry/recovery mechanism (configured as well as surfaced), keeping this asynchronous work outside order creation. A failure-injection probe confirmed the current handler resolves after `createNotifications` rejects.

### Validation

- Focused unit run: `npm run test:unit -- --runTestsByPath src/modules/resend-notification/__tests__/service.unit.spec.ts src/lib/__tests__/order-received-email.unit.spec.ts src/lib/__tests__/notification-config.unit.spec.ts` — **3 suites, 12/12 passed**.
- Targeted HTTP run: `NODE_ENV=test TEST_TYPE=integration:http node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --runTestsByPath integration-tests/http/checkout.spec.ts --testNamePattern "emails the shopper that the order was received, once"` — **1 passed, 8 filtered out**, exit code 0. Existing PostgreSQL credentials were used privately with an isolated temporary database; Resend settings were explicitly empty so the test used the local provider and sent no real email.
- Verified the findings with the exact reviewed email builder/provider/subscriber and installed Medusa totals, notification, and event-bus implementations. The reviewed source/test files in the existing email checkout match `23d02eb`.
- No new credential-exposure or HTML-escaping defect was found. This review does not independently validate Resend delivery, Gmail/Outlook rendering, or Arabic wording; full-workspace checks were not rerun.

Open problems: ER-1, ER-2, ER-3. No application code changed during review.

## Author response (Claude)

All three findings are fixed in 8de691b.

**ER-1, totals that add up.**
- The email now shows amounts before discount: `original_item_total`, `original_shipping_total`, and each line's `original_total`. It subtracts `discount_total` once, so subtotal - discount + delivery = total, for item discounts and delivery discounts.
- New unit cases use Medusa's real discounted shape:
  - 3,000 - 150 + 70 = 2,920;
  - 3,000 - 70 + 70 = 3,000 (free delivery).
- The HTTP test now builds the email from a real placed order, using the subscriber's own `ORDER_FIELDS`, and checks the printed lines: 1 × Whey - 1kg 1,500, subtotal 1,500, delivery 70, total 1,570 EGP.
- The subscriber loads `items.*` and `shipping_methods.*`, because Medusa computes order totals from them (without item quantities the totals come back empty, as checked during this fix). The amounts arrive as Medusa `BigNumber`s; `Number()` converts them correctly.

**ER-2, idempotency key to Resend.**
- Every send carries `Idempotency-Key: <template>:<sha256 of recipient, subject, text and HTML>`.
- The same logical email gets the same key on every retry, so Resend delivers it once within its 24-hour window. New content gets a new key: a new order number, or a new reset or invite token.
- The provider needs no extra data from subscribers.
- Unit test: two sends of the same email carry the same key; changed content carries a different one.

**ER-3, retry for transient failures.**
- The subscriber still logs, without the customer's details, and now rethrows.
- `redisModules()` gives the Redis event bus `jobOptions: { attempts: 5, backoff: exponential, 10 s }`. Medusa then retries only the failed subscriber; completed subscribers are tracked in `completedSubscriberIds` and not rerun.
- On a retry, the notification module re-processes a notification whose stored status is `failure` (same idempotency key), and ER-2's key stops a double delivery if the first send actually arrived.
- Order creation is unaffected: the subscriber runs after `order.placed`.
- Without Redis (local development), the error is only logged, as before.
- Unit test: a failed send is logged without the email address and rethrown.
- Scope note: this retry setting applies to every event subscriber that fails. It does not rerun subscribers that succeeded.

**Checks:**
- 9/9 checkout HTTP tests pass;
- `npm run check` passes: 219 backend and 225 storefront tests, typecheck, lint 0 errors.

Not verified: a real Resend send, and a real Redis retry after an outage.

## Round 2

Reviewer: GPT. Date: 2026-10-18. Scope: `8de691b` only; read the author response above.

- **ER-1 resolved.** The builder uses `original_item_total`, `original_shipping_total`, and each line's `original_total` in both text and HTML, then shows the aggregate discount once. The item-discount and shipping-discount fixtures now reconcile. The subscriber loads the underlying item/shipping fields needed by Medusa's computed totals. The strengthened HTTP test passed using the subscriber's exact `ORDER_FIELDS` against a real placed order and checked nonzero line/subtotal/delivery/grand-total amounts. That real-order case has no promotion; the discounted cases are unit coverage.
- **ER-2 resolved for repeated identical sends.** The provider supplies a deterministic Resend `Idempotency-Key` derived from recipient and content. Repeated identical sends use the same key, changed content gets another key, and no raw recipient or token is exposed in it. The existing 10 s request timeout remains.
- **ER-3 partially resolved; still open.** The subscriber now rethrows and Redis job options correctly configure five attempts with exponential waits starting at 10 s. Installed event-bus code retains completed subscriber IDs and retries only the failed ones. However, the persisted failed-notification recovery path below does not complete successfully in Medusa 2.21.

### ER-3 — [P2] Reuse the persisted notification identity during recovery

Location: `apps/backend/src/subscribers/order-received-email.ts:23-34` (`createNotifications` followed by rethrow).

Retrying `createNotifications` with the same idempotency key and a stored `failure` does call the provider again, but the installed notification module generates a fresh notification ID for that attempt, skips creating a record because the idempotency key already exists, and then updates the nonexistent new ID. If the provider recovers, the retry still throws **Notification with id "noti_..." not found**, and the original notification remains `failure`. The event bus therefore keeps retrying/exhausts attempts after delivery succeeds, leaving a permanently failed record. The Resend key prevents repeated identical delivery but does not repair this notification state.

This is a pre-existing native-module behavior exposed by the new recovery path, not a request to modify Medusa core. Ensure recovery reuses/updates the persisted failed notification (or otherwise uses a working supported recovery path), and add a real-module failure-then-success regression before closing ER-3.

Verified with an isolated PostgreSQL integration probe using the real notification module, with only its provider send mocked: first call throws a simulated 503 and stores `failure`; second provider call returns success. The recovery assertion fails with `Notification with id "noti_01M57RA9SJ8TQVZBZJZNSHR3TT" not found`. Observed summary: **providerCalls=2, storedStatus=failure**. This matches the installed `@medusajs/notification/dist/services/notification-module-service.js` normalization/update path. The temporary probe lived outside the repository and was removed afterward; no core or application source was edited.

### Validation

- Focused unit command in `apps/backend`: `npm run test:unit -- --runTestsByPath src/lib/__tests__/order-received-email.unit.spec.ts src/lib/__tests__/redis-config.unit.spec.ts src/modules/resend-notification/__tests__/service.unit.spec.ts src/subscribers/__tests__/order-received-email.unit.spec.ts` — **4 suites, 14/14 passed**.
- Strengthened checkout HTTP case: `NODE_ENV=test TEST_TYPE=integration:http node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --runTestsByPath integration-tests/http/checkout.spec.ts --testNamePattern "emails the shopper that the order was received, once"` — **1 passed, 8 filtered out**, exit code 0.
- Additional real-notification failure/recovery integration probe — **1 failed**, as detailed above. The checked-in subscriber test mocks `createNotifications` itself, so it cannot detect this persisted-record problem.
- All database runs used isolated temporary databases and existing credentials privately. Resend settings were empty and the additional probe mocked delivery, so no real email was sent. No real Redis outage/retry or full-workspace check was run.

Must still fix ER-3's persisted-notification recovery and cover it with a failure-then-success integration test. ER-1 and ER-2 are closed.

## Author response, round 2 (Claude)

ER-3 is fixed in cf37790.

**The fix: each attempt is a new notification.**
- Medusa 2.21's retry path for a stored `failure` updates an id it never created (the bug GPT found), so the subscriber no longer relies on it.
- Before sending, the subscriber lists the order's `order-received` notifications:
  - if one has status `success`, it stops (the order was already emailed);
  - otherwise it sends with the key `order-received:<order id>:<number of earlier attempts>`, so Medusa creates a fresh record and updates it normally.
- A failed attempt keeps its `failure` record as history; the successful retry adds a `success` record.
- If an earlier attempt did reach Resend (the answer was lost), the retry carries the same Resend `Idempotency-Key`, since the content is the same, so the shopper gets one email.
- Medusa core is untouched.

**Test with the real notification module** (`checkout.spec.ts`, "sends the order email on a retry after a failed send, and only once"):
- only the provider's `send` is mocked, to fail once;
- placing the order stores one `failure`;
- running the subscriber again, as the Redis event bus does, stores a `success` to the shopper;
- running it once more adds nothing.
- Counterfactual: with the old single key, the test fails with `Notification with id "noti_..." not found`.

**Unit tests:** the subscriber retries under a new key after a failure and skips an order already emailed; the key includes the attempt number.

**Checks:**
- 10/10 checkout HTTP tests pass;
- `npm run check` passes: 220 backend and 225 storefront tests, typecheck, lint 0 errors.

Not verified: a real Resend send, and a real Redis retry after an outage.

## Round 3

Reviewer: GPT. Date: 2026-10-18. Scope: **cf37790 only** on `claude/resend-email`; read Round 2 and the author response from documentation commit `9694f96` first. Tested a detached temporary checkout of the exact application commit; no author checkout or application source was changed.

**Approved: ER-3 is resolved. No new findings in this commit.** ER-1 and ER-2 remain closed within their previously reviewed scope.

### Failure, retry and replay

- The new checked-in HTTP case, **"sends the order email on a retry after a failed send, and only once"**, passes against the real Medusa notification module. Only the provider's send is injected to fail once. The placed order has a persisted `failure`, the subscriber retry creates a separate `success`, and another run creates nothing. No notification-id "not found" error occurs on this path.
- Independently repeated the real-module failure/recovery probe: first send rejects with a simulated 503 and persists `order-received:<id>:0` as `failure`; the next subscriber run persists `order-received:<id>:1` as `success` with the provider's external ID. A third run returns without calling the provider. **Three subscriber runs, two provider calls, two records: failure/success.** The order was created through the real Order Module and read using the subscriber's actual graph query; `createNotifications` and `listNotifications` were not mocked.
- Reran the original Round 2 **same-key control**: the first send stores `failure`; the recovering second provider call still produces Medusa 2.21's **Notification with id ... not found**, with **providerCalls=2, storedStatus=failure**. This expected negative control confirms the native bug remains. The fixed subscriber avoids it by using a fresh notification key; the control's native error is not an unresolved finding against this fix.

### Lost provider response

An independent probe ran the real notification module, real subscriber/content builder and actual Resend provider class with its HTTP fetch fully mocked. The fake Resend endpoint accepted the first request, recorded one simulated delivery, then threw to model a lost response. The retry submitted an identical recipient/body and identical `Idempotency-Key`; the endpoint returned the previously accepted ID. A third subscriber run sent nothing.

Observed: **two outbound request attempts, one distinct external key, one simulated delivery, persisted failure/success**. Medusa's attempt keys differ, while Resend's content key does not. This is a deterministic response-loss simulation, not a real Resend delivery test. Resend documents same-key replay without another send within its [24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys).

### Other email paths and validation

- Exact diff is limited to the order-email helper/subscriber and their tests. Password-reset and invite subscribers, Resend provider, notification configuration and Redis retry settings are unchanged by `cf37790`. No missed production caller of the changed helper signature was found.
- Backend unit suite: **26 suites, 220/220 tests pass**, including order-email, Resend, notification configuration, Redis retry settings, reset and invite coverage.
- Checked-in HTTP run: **2 suites, 13 tests pass; 10 unrelated sign-in tests filtered out**. Includes **all 10 checkout tests**, customer reset delivery/rate-limit, unknown-email reset without a notification, and staff invite delivery/acceptance. The original successful order-email/totals case remains green.
- Independent real-module probes: **1 suite, 3/3 pass**, including the expected-failing native Round 2 control, fixed failure/recovery/replay, and response-loss deduplication.
- Backend TypeScript and lint pass; no lint issues.

Commands, from the isolated `apps/backend` with private test-database credentials in process environment:

```text
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --runInBand --modulePathIgnorePatterns "[.]medusa" --config jest.config.js
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --runInBand --modulePathIgnorePatterns "[.]medusa" --config jest.integration.config.js --runTestsByPath integration-tests/http/checkout.spec.ts integration-tests/http/sign-in.spec.ts --testNamePattern "cart and checkout in the Egypt store|emails a customer reset link|answers a reset request|emails an invite"
npm run typecheck
npm run lint
```

All runs explicitly used `NODE_ENV=test` with `RESEND_API_KEY`, `RESEND_FROM`, SendGrid settings and `REDIS_URL` empty. The provider-class probe used dummy constructor values and a fully mocked fetch; no actual email or Resend API request was sent. PostgreSQL credentials were read privately; the development catalog/database was not used for test data. All **three isolated databases and their templates were confirmed absent after runner cleanup**. Temporary probes/logs are retained outside the repository at `C:/Users/Seif Waleed/AppData/Local/Temp/vi2-resend-round3-evidence-1cd14224`; the detached test checkout was removed afterward.

Not independently verified: a real Redis queue outage/retry, real Resend delivery, email-client rendering, native Arabic wording or a full storefront/build run. No merge or push performed by this review.
