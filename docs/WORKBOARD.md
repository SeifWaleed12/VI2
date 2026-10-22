# Workboard

Shared task list for every agent working in this repository (Claude, GPT).
Read this before starting. Claim a task by setting Owner and Status before
editing files. Do not work on a task another agent owns. Update the row when
you finish, and record anything left open in Notes.

Rules: see the root `AGENTS.md`. Shared files (`package.json`,
`package-lock.json`, `AGENTS.md`, `docs/decisions/`) need the owner's (Seif's)
approval before any change.

Cleaned up 2026-10-22. The older, longer board (every review round, run notes
and consolidation entries) is in this file's git history:
`git log -p docs/WORKBOARD.md`. Review details live in `docs/reviews/`.

## What's left to launch

In order of what blocks launch most. "Who" is who has to act next.

| # | What | Who | State |
|---|---|---|---|
| 1 | Paymob payments (cards, wallets, ValU) and cash on delivery | Seif (business answers), then Claude | Blocked. Production checkout stays switched off until it exists (`apps/backend/src/api/middlewares.ts`). |
| 2 | Bosta delivery: fee at checkout, shipments, tracking, status updates | Seif (business answers), then Claude | Blocked. Also needed for the "shipped" and "delivered" emails and the order tracking page (SF 9). |
| 3 | Odoo: stock into Medusa, orders and customers out to Odoo | Seif (access and contract), then Claude | Blocked. Details known so far are under "Blocked" below. |
| 4 | Load the real catalog (products, variants, SKUs, barcodes, images, brands) | Seif (Odoo export or a CSV) | Blocked on the data. |
| 5 | Email delivery: Resend account, verified domain, sender, API key | The client | Code merged (PR #11). Checklist below. |
| 6 | Image storage: Cloudflare R2 buckets and keys | Seif | Code merged (PR #10). Checklist below. |
| 7 | Egyptian VAT rate | Seif or the accountant | Prices already include tax; setting the rate in Admin splits it out. |
| 8 | Policy and business pages: final wording and business facts (address, contact, returns, shipping, terms, privacy) | Seif; legal and native Arabic review | Drafts exist and are hidden in production (RD-5). |
| 9 | Native Arabic review of categories, product page, emails and account page | Seif (a native speaker) | Open. |
| 10 | Production hosting: Coolify, Cloudflare proxy, domains, PostgreSQL and Redis | Seif, then Claude | Not started. Also unblocks CART-5. Deploy steps are under "Staging and production to-do". |
| 11 | Merge what is approved and finish manual testing | Seif | See "Waiting for Seif". |
| 12 | Sign-up email verification | Claude, when Seif says go | Recommended before launch: today anyone can register with an address they don't own. |

Not needed for launch (later phases): spending Vi2 Points (free-shipping offers), points expiry reminder email, SMS/WhatsApp messages, Meilisearch, "frequently bought together", analytics, phone OTP and Google/Apple sign-in, more staff roles.

## Waiting for Seif

| Item | Branch / PR | State |
|---|---|---|
| RD-6: combined release regression fixes (GPT) | [PR #13](https://github.com/SeifWaleed12/VI2/pull/13), `gpt/work` | Approved by Claude (`cd4eb90`). Seif is finishing his checks, then merges. |
| Products without a photo show their letter, not an empty image (Claude) | [PR #14](https://github.com/SeifWaleed12/VI2/pull/14), `claude/empty-image` | GPT approved round 3. Ready to merge. Review `docs/reviews/empty-image.md`. |
| Account page frontend (GPT, `account-page`) connected to the account backend (Claude, `claude/account-integration`): name and phone, email change with confirm page, saved addresses with field errors, Vi2 Points, newest-first orders | Not pushed yet | GPT approved round 4 (2026-10-21). In the reviewed baseline for Seif's manual test; Claude pushes and opens the PR after Seif's OK. Backend needs `STOREFRONT_URL` for email links. Reviews `docs/reviews/account-page.md`, `docs/reviews/account-integration.md`. |
| Manual acceptance of RD-3 (shop), RD-5 (footer, information pages), RD-6 and the account page | Reviewed baseline (`C:/Users/Seif Waleed/.codex/worktrees/reviewed-baseline/vi2`, ports 3000/9000, `vi2_dev`) | RD-6 checks left for Seif: real touch/pen, screen reader, native zoom, Firefox/Safari, the two separate outage retries. Checklist `docs/reviews/storefront-rd6-regression.md`. |

## In progress

| Task | Owner | Status | Notes |
|---|---|---|---|
| New product page in the admin (one form: brand, EDA, Arabic name, images, options, variants with SKU, barcode and EGP price) | Claude (another session) | experimental, `claude/new-product-page` (last commit 2026-10-17) | Seif (2026-10-17): its own branch so it can be tested and dropped. Medusa 2.21 can't add fields to its own create form. No stock field (Odoo owns stock). |

## Ready to pick up (needs Seif's go)

| Task | Owner | Notes |
|---|---|---|
| Sign-up email verification | Claude | Recommended (launch list #12). Send a link at registration; decide whether unverified accounts may order. |
| "Your email was changed" notice after the change is confirmed | Claude | Small. Today the old address is told when a change is requested, not when it completes. |
| Homepage critique follow-ups F1 and F2 | GPT | Not rechecked since 2026-10-17. F1: the "Best sellers" link and page claim popularity with no sales data. F2: the add-to-cart buttons in `ProductCard`, `FlashDeals` and `AccountClient` may still ignore a failed add. `docs/reviews/storefront-homepage-critique-fixes.md`. |
| Remove the shop-link prefetch workaround (RD-6 N1) | GPT | Only after a Next.js upgrade that keeps the right page title on category, search and brand changes. |

## Blocked

| Item | Why |
|---|---|
| Paymob, cash on delivery, Bosta, Odoo | Seif is collecting information. Do not build, stub or guess these until Seif releases the work. |
| Odoo details known so far (Seif, 2026-10-17) | Products come from Odoo first, then also created in Medusa. Matching key: SKU or barcode, not decided. One warehouse (Cairo). Orders and customers go to Odoo (RD 2.4 C). Claude recommends for stock: an Odoo webhook plus a full check every 15-30 minutes and nightly, safety stock subtracted, and a live check when an order is placed. |
| Emails 4-7: payment confirmed, payment failed with retry link, shipped with tracking link, delivered with invoice | Come with Paymob, Bosta and Odoo. Built today: staff invite, password reset, order received, email-change link and notice. |
| CART-5: limit how many carts one visitor can create | Needs the visitor's real IP, so the production proxy setup first. Suggested: 30 carts per 15 minutes per IP, reusing `attemptLimiterFrom`. |
| Guest account provisioning, expiry dates, analytics | The RD asks for them; `docs/MVP-SCOPE.md` excludes or doesn't mention them. Seif to decide. |
| SMS / WhatsApp messages ("Driver is on the way") | No provider chosen. |
| Storefront SF 3-10 | SF 3 supplement facts and video: needs confirmed product fields. SF 4 exact warehouse stock: needs Odoo. SF 5 frequently bought together: needs who picks the products and how they're stored. SF 6 search beyond 100 products: needs the Meilisearch decision (core shop filters already paginate natively, RD-3). SF 7 district autocomplete: needs a district dataset. SF 8 payment choice and failure messages: with Paymob. SF 9 order tracking: with Bosta. SF 10 full Arabic pass: after the real catalog. Owner GPT, reviewer Claude. |

## Setup checklists for Seif and the client

**Cloudflare R2 (image storage), Seif:**
1. Enable R2 (free plan, card required).
2. Create buckets `vi2-media-dev` (local) and `vi2-media` (production).
3. Dev bucket: turn on the r2.dev public URL. Production bucket: connect a custom domain such as `media.<shop domain>`.
4. CORS on each bucket: allow `GET` and `PUT` from the admin address (`http://localhost:9000` locally, the production admin URL later), headers `*`.
5. Create an R2 API token with Object Read & Write on that bucket only.
6. Set in `apps/backend/.env` (never in code or chat): `S3_FILE_URL` (public URL), `S3_BUCKET`, `S3_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (`S3_REGION` optional, default `auto`). Set the same public URL as `NEXT_PUBLIC_MEDIA_URL` in `apps/storefront/.env.local`.
7. Claude's live check: upload an image, product export and import, delete the test file. Images already on local disk are not moved.

**Resend (email), the client:**
1. Create a free account in the company's name (business email) and invite our developer as a member.
2. Domains → Add domain: add the shop's domain and the DNS records Resend shows (SPF, DKIM, optional DMARC). Wait until it says Verified.
3. Choose the sender, for example `Vi2 <orders@yourdomain.com>`.
4. API Keys → Create API key with "Sending access" only.
5. Set on the server in `apps/backend/.env` (never in code or chat): `RESEND_API_KEY` and `RESEND_FROM`. `STOREFRONT_URL` and `MEDUSA_BACKEND_URL` must be the public addresses so reset, invite and email-change links work.
6. Claude's live check: a password reset, a test order and an email change each deliver; check Gmail and Outlook and that nothing lands in spam. A native Arabic speaker reviews the wording.
7. Free plan: 100 emails a day (about 50 orders a day). Move to Pro (USD 20 a month) when regularly above that.

## Decided (by Seif)

| Decision | Date |
|---|---|
| MVP has exactly two roles: `admin` (full access) and `manager` (the Catalog Manager role). More roles are Phase 2. | 2026-10-06 |
| Login is email and password only. Phone OTP and OAuth 2 are Phase 2. | 2026-10-06 |
| Claude writes all code, GPT reviews. Storefront tasks are the exception: GPT writes, Claude reviews (2026-10-09). | 2026-10-06 |
| Code follows clean architecture and SOLID as written in `AGENTS.md` section 4.1. | 2026-10-06 |
| One review per task, never batched. | 2026-10-06 |
| Quick-variant merged with R3-1 and R3-2 accepted as known limitations; no further changes. | 2026-10-06 |
| Managers may not change `manage_inventory` or `allow_backorder`. Stock quantities come from Odoo and are never edited in Medusa. | 2026-10-06 |
| Passwords for staff and customers: at least 8 characters, nothing more. | 2026-10-06 |
| Sign-in is blocked for 15 minutes after 5 attempts, per account (staff and customers). Wrong current passwords on "change password" count too. | 2026-10-06 |
| Staff invites go out with the dashboard's "Copy invite link" until email is live. | 2026-10-06 |
| Customers get "change password" and "forgot password" (by email). | 2026-10-06 |
| Managers may allocate stock to an order line ("Allocate items"), never more than the line still needs; they cannot reserve or release stock by hand. | 2026-10-06 |
| New variants keep the stock settings the form sends for now; which products track stock is decided with the Odoo work. | 2026-10-06 |
| Manager role (replaces RD v1.1 section 2.2): full orders (incl. fulfil, refund, cancel, edit), products (incl. delete, publish, prices), brands, customers, promotions, price lists; inventory view only; in Settings only product types and tags. Store settings, staff, roles, API keys, regions, tax, shipping setup, workflows and future business pages are admin only and hidden from managers. | 2026-10-06 |
| Redis holds the cache, locks, event bus and workflow engine whenever `REDIS_URL` is set; public store reads are cached (REDIS-1). Production runs PostgreSQL and Redis as Coolify resources. | 2026-10-06, 2026-10-17 |
| Store is Egypt only: EGP, one Cairo warehouse, one delivery option at a flat 70 EGP until Bosta; Medusa's demo data removed. Prices include tax while the VAT rate is open. | 2026-10-09 |
| Incomplete storefront tasks from `mvp-remaining-work.md` are GPT's on `gpt/work`, reviewed by Claude. | 2026-10-09 |
| Hide the old `supplements` category root (Inactive) in every environment. | 2026-10-11 |
| CART-5 (cart creation limit) not built until the production proxy is known. | 2026-10-16 |
| Managers keep full shop access, including price and publish. Only the EDA number and approval are product fields; other facts go in the description. Odoo matching uses SKU and barcode until one is chosen. Brands come with the catalog import. | 2026-10-17 |
| Email goes through Resend (free plan first, Pro USD 20 a month when needed). The account and sending domain belong to the client. | 2026-10-18 |
| Postal code is optional at checkout (never a fake `00000`). Guest carts untouched for 30 days and never ordered are deleted nightly. Oversized components may be split. | 2026-10-19 |
| Account page: email change only through a link sent to the new address; saved addresses now (Egypt only); Vi2 Points at 1 point per EGP of products after discounts, earned on delivery, removed when a payment is refunded, balance expiring 12 months after the last earning, never below zero; spending (free-shipping offers) later. Rules P-1 to P-15 in `docs/reviews/account-page-backend.md`. | 2026-10-20 |

## Done

| # | Task | Owner (author, reviewer) | Merged | Review |
|---|---|---|---|---|
| 1 | Checkout confirmation needs a real Medusa order | GPT, Claude | cdfbea8, db8b2d8 | — |
| 2 | Lint/type errors; `npm run check` covers both apps | GPT, Claude | cdfbea8, e2af23c | — |
| 3 | Remove invented availability and social proof | GPT, Claude | cdfbea8, 8497eca | — |
| 4 | Validation, secrets, safe errors, admin authorization, timeouts | GPT, Claude | cdfbea8, e2af23c, b42edaf | — |
| 5 | AGENTS.md: clean architecture, SOLID, MVP decisions, multi-agent rules | Claude, Seif | fe48d5c | — |
| 6 | Quick-variant partial failure rolled back | Claude, GPT | f403587, fead9e2, 149a95d | `quick-variant.md` |
| 7 | RBAC module loaded; staff without a role denied | Claude, GPT | PR #1 | `rbac-module.md` |
| 8 | Sign-in hardening for staff and customers | Claude, GPT | PR #1 | `sign-in.md` |
| 9 | Manager role: full shop access, admin-only pages hidden, safe stock allocation | Claude, GPT | PR #1 | `manager-role.md` |
| 10 | Core 1: Egypt store setup (EGP, Cairo warehouse, 70 EGP delivery, demo removal) | Claude, GPT | f63599e | `egypt-store.md` |
| 11 | Core 2: EDA registration number and approval on products | Claude, GPT | f63599e | `product-eda.md` |
| 12 | Checkout HTTP tests | Claude, GPT | f63599e | `checkout-tests.md` |
| 13 | A customer's cart and order only through their login | Claude, GPT | f63599e | `order-owner.md` |
| 14 | Order export turned off (customer details in a public file) | Claude, GPT | 09ab9cb | `r2-storage.md` |
| 15 | Native category translations, /en and /ar URLs, shared category menus, /categories removed | GPT, Claude | 5d7bb9e | `storefront-category-locales.md` |
| 16 | Header, cart and ticker fixes | GPT, Claude | f63599e | `storefront-header-cart-tickers.md` |
| 17 | Homepage critique fixes | GPT, Claude | 5d7bb9e | `storefront-homepage-critique-fixes.md` (F1, F2 open, see above) |
| 18 | RD-1: catalog contract and shared product data | Claude, GPT | PR #2 | `catalog-contract.md` |
| 19 | CART-1 to CART-4: shared region lookup, cart kept through outages, one cart per browser, no invented delivery options | Claude, GPT | PR #3 | `cart-hardening.md` |
| 20 | RD-4: product page | Claude, GPT | PR #4 | `product-page.md` |
| 21 | RD-0, RD-0-NAV, RD-NAV-SIMPLE, RD-REVIEW-FIX, RD-2: typography, navigation, header and announcements | GPT, Claude | 3d4e981, PR #5 | `storefront-typography-foundation.md`, `storefront-header-announcements.md` |
| 22 | Checkout summary shows live totals including delivery | Claude, GPT | PR #6 | `checkout-totals.md` |
| 23 | Managers can create products from the dashboard form | Claude, GPT | PR #7 | `manager-create-product.md` |
| 24 | REDIS-1: cache public store reads; Redis event bus and workflow engine | Claude, GPT | PR #8 | — |
| 25 | RD-3: shop layout and real filters | GPT, Claude | 9e59489 | `storefront-shop-filters.md` |
| 26 | RD-5: footer logo and bilingual information drafts (hidden in production) | GPT, Claude | 9e59489 | `storefront-footer-information.md` |
| 27 | Core 3: R2 image storage, waiting only for credentials | Claude, GPT | PR #10 | `r2-storage.md` |
| 28 | Email through Resend and the "order received" email | Claude, GPT | PR #11 | `email-resend.md` |
| 29 | Cart polish: right flavor and quantity, optional postal code, 30-day guest cart cleanup (CART-6), lint 0 warnings, checkout summary split out | Claude, GPT | PR #12 | `cart-polish.md` |
| 30 | Account page backend: saved addresses (Egypt only), email change by link, Vi2 Points | Claude, GPT | PR #15 | `account-page-backend.md` |

## Known limits (accepted, not bugs to pick up)

- A signed-in shopper's cart stays a guest cart until checkout (`assignOrderOwner`).
- A guest cart id in the browser gives read access to that cart's email and address (Medusa default).
- Quick-variant R3-1 and R3-2, and the stock-allocation lock: 120 s lease with no per-request owner. Production needs Redis for locks if more than one server runs.
- Managers: Settings opens on Store; buttons for refused actions stay visible.
- Store cache: a read in flight when an admin write finishes can keep the old answer until its TTL.
- Category directory is fetched on every page view (no CDN caching); measure before adding revalidation (`docs/CATEGORY-LOCALES-DEPLOYMENT.md`).
- Vi2 Points follow Medusa refunds, so a return without a refund removes no points.
- `CheckoutClient.tsx` keeps its details and review steps together; splitting them needs many props.

## Staging and production to-do (remember before and after each deploy)

Nothing below has been run on staging or production. Local `vi2_dev` already has all of it. Full steps for categories: `docs/CATEGORY-LOCALES-DEPLOYMENT.md`.

| # | When | Do | Notes |
|---|---|---|---|
| 1 | Before deploying | Back up the target database. | Check the release runner uses that environment's database, not `vi2_dev`. |
| 2 | Before the new backend starts | From `apps/backend`: `node ../../node_modules/@medusajs/cli/cli.js db:migrate` | Creates the translation, EDA and Vi2 Points (`points_entry`) tables. No `--skip-*` flags. |
| 3 | After the migration | `... exec src/scripts/setup-egypt-store.ts` | EGP, Egypt region and tax region, Cairo warehouse, one 70 EGP delivery option, storefront key. Safe to rerun; stops without changes when the setup is ambiguous. |
| 4 | Only after step 3 succeeded, and only if Medusa's demo data is there | `... exec src/scripts/remove-demo-data.ts` | Refuses and deletes nothing if the European warehouse holds or reserves stock. Then check Admin shows one delivery option, 70 EGP. |
| 5 | After step 3 | Dry run: `... exec src/scripts/setup-wellness-catalog.ts` | Prints the database host, port and name first; confirm it is the right one. |
| 6 | After the dry run looks right | `... exec src/scripts/setup-wellness-catalog.ts apply`, then the dry run again | The second dry run must show reuse for all 38. Rerunning apply overwrites Admin edits to those categories. |
| 7 | After apply | In Admin, set the old `supplements` root to Inactive. | |
| 8 | After any deploy that changes the role table, and the first deploy | `... exec src/scripts/setup-catalog-manager.ts <admin-user-id>` | |
| 9 | Before the backend starts | Set `STOREFRONT_URL` and `MEDUSA_BACKEND_URL` to the public addresses; `RESEND_API_KEY` and `RESEND_FROM`; the `S3_*` settings. | Production refuses to start without R2. Without Resend, resets, order emails and email changes are not delivered; without `STOREFRONT_URL`, email change refuses. |
| 10 | After the backend release | Start the storefront with `SITE_URL` and `NEXT_PUBLIC_MEDIA_URL` set. | Check `/en` and `/ar`, Arabic RTL, category menus, shop filters, and that `/categories` returns 404. |
| 11 | After release | Manual checks: edit a category translation in Admin; switch language signed in with items in the cart; guest checkout offers one 70 EGP option; a signed-in customer's order appears in My orders; signing out empties the cart; the EDA box saves in Admin; Admin order export is refused. | |
| 12 | Always | Production checkout stays disabled until Paymob, Bosta and Odoo are released. | |

## How we work

**Roles:**
- **Seif (owner)** chooses tasks, passes messages between the agents, makes the decisions above, and is the only one who merges.
- **Author** writes the code on their own branch and folder: Claude in `vi2` (and its worktrees), GPT on `gpt/work` in `vi2-gpt-review`.
- **Reviewer** reports problems in `docs/reviews/<task>.md` and never edits the author's code.
- Claude authors backend and most tasks; GPT authors storefront UI tasks. The other one reviews.

**Flow for every task:**
1. The author claims the task here (Owner, Status).
2. The author builds it following `AGENTS.md` (Medusa first, clean architecture, thin routes, tests) and runs `npm run check`.
3. The author commits, moves the row to "Waiting for Seif" as in review, and writes a handoff in `docs/reviews/<task>.md`.
4. Seif asks the reviewer. The reviewer appends a round with each problem, its file and line, and why it matters.
5. The author fixes the problems on the same branch and answers each one in the review file.
6. When the reviewer has no open problems and `npm run check` passes, Seif merges into `full-stack` and the row moves to "Done".
7. Changes to permissions, roles, auth or `medusa-config.ts` are also checked in the running app, not only in tests.
8. Manual testing happens on the reviewed baseline (`C:/Users/Seif Waleed/.codex/worktrees/reviewed-baseline/vi2`), with frontend and backend from the same checkout, only when Seif asks.

**Reviewer checklist (from `AGENTS.md`):**
- Requirement met, and nothing beyond it.
- Uses a Medusa primitive instead of rebuilding one.
- Layers respected: thin routes, business rules in workflows/modules, provider code behind a contract, no business rules in UI components.
- Security: input validated, authorization checked on the server, no client-trusted prices, totals, stock or payment success, no secrets exposed.
- Failure, timeout and idempotency handled where relevant.
- Tests for the behavior and the negative cases; none deleted or weakened.
- Style: no semicolons, double quotes, 2 spaces, kebab-case files.
