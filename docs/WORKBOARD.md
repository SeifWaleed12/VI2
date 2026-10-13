# Workboard

Shared task list for every agent working in this repository (Claude, GPT).
Read this before starting. Claim a task by setting Owner and Status before
editing files. Do not work on a task another agent owns. Update the row when
you finish, and record anything left open in Notes.

Rules: see the root `AGENTS.md`. Shared files (`package.json`,
`package-lock.json`, `AGENTS.md`, `docs/decisions/`) need the owner's (Seif's)
approval before any change.

## How we work

Roles:
- **Seif (owner):** chooses the tasks, passes messages between the agents, makes
  the decisions listed below, and is the only one who merges.
- **Claude (author):** writes all the code, one task at a time, on branch
  `claude/work`.
- **GPT (reviewer):** reviews each finished task. GPT reports problems and does
  not edit the code.

Flow for every task:
1. Claude claims the task in "Open: ready to pick up" (Owner = Claude, Status =
   in progress).
2. Claude implements it on `claude/work`, following `AGENTS.md` (Medusa first,
   clean architecture, SOLID, thin routes, tests), and runs `npm run check`.
3. Claude commits, moves the task to "In review", and lists the commits and
   anything GPT should look at closely.
4. Seif tells GPT to review. GPT reads the changes between `full-stack` and
   `claude/work`, then writes `docs/reviews/<task-name>.md` with each problem,
   its file and line, and why it matters. GPT does not edit code.
5. Seif tells Claude to fix the review notes. Claude fixes them on the same
   branch and answers each note in the review file.
6. When GPT has no open problems and `npm run check` passes, Seif merges
   `claude/work` into `full-stack` and the task moves to "Done".
7. Any change to permissions, roles, auth or `medusa-config.ts` must also be
   checked in the running app (start the backend, log in, call the affected
   routes), not only in unit or integration tests.

GPT review checklist (from `AGENTS.md`):
- Requirement met, and nothing beyond it (no Phase-2 work, no unrelated refactor).
- Uses a Medusa primitive instead of rebuilding one.
- Layers respected: routes thin, business rules in workflows/modules, provider
  code behind a contract, UI components contain no business rules.
- SOLID and clean code (section 4.1), without abstractions that have no real benefit.
- Security: input validated, authorization checked server-side, no client-trusted
  prices/totals/stock/payment success, no secrets exposed.
- Failure, timeout and idempotency handled where relevant.
- Tests added for the behavior and the negative cases; none deleted or weakened.
- Style: no semicolons, double quotes, 2 spaces, kebab-case files.

## Decided (by Seif)

| Decision | Date |
|---|---|
| MVP has exactly two roles: `admin` (full access) and `manager` (the Catalog Manager role). More roles are Phase 2. | 2026-10-06 |
| Login is email and password only. Phone OTP and OAuth 2 are Phase 2. | 2026-10-06 |
| Claude writes all code, GPT reviews. Revisit once the process runs smoothly. | 2026-10-06 |
| Code follows clean architecture and SOLID as written in `AGENTS.md` section 4.1. | 2026-10-06 |
| One review per task, never batched. Claude does not start the next task until the current one is merged or Seif says otherwise. | 2026-10-06 |
| Quick-variant merged with R3-1 and R3-2 accepted as known limitations; no further changes. | 2026-10-06 |
| Managers may not change `manage_inventory` or `allow_backorder`. Stock quantities come from Odoo and are never edited in Medusa. | 2026-10-06 |
| Passwords for staff and customers: at least 8 characters, nothing more. | 2026-10-06 |
| Sign-in is blocked for 15 minutes after 5 attempts, per account (staff and customers). Wrong current passwords on "change password" count too. | 2026-10-06 |
| Staff invites go out with the dashboard's "Copy invite link". The SendGrid email code stays but is off; no paid email provider for now. | 2026-10-06 |
| Customers get "change password" and "forgot password" (by email). The reset email is only delivered once an email provider is configured. | 2026-10-06 |
| Store is Egypt only: EGP, one Cairo warehouse, one delivery option at a flat 70 EGP until Bosta; Medusa's starter demo data is removed. Prices are entered including tax while the VAT rate is open. | 2026-10-09 |
| Redis holds the cache and locks whenever `REDIS_URL` is set; production runs PostgreSQL and Redis as Coolify resources. | 2026-10-06 |
| Managers may allocate stock to an order line ("Allocate items"), never more than the line still needs; they cannot reserve or release stock by hand. | 2026-10-06 |
| New variants keep the stock settings the form sends for now; which products track stock is decided with the Odoo sync work. | 2026-10-06 |
| Manager role redefined (replaces RD v1.1 section 2.2): full orders (incl. fulfil, refund, cancel, edit), products (incl. delete, publish, prices), brands, customers, promotions, price lists; inventory view only; in Settings only product types and tags. Store settings, staff, roles, API keys, regions, tax, shipping setup, workflows and future business pages (revenue) are admin only. Admin-only pages are hidden from managers in the dashboard. | 2026-10-06 |

