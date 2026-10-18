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
