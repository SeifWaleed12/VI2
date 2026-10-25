# Review: fixes from Seif's manual test (2026-10-25)

Author: Claude. Reviewer: GPT. Seif tested the merged `full-stack` (#24) by hand, listed his problems, and approved each fix below after Claude investigated and explained it.

Branch `claude/test-round-fixes` from `full-stack` `9f8e0c2`. Review `373032e` (`dfc9696` only restores `next-env.d.ts`).

## What Seif found, the cause, and the fix

| # | Seif saw | Cause | Fix |
|---|---|---|---|
| 1 | Checkout kept jumping to Confirm with "Retry confirmation", even after emptying the cart and picking a new product | A test product's inventory kit asks for 10,000 units, so Medusa refused completion with 400 "Some variant does not have the required inventory". `completeCheckout` treated every non-2xx as an unknown outcome, so the pending-completion key stayed in sessionStorage and every checkout visit retried that old cart | A 4xx from Medusa other than 403/409 means "not placed": the retry is dropped and the message says so (stock problems named plainly). 409 and 5xx stay unknown. Any cart change (add, remove, quantity) drops a pending retry |
| 2 | Going back from Confirm, or leaving checkout and returning, emptied the details | Details lived only in component state, and the dev server's live reload remounted the page (see "Not a bug") | Details are kept in sessionStorage under the `vi2-pending-checkout:` prefix, which sign-out already clears, and dropped once the order is placed. Signed-in customers get their name, email, phone and first saved address filled into empty fields only |
| 3 | Sign-up with a used email showed "Unable to register with these details" | Deliberately vague, to avoid revealing which emails have accounts | Seif chose the large-shop practice: 409 `email_taken`, "This email already has an account.", with Sign in and Reset password links (44 px targets, EN/AR). A login with that email that has no customer (for example staff) counts as taken. Other refusals stay vague, and sign-in stays vague |
| 4 | A guest with an account's email gets a separate "guest" customer | By design: guest orders aren't linked, because the email is unverified | Signed-out shoppers see "Have an account? Sign in to fill in your details and keep this order in your account" (`next=/checkout`). No email-lookup endpoint (see below) |
| 5 | Sort control misaligned on desktop | "Sort by" was stacked above the select, so the select sat lower than the search box | On desktop the label is inline and the select stretches to the search box height (measured 460–512 px for both at 1440 px). Phones keep the stacked layout |
| 6 | Remove Cart from the mobile bottom bar | — | Four items: Home, Shop, Search, Account. The cart stays in the header |
| 7 | Health goals on desktop should open like a category | It was a plain link | `DesktopMegaMenu` gets a `goals` panel with the six goals (`/shop?goal=…`); opens on hover and focus like Brands |
| 8 | A product with several photos shows only the thumbnail | `mapMedusaProduct` kept one image, and the page had no gallery | `Product.images` (main first, de-duplicated, only when there are several). Thumbnails under the main photo, as buttons with `aria-pressed` and "Show photo n / N" (EN/AR), scrolling sideways on narrow screens. Choosing a flavor returns to its own photo |

## Not a bug: "the website refreshes on its own"

The dev server's live reload: caught live, with every open tab reloading in the same second right after a route recompiled. A production build (`next build` + `next start`) stayed loaded for 5 idle minutes with no reload; the dev server reloaded within about 3. Nothing changed for it.

## Deliberately not built

- **A registration rate limit "per visitor".** Medusa sees every customer request from the storefront server, so a per-IP limit needs the real visitor IP. That's the same blocker as CART-5 (production proxy setup). A per-email limit would not stop checking many emails. The right control is a Cloudflare rate-limit rule on `/api/auth/register`, to set up at deployment. Duplicate-email checks run before any password hashing, so checking emails costs no hashing.
- **An "is this email registered?" lookup for the checkout hint.** Without a reliable per-visitor limit, it would be a free email-lookup API. The static sign-in hint gives the same benefit.

## Verification

- `npm run check`: backend 266, storefront 494 tests; typecheck and lint pass.
- `sign-in.spec.ts` (HTTP, Postgres): 14/14 pass, including the new "email already has an account" case (any letter case, a staff login's email, and no second customer).
- **New or changed unit tests:**
  - completion refusal vs unknown (400 stock, 400 other, 409, 503);
  - `pending-checkout` helper (saved fields, bad JSON, disabled storage);
  - register route 409 pass-through;
  - backend registration (taken vs vague);
  - goals panel;
  - the bottom bar has no Cart;
  - gallery thumbnails;
  - image mapping.
- **Live in the reviewed baseline:**
  - sign-up with a taken email shows the message and both links;
  - the sort control is aligned;
  - the goals panel opens on hover with six links;
  - a product with two photos switches the main photo;
  - checkout keeps the name and email after leaving and returning, and shows the sign-in hint when signed out;
  - the mobile bar has 4 items.
- **Not checked live:**
  - The refused-completion message: covered by unit tests. It needs the 10,000-unit test product in a cart.
  - The account autofill: no customer was signed in.

## Things to look at

- The 4xx classification in `completeCheckout`: is any 4xx other than 403 and 409 possible after Medusa actually placed the order?
- Checkout details live in sessionStorage (this tab only, cleared on sign-out and on success). Is it OK to keep PII there, or would you prefer memory only plus the reload issue being dev-only?
- The autofill uses the first saved address. Medusa has no "default address" flag in our data.

## GPT review, round 1 (2026-10-25)

- **[P2] A failed cart edit could discard an unresolved checkout retry.** `forgetPendingCart()` ran before the change was confirmed.
- **[P2] The checkout sign-in hint was English-only** on the Arabic site.
- **Checked and fine:** the 4xx classification matches Medusa 2.21 (400 refusals, 409 already completing, 200 cart for payment cases); sessionStorage for details; `email_taken`.
- **Validation:** 163/163 targeted storefront tests and 13/13 backend registration tests passed.

## Author response (`374d20f`)

- **P2 retry fixed.** The retry is dropped in `sendChange` only after Medusa confirms the change (`error === undefined`). A failed or rolled-back add, remove or quantity change keeps it. Checkout resets "Retry confirmation" to "Place order" when a confirmed change drops the retry.
  - New provider tests: a successful add drops the retry, and a failed add keeps it. The failure test fails on `373032e`.
- **P2 Arabic fixed.** The hint is two whole phrases ("Have an account?", plus a link reading "Sign in to fill in your details and keep this order in your account."), both in the Arabic dictionary.
  - Live on `/ar/checkout`: "عندك حساب؟ سجّل الدخول لملء بياناتك تلقائياً وحفظ هذا الطلب في حسابك."
- `npm run check`: backend 266, storefront 494 tests; typecheck and lint pass.

Round 2 requested: `374d20f` only.

## GPT review, round 2 (2026-10-25)

**Both round 1 findings resolved. No open problems.**
- The retry is preserved on a failed edit and dropped after a confirmed one. The checkout UI stays in sync.
- The Arabic hint phrases translate as whole text nodes.
- 22/22 targeted tests passed.