## In review

| Task | Author | Branch | Commits | Review file | Status |
|---|---|---|---|---|---|
| Cart access and order owner: a customer's cart and order only through their login | Claude | `claude/work` | 373cf6a, 1de0340, 213ef3e, 58800fb | `docs/reviews/order-owner.md` | Seif (2026-10-12): block orders attached to an account by email alone; (2026-10-13): a cart that belongs to a signed-in customer can only be changed or completed with that customer's login, and clear the cart on sign-out. Backend `src/api/cart-access.ts`: a cart becomes a customer's only through their login (created signed in, linked with `POST /store/carts/:id/customer`, or the order placed signed in), never through the checkout email (a guest cart keeps a guest record; a new guest cart cannot carry an email). An owned cart answers 403 to anyone else on every `/store/carts/:id` path and on `/store/payment-collections` for it; the order goes to the customer signed in when it is placed. Storefront: completion through `/api/checkout/complete`, which forwards the HttpOnly login (signed-in orders reach My orders again); sign-out clears the cart. Not covered: `/store/shipping-options?cart_id=` (lists options and prices, no personal data). Known limit (code comment): the customer is switched at completion without repricing, fine while no customer-group prices or promotions exist. Tests: 8 checkout HTTP tests (the 3 new protections fail without the guards), storefront route and sign-out tests; 69 HTTP, 194 backend and 114 storefront unit tests, typecheck and lint green. GPT round 1 (373cf6a): P2 owner race; not changed, see author response. GPT round 2: race accepted for guest carts; P2, a pending checkout survived sign-out and a 403 kept resuming; fixed in 58800fb (sign-out clears pending checkouts, 403 is a definite failure). GPT round 3: resolved, no open problems; approved. Ready to merge. |
| HTTP tests for cart and checkout (auth and admin access already covered by `sign-in.spec.ts` and `admin-access.spec.ts`) | Claude | `claude/work` | 58d64ec, 5d94e01 | `docs/reviews/checkout-tests.md` | Seif (2026-10-12): go. New `integration-tests/http/checkout.spec.ts`, 5 tests, following the storefront's calls (cart, items, email and addresses, delivery, `pp_system_default` session, complete): guest order totals 3000 + 70 EGP delivery, tax 0 (prices tax-inclusive), stock reserved; adding more than the warehouse holds refused, cart stays empty; a UK address refused ("not within region Egypt"); a returning customer's order (ordered as guest, then registered) reaches `/store/orders` only when the cart is linked to them, 401 without login; production completion refused and nothing reserved. Checked: the production test fails (200) without the gate. Tests only, no app code changed. 5/5 and `npm run check` green. GPT round 1: P2, the signed-in test sent a login the storefront never sends; fixed, and it exposed the storefront bug below. GPT round 2: resolved, no new problems; approved. Ready to merge. |
| Core 3. Product images and upload files on Cloudflare R2 | Claude | `claude/work` | e41dbf7, 8ad7860 | `docs/reviews/r2-storage.md` | Seif (2026-10-11): R2 (free egress, 10 GB free, Cloudflare already planned). `src/lib/file-config.ts` turns on Medusa's own `file-s3` provider when all of `S3_FILE_URL`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` are set (`S3_REGION` optional, default `auto`); none set keeps the local disk in dev; partial setup refuses to start; production refuses to start without a bucket; tests always use the disk. `acl: false` because R2 has no per-file permissions; the bucket is public. GPT round 1: P1, order exports (customer names, emails, addresses) would sit in the public bucket; fixed by turning `POST /admin/orders/export` off (403) by Seif's decision that the bucket is for images only; product and stock CSVs hold only catalog data. Unit tests and `npm run check` green. GPT round 2: resolved, no new problems; approved. Waiting on Seif: buckets, CORS and keys in `.env`, then the live check (upload, export, import, delete). |
| Core 2. EDA registration on products: number and approved / not approved | Claude | `claude/work` | 6116354 | `docs/reviews/product-eda.md` | Seif (2026-10-09): only the EDA number and approval become fields (other facts go in the description); admins and managers edit; the storefront shows them; approval does not block selling. New `eda` module (`eda_registration`, migration `Migration20261009165648`) linked one-to-one to products (deleted with the product); `setProductEdaWorkflow` / `removeProductEdaWorkflow`; `GET/POST/DELETE /admin/products/:id/eda`; admin widget on the product page; store API allows `eda_registration.registration_number` and `.is_approved`. 12 new HTTP tests; 60 HTTP and `npm run check` green. Dev database migrated. GPT round 1: no findings, approved; the required live-backend check (manager login, set/read/remove EDA, store API, 401 without login) passed. Ready to merge. |
| Core 1. Egypt store setup in code: EGP, Egypt region and tax region, Cairo Warehouse, one 70 EGP delivery option; starter demo removal | Claude | `claude/work` | 1831342, 565a344, b1c41bf | `docs/reviews/egypt-store.md` | Seif's inputs (2026-10-09): warehouse Cairo, Egypt; one option, flat 70 EGP; remove the demo; VAT unknown, so prices are tax-inclusive with no rate yet. `src/lib/egypt-store.ts` (settings), `src/scripts/setup-egypt-store.ts` (idempotent, also run by `initial-data-seed` on new databases), `src/scripts/remove-demo-data.ts` (explicit, refuses a warehouse holding stock). 6 new HTTP tests; 46 HTTP and `npm run check` green. Applied to Seif's dev database (setup, then demo removal). Governorates: not needed while one fee covers Egypt; they matter with Bosta zones. GPT round 1 (1831342 only): 2 P2s (an existing "Egypt" zone trusted by name; tax cleanup by country code) fixed with HTTP regressions; GPT round 2 (565a344, b1c41bf): both resolved, no new problems; approved. Ready to merge. |

## Done

| Task | Owner | Commit | Notes |
|---|---|---|---|
| 1. Trustworthy checkout confirmation + regression tests | GPT, then Claude | cdfbea8, db8b2d8 | Success requires a Medusa `order_` ID; confirmation page reads the order from Medusa. Unknown outcomes keep the same cart for retry. |
| 2. Lint/type errors; `npm run check` covers both apps | GPT, then Claude | cdfbea8, e2af23c | 0 errors. 21 storefront lint warnings remain (`<img>`, setState-in-effect), all in code not otherwise touched. |
| 3. Remove invented availability/social proof; brand/region owners | GPT, then Claude | cdfbea8, 8497eca | Brand comes from the linked Brand module; region must be a real EGP/EG Medusa region; ratings shown only when reviews exist (none do). |
| 4. Validation, secrets, safe errors, admin authorization, timeouts | GPT, then Claude | cdfbea8, e2af23c, b42edaf | Catalog Manager now matches RD v1.1 section 2.2 (no pricing, stock, publishing). Staff invite acceptance unblocked. Guest buyers can register. |
| 5. AGENTS.md: clean architecture, SOLID, MVP decisions, multi-agent rules | Claude | fe48d5c | Approved by Seif. |
| 6. Quick-variant partial failure: option or value is rolled back if the variant fails | Claude, reviewed by GPT (3 rounds) | f403587, fead9e2, 149a95d | Review: `docs/reviews/quick-variant.md`. 10 PostgreSQL integration tests pass; `npm run check` green. Merged by Seif's decision with two known limitations recorded in the review file (R3-1 timing risk with a concurrent native admin write; R3-2 lock has no per-request owner and expires after 120 s). Production needs a shared lock provider (Redis) if more than one server runs. |
| 7. RBAC module loaded; staff without a role denied | Claude, reviewed by GPT (3 rounds) | 226d9f0, e3a4024, 5f9448a | Review: `docs/reviews/rbac-module.md`. Merged by Seif in PR #1 (caf81ea). Manager rules were later redefined (task 9). |
| 8. Sign-in hardening for staff and customers | Claude, reviewed by GPT (2 rounds) | 6e96ac6, ccacb28 | Review: `docs/reviews/sign-in.md`. 5 attempts per account then 15 min block (GET and POST); 8-128 character passwords; change password (admin and storefront); storefront forgot password; invite and reset emails off until an email provider is set; Redis cache and locks via `REDIS_URL`. Seif tested admin Change password. Merged in PR #1. |
| 9. Manager role: full shop access, admin-only pages hidden, safe stock allocation | Claude, reviewed by GPT (4 rounds) | eaf4145, 8a31bad, babddff, ea99413, 9ec6062 | Review: `docs/reviews/manager-role.md`. Medusa's startup permission cleanup handled in `src/policies/project-policies.ts`. Merged in PR #1 with known limits: the allocation lock has the same 120 s ownerless lease as quick-variant R3-2; Settings opens on Store; buttons for refused actions stay visible. After each deploy that changes the role table, run `npx medusa exec ./src/scripts/setup-catalog-manager.ts <admin-user-id>`. |

## Open: blocked, waiting on Seif

| Item | Why it is blocked |
|---|---|
| Payment methods (Paymob), Bosta shipment ownership, Odoo sync contract | Seif is collecting more information. Do not build, stub or guess these until Seif releases the work. Production checkout stays disabled until then (`apps/backend/src/api/middlewares.ts`). |
| Cloudflare R2 bucket for Core 3 (live check, then merge) | Seif (2026-10-12): cannot create the R2 account now; do it later. Code is done and approved; without the `S3_*` values dev keeps the local disk, but production refuses to start. Steps: R2 Object Storage, activate the free plan (card needed); create bucket `vi2-media-dev` (Automatic); Settings, enable the r2.dev Public Development URL; Settings, CORS policy `[{"AllowedOrigins":["http://localhost:9000"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["*"]}]`; Manage API tokens, Object Read & Write on that bucket only; put `S3_FILE_URL`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` in `apps/backend/.env` (never in chat). Then tell Claude for the live check (upload, product export/import, delete). Before the first production deploy: a second bucket `vi2-media` with a custom domain. |
| Egyptian VAT rate | Seif (2026-10-09): rate still unknown; use best practice meanwhile. Done in Core 1: EGP prices and the Egypt region are tax-inclusive, and the Egypt tax region has no rate (0%). When Seif (or the accountant) sets the rate in the admin, prices shown to customers stay the same and tax is split out of them. |
| Guest account provisioning, expiry dates, analytics | RD asks for them; `docs/MVP-SCOPE.md` excludes or does not mention them. Seif to decide. |

## Open: ready to pick up

| Task | Owner | Status | Notes |
|---|---|---|---|
| After merging Core 1 and Core 2: update each existing database (staging, production) | Seif (or whoever deploys) | open | New databases need nothing: `initial-data-seed` runs the Egypt setup. For each existing database, from `apps/backend` with that database's `.env`, run once, in order: 1. `npx medusa db:migrate` (creates the EDA table); 2. `npx medusa exec ./src/scripts/setup-egypt-store.ts` (EGP, Egypt region, Cairo Warehouse, 70 EGP delivery; safe to rerun); 3. only if the starter demo (Europe region, European Warehouse, t-shirt products) is there: `npx medusa exec ./src/scripts/remove-demo-data.ts` (it refuses if the European Warehouse holds stock); 4. `npx medusa exec ./src/scripts/setup-catalog-manager.ts <admin-user-id>` (keeps the manager role's permissions current). Run step 3 only after step 2 succeeded. Redis must be running when `REDIS_URL` is set, or prefix the commands with `REDIS_URL=`. Then check in the admin: one delivery option, Standard Delivery 70 EGP, and the EDA box on a product page. |
| Storefront: show the EDA number and an "EDA approved" badge on the product page | GPT | open | Size S. Backend done in Core 2: request `eda_registration.registration_number,eda_registration.is_approved` in the store product fields (`apps/storefront/src/lib/medusa/services/products.ts`). Show the badge only when `is_approved` is true; show nothing when a product has no registration. Owner decision 2026-10-09. Needs Core 2 merged, and step 1 of the database update above on the database the storefront uses. |
| Storefront: allow the R2 image host in `next/image` | GPT | open | Size S. Needs Core 3. `apps/storefront/next.config.ts` `images.remotePatterns` must allow the bucket's public hostname (the backend's `S3_FILE_URL`, an r2.dev address in dev, a custom domain in production), read from an env var the way `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is today. Without it product images uploaded after Core 3 do not render. |
| Storefront: readable category addresses (`/[locale]/shop/<handle>`) | GPT | open | Size S. Seif (2026-10-13). Today choosing a category opens `/en/shop?category_id=pcat_...`: bad for search ranking, unreadable when shared, and every link breaks if the category is recreated (for example when the real catalog loads in Core 4). Use the category's Medusa `handle` (e.g. `/en/shop/protein`, same English handle for `/ar/`); `getCategoryByHandle` already exists in `lib/medusa/services/categories.ts`. Menus and category links point to the new address; old `?category_id=` links redirect permanently (308) to it; unknown handle shows the 404 page. Filters and sorting stay query parameters (`?brand=...&sort=...`). |
| Storefront: remove invented fallback delivery options | GPT | open | Size S. `apps/storefront/src/lib/medusa/services/shipping.ts` shows hard-coded "Standard 85 EGP / Express 140 EGP" with env or fake IDs when the backend call fails or returns nothing. Those prices are invented and the IDs cannot be ordered. Show an error and let the customer retry instead. Found during Core 1. |
| Core 4. Load the real supplement catalog (products, variants, SKUs, barcodes, images) | — | blocked | Size M. Blocked on a data source: an Odoo export once Odoo access is known, or a CSV from Seif. Depends on Core 1 (EGP prices) and Core 2 (attributes). |
| Remaining storefront lint warnings | — | open | Low priority; style only. |
| Split oversized storefront components (for example `ProductDetailClient.tsx`, `CheckoutClient.tsx`) | — | open | Matches the clean code goal, but is a refactor. Needs Seif's approval before starting. |
