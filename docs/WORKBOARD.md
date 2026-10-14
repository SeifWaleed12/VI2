# Workboard

Shared task list for every agent working in this repository (Claude, GPT).
Read this before starting. Claim a task by setting Owner and Status before
editing files. Do not work on a task another agent owns. Update the row when
you finish, and record anything left open in Notes.

Rules: see the root `AGENTS.md`. Shared files (`package.json`,
`package-lock.json`, `AGENTS.md`, `docs/decisions/`) need the owner's (Seif's)
approval before any change.

## Approved baseline consolidation — 2026-10-13

| Task | Owner | Status | Notes |
|---|---|---|---|
| Consolidate reviewed GPT header/cart/tickers and Claude Egypt/EDA/checkout/cart-access into full-stack | GPT, authorized by Seif | merged locally on owner authorization | Seif authorized consolidation on 2026-10-13. Includes finalized cart-access fixes through 58800fb, approved in 03ef5cf. Both apps use one full-stack checkout and vi2_dev for manual testing. R2 remains excluded pending bucket/live checks. Claude local files and review drafts preserved. Evidence: docs/reviews/reviewed-baseline-consolidation.md. |

## Storefront redesign delivery (released by Seif, 2026-10-13)

Seif asked to start the redesign plan, divide tasks between GPT and Claude, and record ownership here. This entry authorizes the scoped repair sequence; it does not claim implementation has started in Claude's chat. Initial shared baseline: full-stack f63599e. Existing cart-access work is finished and consolidated.

Preserve The Wellness Editorial: Ink, Warm Paper and Muted Stone; Bebas Neue/Inter for English and Cairo for Arabic; crisp commerce surfaces and the existing logo/icon system. Improve composition and readability within that identity. Use Impeccable and Ponytail; no speculative features or dependencies. Shop/product interfaces are code-first; any separately requested marketing composition follows the saved comp-first preference.

### Tasks and ownership

| ID | Task | Author | Reviewer | Status | Scope and acceptance |
|---|---|---|---|---|---|
| RD-0 | Shared English/Arabic typography foundation | GPT | Claude | in review | First GPT task. Establish readable text roles (starting targets: 16px body/form text, 14px navigation/filter labels; larger headings with appropriate line-height). Reuse existing fonts and tokens; correct broad RTL heading overrides and tiny labels across shared controls. Preserve display hierarchy; Arabic uses Cairo and untracked text. Audit homepage, shop, product, footer, account, cart and checkout for remaining local overrides. Ownership: globals.css, rtl-support.css, font setup and shared typography styles. Publish the token/role handoff before other authors apply local styles. Implementation: 16899c0, 8bf7e95. Shared chrome/cards/discovery/account/checkout text consumes rem roles; locale-aware titles replace generic Arabic size overrides. Shop changes only its shared title role; local filters and product detail remain RD-3/RD-4. Root check: 368 tests, type/lint pass (20 existing warnings); production storefront build passes. EN/AR computed roles and 320/390/980/981/1440 reflow checked. Backend synchronized to approved full-stack 09ab9cb via f1c1f6e. Author handoff: docs/reviews/storefront-typography-foundation.md. Preview localhost:3001; Seif merges after Claude review. |
| RD-0-NAV | Correct desktop navigation regression reported by Seif | GPT | Claude | in review | Completed 2026-10-15 after independent Impeccable assessments. Three frontend files: explicit category/utility/promotion groups; shared 1680px header/dropdown shell; 14px controls centered in a 64px band at 1400px+, deliberate categories then secondary row at 981–1399px, existing mobile drawer at 980px and below. EN/AR live geometry checks pass at ten requested widths per locale, including both sides of the breakpoints (981 request resolves to 982 in this browser). Both mobile drill/back flows, desktop keyboard/Escape, dropdown anchoring and empty cart verified. 368 tests, type/lint and production build pass; 20 existing lint warnings. No backend/catalog/copy change. Handoff: docs/reviews/storefront-navigation-layout-fix.md. Candidate localhost:3001; Seif approves merge after Claude review. |
| RD-NAV-SIMPLE | Simplify navigation destinations and grouping | GPT | Claude | in review | Completed 2026-10-15 on Seif request. Removed New, Bundles and Shop Products from desktop/mobile menus and the redundant dropdown sidebar. Five native categories lead; Brands/Health Goals/Deals form one secondary cluster. Restored 1440px header shell, distinct group spacing, compact secondary row, unchanged mobile drill/back and Shop all. 171 storefront tests, TypeScript via production build, lint/build pass; 20 existing lint warnings. EN/AR live geometry and interaction checks pass. Handoff: docs/reviews/storefront-navigation-simplification.md. No backend/page removal or merge. |
| RD-1 | Verified catalog contract and shared product data | Claude | GPT | assigned; ready to claim after baseline sync | First Claude task, parallel with RD-0. Inspect installed Medusa 2.21 native support before custom code. Prove public categories/descendants, active brand IDs, combined category+brand+search filtering, bounded limit/offset and accurate total count; locale explicit. Include products beyond the first 100 and unknown/inactive IDs, empty results and API failures. Prefer native APIs; if linked-brand filtering has a real gap, supply the smallest Medusa extension with tests, no storefront full-catalog filtering or unapproved index/cache. Own backend catalog routes/contracts plus shared products.ts, types/product.ts and adapter tests; keep existing getProducts callers compatible. Expose actual category IDs/handles, brand IDs and optional EDA number/approval for the product task. No new supplement-fact fields, inventory rules, auth changes or provider work. Freeze/document request-response fields before RD-3/RD-4. |
| RD-2 | Header alignment, bilingual categories and announcement copy | GPT | Claude | queued after RD-0 | Vertically align utility links with wrapped desktop category labels; preserve mobile drawer and dropdown/cart layering. Verify all five parents/33 children already come from the localized backend; fix only any reproducible remaining fallback issue, never hardcode a second taxonomy. Remove announcement items ENGLISH & ARABIC and SHOP SUPPLEMENTS IN EGP in both languages. Suggested truthful replacements: Find your daily essentials / اكتشف مكملات روتينك اليومي; Vitamins, minerals & sports nutrition / فيتامينات ومعادن وتغذية رياضية; Explore the collection / اكتشف المنتجات. Preserve motion, pause controls and reduced-motion behavior. Check desktop, mobile and both sides of the 980/981 breakpoint. |
| RD-3 | Shop layout and real core filters | GPT | Claude | queued; needs RD-0 and reviewed RD-1 | Rebuild aligned desktop sidebar and accessible mobile filter sheet using shared typography. Keep only backend-backed categories, brands, search and pagination. Remove unsupported diet/allergen/health-goal/form/rating controls and any unverified price/availability sorting or filters. Active selections/chips, clear filters and page reset use URL state; preserve locale on refresh/back/share. Fetch bounded pages with authoritative totals, never filter the first 100 locally. Include loading, empty, invalid input, backend failure/retry and directory failure without breaking all-products browsing. Integrate existing readable category-address task: /[locale]/shop/<handle>, legacy category_id links resolve to the matching handle with 308 and preserve other parameters, unknown handles 404; /categories stays removed. Own shop routes/UI and frontend catalog/category-link integration. Do not edit RD-1 shared services until its contract is merged. |
| RD-4 | Product page, variant selector and truthful information | Claude | GPT | queued; needs RD-0 and reviewed RD-1 | Use the agreed fonts and neutral palette; replace purple variant treatment with Ink/Warm Paper states, visible selection/focus and unavailable variants. Replace hardcoded key info with actual product/variant/description fields; omit absent facts. Show only backend EDA registration number and explicit approval; no registration means no badge, approval does not block purchase. Real assigned categories use stable IDs/handles and valid shop destinations, with readable labels. Remove Complete the Routine and redesign/remove unsupported authenticity/trust claims. Preserve product images, authoritative prices/stock, selection, add-to-cart and checkout/session behavior. Own ProductDetailClient/CSS, VariantSelector/CSS and product-specific children/tests; no global typography or shared catalog-service edits. Never claim ingredient/serving/clinical facts without a confirmed field/source. |
| RD-5 | Footer logo, navigation and bilingual business/policy drafts | GPT | Claude; Seif approves content | queued after RD-0/RD-2 | Replace text Vi2 footer wordmark with supplied logo asset and accessible alt text; make footer typography readable in both languages. Replace fake text destinations with real localized About, Contact, Shipping, Returns, Terms and Privacy page interfaces. Prepare English/Arabic drafts with missing business facts explicitly marked in review drafts. Draft policy content is preview/review only until Seif approves; never publish placeholders as factual policies. Hide unsupported authenticity/social destinations until evidence or real URLs exist. Preserve real category links. Reuse page/component patterns, no CMS dependency. Business identity, contact details and binding policy terms remain owner inputs. |
| RD-6 | Combined release, manual acceptance and regression checks | GPT coordinates | Claude reviews GPT tasks; GPT reviews Claude tasks | queued after individual task reviews | Relevant behavior tests, both type/lint checks and production builds; Impeccable detector once after finished UI. Batch EN/AR desktop/mobile/breakpoint visual checks, fix findings together, at most one confirmation round. Check keyboard, focus, wrapping/zoom, catalog filters beyond page one, absent product data, outage handling, cart/account/checkout and removed category routes. Record source commits and remaining manual/business checks; Seif approves merges. Run frontend and backend from the same approved full-stack release with the same intended local database; no mixed author-backend/GPT-frontend manual acceptance. |

### Parallel work and file boundaries

1. GPT begins RD-0. Claude may claim RD-1 in his chat after safely bringing the consolidated baseline into his branch; save unrelated local files first. Existing pending R2 work must remain separate from redesign commits.
2. RD-0 defines shared text roles; Claude applies them locally without changing globals. RD-1 owns shared product types/services until its reviewed handoff is merged. GPT owns global styles, layout/font setup, navigation, footer, shop and shared interface dictionaries. Product-only copy additions touching a shared dictionary must be coordinated or applied serially by its owner.
3. After RD-0/RD-1 review and owner-approved merge: GPT works on RD-2/RD-3 while Claude works on RD-4. GPT then handles RD-5. Each author completes one task at a time; each task has its own review.
4. Reviewers report findings without editing the other author's code. Seif remains merge owner; this release of work is not blanket merge approval. Do not alter package/lock/AGENTS files or run catalog setup/migrations without the applicable approved task.
5. Candidate backend+frontend validation must use one combined source checkout. Approved manual testing remains on the canonical full-stack checkout at C:/Users/Seif Waleed/.codex/worktrees/reviewed-baseline/vi2, ports 9000/3000, vi2_dev. Update both together after approved merges; identify the tested release. Claude's pending R2 branch is not the manual-test backend.

### Existing backlog reconciliation

- The EDA storefront-display row is delivered within RD-1/RD-4; do not claim a second competing task.
- Readable category addresses are delivered within RD-3; existing category IDs remain data authority.
- The former SF-2 categories page remains removed; this plan never recreates /categories.
- SF-3 invented supplement metrics are removed/omitted in RD-4; adding new structured facts/video still requires released data contracts.
- SF-5 routine cross-sell is removed here; no recommendation engine or new association model.
- Core search/pagination delivery in RD-1/RD-3 resolves the first-100 browser limitation for these core filters; Meilisearch expansion remains separate.
- Invented checkout delivery fallback removal remains a separate small task, not silently bundled into this redesign.
- R2, real catalog loading, VAT, Paymob/Bosta/Odoo, exact warehouse stock, reviews and unrelated refactoring keep their existing blocked/open states.

Preparation result: workboard only. No UI/backend implementation changes, no deployment, no additional process startup, no catalog mutations, and no message sent to Claude's chat. Claude assignment is recorded for Seif to pass along.

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

## Storefront author/reviewer exception (Seif, 2026-10-09)

For the storefront tasks below, **GPT is the author on `gpt/work` in
`vi2-gpt-review`; Claude is the reviewer**. The earlier Claude-author/GPT-reviewer
flow continues for other tasks, including Claude's claimed Core 1 work.

1. GPT prepares this backlog and returns to Seif for approval before implementation.
2. After approval and resolution of any task-specific blockers, GPT claims one task
   as in progress, implements it in its own folder on `gpt/work`, adds relevant
   tests, and runs the configured checks required by `AGENTS.md`.
3. GPT commits the task and moves it to "In review", recording the task commits,
   checks and review focus. Seif passes the task to Claude for review.
4. Claude records findings in `docs/reviews/storefront-<task-name>.md`; the reviewer
   does not edit GPT's implementation. GPT resolves the findings on `gpt/work`.
5. One review per task. Seif approves and performs any merge; GPT starts the next
   task after the current task is merged or Seif explicitly permits it.

Work only in the assigned folder. Shared-file changes still require Seif's
approval. Integration work remains unreleased until Seif supplies the contracts.
The initial update prepared tasks only. Seif authorized SF 1 on 2026-10-09; other task releases and merge approvals are recorded separately.

## Decided (by Seif)

| Decision | Date |
|---|---|
| MVP has exactly two roles: `admin` (full access) and `manager` (the Catalog Manager role). More roles are Phase 2. | 2026-10-06 |
| Login is email and password only. Phone OTP and OAuth 2 are Phase 2. | 2026-10-06 |
| Claude writes all code, GPT reviews. Revisit once the process runs smoothly. See the storefront exception of 2026-10-09 above. | 2026-10-06 |
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
| Incomplete storefront tasks from `mvp-remaining-work.md` are assigned to GPT on `gpt/work`, with Claude reviewing. GPT prepares the board and returns to Seif for approval before implementation. Other task ownership stays as assigned. | 2026-10-09 |

## In review

| Task | Author | Branch | Commits | Review file | Status |
|---|---|---|---|---|---|
| Core 2. EDA registration on products: number and approved / not approved | Claude | `claude/work` | 6116354 | `docs/reviews/product-eda.md` | Seif (2026-10-09): only the EDA number and approval become fields (other facts go in the description); admins and managers edit; the storefront shows them; approval does not block selling. New `eda` module (`eda_registration`, migration `Migration20261009165648`) linked one-to-one to products (deleted with the product); `setProductEdaWorkflow` / `removeProductEdaWorkflow`; `GET/POST/DELETE /admin/products/:id/eda`; admin widget on the product page; store API allows `eda_registration.registration_number` and `.is_approved`. 12 new HTTP tests; 60 HTTP and `npm run check` green. Dev database migrated. GPT round 1: no findings, approved; the required live-backend check (manager login, set/read/remove EDA, store API, 401 without login) passed. Ready to merge. |
| Core 1. Egypt store setup in code: EGP, Egypt region and tax region, Cairo Warehouse, one 70 EGP delivery option; starter demo removal | Claude | `claude/work` | 1831342, 565a344, b1c41bf | `docs/reviews/egypt-store.md` | Seif's inputs (2026-10-09): warehouse Cairo, Egypt; one option, flat 70 EGP; remove the demo; VAT unknown, so prices are tax-inclusive with no rate yet. `src/lib/egypt-store.ts` (settings), `src/scripts/setup-egypt-store.ts` (idempotent, also run by `initial-data-seed` on new databases), `src/scripts/remove-demo-data.ts` (explicit, refuses a warehouse holding stock). 6 new HTTP tests; 46 HTTP and `npm run check` green. Applied to Seif's dev database (setup, then demo removal). Governorates: not needed while one fee covers Egypt; they matter with Bosta zones. GPT round 1 (1831342 only): 2 P2s (an existing "Egypt" zone trusted by name; tax cleanup by country code) fixed with HTTP regressions; GPT round 2 (565a344, b1c41bf): both resolved, no new problems; approved. Ready to merge. |

## Done

| Task | Owner | Commit | Notes |
|---|---|---|---|
| SF 1. Storefront UI integration verification | GPT, reviewed by Claude | `98f4b35`, `fa6636f`; review `3ddfc5e` on `claude/work` | Closed by Seif on 2026-10-09. UI content already incorporated in `full-stack`; 24 exact file matches and five intentional later differences. Documentation only. |
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
| Egyptian VAT rate | Seif (2026-10-09): rate still unknown; use best practice meanwhile. Done in Core 1: EGP prices and the Egypt region are tax-inclusive, and the Egypt tax region has no rate (0%). When Seif (or the accountant) sets the rate in the admin, prices shown to customers stay the same and tax is split out of them. |
| Guest account provisioning, expiry dates, analytics | RD asks for them; `docs/MVP-SCOPE.md` excludes or does not mention them. Seif to decide. |

## Open: ready to pick up

| Task | Owner | Status | Notes |
|---|---|---|---|
| Storefront: show the EDA number and an "EDA approved" badge on the product page | — | open | Size S. Backend done in Core 2: request `eda_registration.registration_number,eda_registration.is_approved` in the store product fields (`apps/storefront/src/lib/medusa/services/products.ts`). Show the badge only when `is_approved` is true; show nothing when a product has no registration. Owner decision 2026-10-09. |
| Storefront: remove invented fallback delivery options | — | open | Size S. `apps/storefront/src/lib/medusa/services/shipping.ts` shows hard-coded "Standard 85 EGP / Express 140 EGP" with env or fake IDs when the backend call fails or returns nothing. Those prices are invented and the IDs cannot be ordered. Show an error and let the customer retry instead. Found during Core 1. |
| Core 3. Product image storage on S3/R2 | — | open | Size S. Today uploads go to the local file provider and are lost on redeploy. Use Medusa's own `file-s3` provider, switched on by env vars (like SendGrid). Needs from Seif: an R2 bucket, its public URL and access keys, set in `.env` (never in code). |
| Core 4. Load the real supplement catalog (products, variants, SKUs, barcodes, images) | — | blocked | Size M. Blocked on a data source: an Odoo export once Odoo access is known, or a CSV from Seif. Depends on Core 1 (EGP prices) and Core 2 (attributes). |
| HTTP integration tests for auth, cart, checkout, admin access | — | open | Needs a test PostgreSQL. `npm run test:integration:http` in `apps/backend`. |
| Remaining storefront lint warnings | — | open | Low priority; style only. |
| Split oversized storefront components (for example `ProductDetailClient.tsx`, `CheckoutClient.tsx`) | — | open | Matches the clean code goal, but is a refactor. Needs Seif's approval before starting. |

## Storefront backlog preparation

| Task | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| Transfer incomplete storefront items from the MVP checklist | GPT | `gpt/work` | approved by Seif | Requested by Seif on 2026-10-09. Prepare the backlog for Seif's approval; implementation follows approval. |

## Storefront: assigned backlog

Source: `mvp-remaining-work.md`, section 2, assessment dated 2026-10-09 against
`full-stack` at `caf81ea`. Source states and estimates are copied from that
assessment, not a fresh implementation audit. All eight Partial/Not started
items are included, plus the unmerged UI update and the remaining Arabic/RTL pass.
Seif closed SF 1 and released SF 2 on 2026-10-09. SF 1's source state has been corrected after inspection; other source states remain assessment-derived. Each task uses the storefront author/reviewer exception above. "Blocked" tasks
also await Seif's approval; approval alone does not resolve their dependencies.

| Task | Source state | Size left | Owner | Reviewer | Branch | Status | Scope / dependencies |
|---|---|---|---|---|---|---|---|
| SF 1. Verify integration of the `front` UI update | Already incorporated (verified) | S | GPT | Claude | `gpt/work` | done; closed by Seif | Seif authorized SF 1 on 2026-10-09. All 29 UI-update files checked against `full-stack`: 24 exact matches, five preserve later data/auth/availability fixes. UI content entered through `cdfbea8`; no code reapplication or merge needed. Evidence: `docs/storefront-ui-integration-handoff.md`, commit `98f4b35`. Claude approved with no actionable findings in review commit `3ddfc5e` on `claude/work`. Seif approved closure and released SF 2 on 2026-10-09. The source checklist is in Claude's folder and must be corrected there by its owner; the corrected state is recorded here. |
| SF 2. Categories page and mega menu from Medusa categories | Partial (assessment); SF 2 implementation reverted | S | GPT | Claude | `gpt/work` | reverted at Seif request; awaiting new direction | Seif requested full SF 2 rollback on 2026-10-11. Reverted implementation `f744658` and fixes `823c7eb`, removed SF 2 handoff/response documents, restored pre-SF 2 category/menu/shop behavior. Later homepage commits `c25bebd` and `6ab9652` and unrelated drafts preserved. Do not restart SF 2 without new direction. Rollback verified against pre-SF 2 blobs (20 exact restored/removed paths; two Navbar paths preserve only later homepage edits). Typecheck passes; lint passes with 0 errors/21 warnings. Normal storefront tests: 112 pass, 3 later homepage-render tests fail with the React 18/19 mismatch after reverting SF 2 Jest mapping; not hidden or fixed outside rollback scope.
| SF 3. Product key-metrics bar, supplement facts and video preview | Partial | M | GPT | Claude | `gpt/work` | blocked | Depends on Core 2's confirmed supplement fields, units and store API. Confirm the video source/field before wiring the preview. Display authoritative values and handle absent data without invented claims. |
| SF 4. Product warehouse stock badge | Partial | S | GPT | Claude | `gpt/work` | blocked | Generic in/out of stock already works. Exact quantity and Cairo-warehouse wording depend on the released Odoo stock contract and Medusa exposure of warehouse stock. No direct Odoo access or invented quantities. |
| SF 5. Frequently bought together cross-sell | Not started | S | GPT | Claude | `gpt/work` | blocked | The assessment suggests admin-picked related products. Seif must confirm selection ownership and how the relationship is stored/exposed through Medusa before implementation. Use real products, variants, prices and availability. |
| SF 6. Search beyond the first 100 products | Partial | M | GPT | Claude | `gpt/work` | blocked | Replace browser-only filtering of the first 100 products. Confirm the Medusa-facing search contract and Meilisearch setup/index ownership before implementation. Keep Medusa authoritative and paginate results; no full-catalog browser fetch or unapproved dependency. |
| SF 7. Checkout district autocomplete | Not started | S | GPT | Claude | `gpt/work` | blocked | Confirm the district dataset/service and governorate-to-district mapping with Seif before implementation. Reuse checkout address validation and preserve entered address data. Do not invent geographic data or call private provider APIs from the browser. |
| SF 8. Checkout payment method choice and bilingual failure/retry messages | Not started | M | GPT | Claude | `gpt/work` | blocked | Built with the released Paymob/backend payment work; use RD 2.4's bilingual matrix and confirmed method availability. Preserve unknown-payment recovery, duplicate-submit protection and real-order confirmation. Test-provider labels must not imply live payment support. |
| SF 9. Account order detail and tracking page | Not started | M | GPT | Claude | `gpt/work` | blocked | Depends on the released Bosta tracking contract and Medusa-facing order/tracking data. Customer-owned orders must be authorized by the backend; handle loading, missing tracking and failures without invented delivery states. |
| SF 10. Arabic / RTL pass with the real catalog | Done; follow-up remains | S | GPT | Claude | `gpt/work` | blocked | Existing Arabic/RTL is complete per the assessment. Run the remaining full pass after Core 4's real catalog is loaded and the approved storefront changes land. Check product/category content, selectors, navigation and checkout; fix findings within this task. |

Proposed order after approval: SF 1, then SF 2; pick up SF 3-9 individually as
their contracts/data are confirmed and released; SF 10 follows the real catalog
and storefront changes. Existing lint-warning and component-refactor rows above
remain separate and are not claimed by this transfer.

## Impeccable setup

| Task | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| Impeccable storefront initialization | GPT | gpt/work | done | Seif requested init and confirmed storefront customers and comp-first on 2026-10-10. Created apps/storefront/PRODUCT.md; saved buildPath=comp and Next.js live configuration after CSP detection found no policy. No UI or application behavior changed. |

| Impeccable storefront design documentation | GPT | gpt/work | done | Seif requested document on 2026-10-10 and confirmed The Wellness Editorial, confident and editorial atmosphere, Ink/Warm Paper/Muted Stone, flat at rest with softly layered panels, and crisp square commerce surfaces with pill utility controls. Created apps/storefront/DESIGN.md and .impeccable/design.json with seven component previews. Source-based extraction; no running preview available. Application code unchanged. |

| Impeccable storefront homepage critique | GPT | gpt/work | done | Seif requested critique and authorized two independent assessments on 2026-10-10. Target apps/storefront/src/app/page.tsx and composed homepage/navigation. Independent source design review plus detector completed; provisional 21/40, two P1 and three P2 priorities. Snapshot stored under apps/storefront/.impeccable/critique. Browser localhost:3000 refused connection; no overlay or app services started. No application code changed. |

| Homepage critique fixes (all five priorities) | GPT | gpt/work | merged `5d7bb9e`; 2 follow-ups open | Commit c25bebd. All five implemented; independent follow-up review clear, provisional 28/40. Storefront: 152 tests, typecheck and lint pass (19 warnings). Full check: 184 backend tests pass, blocked by unchanged admin-access.spec.ts:78 type error. Live homepage/cart verification limited by unavailable Medusa backend. See docs/reviews/storefront-homepage-critique-fixes.md. No integration/package changes; owner merges.  Claude approved with two should-fix items (`docs/reviews/storefront-homepage-critique-fixes.md` on `claude/work`): F1 the mega-menu "BEST SELLERS" link and `/best-sellers` page wording still claim popularity; F2 the other add-to-cart buttons (`ProductCard`, `FlashDeals`, `ProductDetailClient`, `AccountClient`, `ProductValueOffer`) still ignore the cart result. Not fixed yet. |

| GPT worktree Turbopack startup fix | GPT | gpt/work | done | Seif reported external node_modules junction panic on 2026-10-11. Next root includes the sibling dependency checkout only when storefront modules resolve outside this workspace. Normal installations keep the workspace root. Verified Turbopack startup and GET /categories HTTP 200; typecheck and targeted config lint pass. Test server stopped. No dependency/package/UI changes. |

## Staging and production to-do (remember before and after each deploy)

Nothing below has been run on staging or production. Local `vi2_dev` already has the translation migration and the 38 categories. Full steps: `docs/CATEGORY-LOCALES-DEPLOYMENT.md`.

| # | When | Do | Notes |
|---|---|---|---|
| 1 | Before deploying | Back up the target database. | Check the release runner uses that environment's database, not `vi2_dev`. |
| 2 | Before the new backend starts | From `apps/backend`: `node ../../node_modules/@medusajs/cli/cli.js db:migrate` | Creates the Translation Module tables. No `--skip-links --skip-scripts --skip-search` flags (those were local only). `medusa-config.ts` and the migration ship together. |
| 3 | After the migration | Dry run: `... exec src/scripts/setup-wellness-catalog.ts` | Prints the database host, port and name first; confirm it is the right one. Lists create/reuse for the 38 categories. |
| 4 | After the dry run looks right | Apply: `... exec src/scripts/setup-wellness-catalog.ts apply`, then rerun the dry run | Second dry run must show reuse for all 38. Rerunning apply overwrites Admin edits to those names, ranks and Arabic labels. |
| 5 | After apply | In Admin, set the old `supplements` root to Inactive. | Seif's decision 2026-10-11. Products keep their assignments. |
| 6 | After the backend release | Start the storefront release. | Check `/en` and `/ar`, Arabic RTL, the category menus, shop filters, and that `/categories` returns 404. |
| 7 | After release | Manual checks: edit a category translation in Admin as staff; switch language as a signed-in customer with items in the cart. | Neither was exercised by GPT or Claude. |
| 8 | Before launch | Native Arabic speaker reviews the 38 labels (`apps/backend/src/lib/wellness-categories.ts`). | Owner task. |
| 9 | After any deploy that changes the role table | `npx medusa exec ./src/scripts/setup-catalog-manager.ts <admin-user-id>` | From task 9 (manager role). |
| 10 | When Core 1 (Egypt setup) merges | Run its setup script on staging/production and review the demo-data removal first. | Not merged yet; add exact commands then. |
| 11 | Always | Production checkout stays disabled until Paymob, Bosta and Odoo are released. | See "Open: blocked". |


## Category navigation and locale foundation (approved 2026-10-11)

| Task | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| Native catalog translations and bilingual category setup | GPT | gpt/work | merged `5d7bb9e` | f739bdc. Native translations, five parents/33 children, guarded local migrations and repeatable setup applied; dry run reuses all IDs. 187 backend tests, typecheck, lint and build pass. See docs/reviews/storefront-category-locales.md; Claude approved the initial series; follow-up recheck and owner merge pending.  Merged into `full-stack` as `5d7bb9e` on 2026-10-11 (local; not pushed). Claude approved: `docs/reviews/storefront-category-locales-review.md` on `claude/work`. |
| Locale URLs and translation compatibility | GPT | gpt/work | merged `5d7bb9e` | b1f69a3 plus final compatibility completion in the dependent series. /en and /ar, server locale/RTL, keyed navigation/search text, localized links and screen-scoped legacy compatibility. 138 storefront tests, typecheck, lint and build pass; 19 existing warnings.  Merged into `full-stack` as `5d7bb9e` on 2026-10-11 (local; not pushed). Claude approved: `docs/reviews/storefront-category-locales-review.md` on `claude/work`. |
| Shared desktop/mobile categories and removal of category directory | GPT | gpt/work | merged `5d7bb9e` | Final commit in this series. Shared native hierarchy and descendant-ID filters; desktop/mobile/breakpoint/keyboard and cart-language continuity verified. Category page/client/CSS deleted; all three removed URLs return 404. Unrelated supplements root preserved. See handoff for live-check limits. Claude approved the initial series; follow-up recheck and owner merge required.  Merged into `full-stack` as `5d7bb9e` on 2026-10-11 (local; not pushed). Claude approved: `docs/reviews/storefront-category-locales-review.md` on `claude/work`. |
| Category locale review follow-up (F1-F5) | GPT | gpt/work | merged `5d7bb9e` | Seif requested fixes on 2026-10-11. F1 routing fixed; F2 performance limit recorded; F3 production runbook and safe database-target output added; F4 reconciliation overwrite documented; F5 owner decisions listed below. 341 tests, workspace check and both builds pass; final backend lint clean, 19 existing storefront warnings. Guarded local native dry run reports the target and reuses all 38 categories. See docs/reviews/storefront-category-locales.md. Claude recheck and owner merge pending; no catalog apply or deployment.  Merged into `full-stack` as `5d7bb9e` on 2026-10-11 (local; not pushed). Claude approved: `docs/reviews/storefront-category-locales-review.md` on `claude/work`. |
| Category directory performance limit (F2) | GPT | gpt/work | known limit | MVP pages are dynamic and refetch paginated categories with no-store on every page view; React cache deduplicates only within each request/locale, up to 8 s per API request, no full-page CDN caching. Preserves Admin changes on refresh. Measure traffic/latency before agreeing per-locale revalidation. See docs/CATEGORY-LOCALES-DEPLOYMENT.md. |
| Category content decisions (F5) | Seif | - | awaiting owner | Review Arabic wording with a native speaker and decide the preserved unrelated public supplements root's Arabic translation/visibility or reorganization. Existing assignments and the root remain intact. Signed-in Admin translation edits and customer language/cart checks still need manual verification.  Decided 2026-10-11: hide the old `supplements` root in Admin (Inactive); do it in every environment. Arabic wording review still open. |

## Header, cart and ticker fixes (approved 2026-10-12)

| Task | Owner | Reviewer | Branch | Status | Notes |
|---|---|---|---|---|---|
| Language destination label, signed-in first name, cart layering/focus, product and brand motion | GPT | Claude | gpt/work | approved; included in consolidation | Approved 2026-10-12. 352 tests and workspace check pass; production storefront build passes. Live EN/AR, empty/populated cart, keyboard, mobile and 981/980 breakpoint checked. Normal-motion visual loop and live signed-in customer check remain; see docs/reviews/storefront-header-cart-tickers.md. No backend/catalog/dependency changes. Owner merges. |

## Current follow-ups retained from Claude (2026-10-13)

Cart access, checkout tests, Egypt setup and EDA backend are included in this consolidation. Their older ready-to-merge rows above describe the original reviews; the consolidation entry supersedes those release statuses.

| Task | Owner | Status | Notes |
|---|---|---|---|
| R2 file provider and public-bucket order-export protection | Claude / Seif | excluded; waiting on bucket/live checks | e41dbf7, 8ad7860 approved in review, not merged here. No R2 setup performed. |
| Readable category addresses /[locale]/shop/<handle> | GPT | open | Seif requested 2026-10-13. Existing ID links remain for this release. |
| EDA registration display on product pages | GPT | open | Backend now consolidated. Show only the two owner-approved fields. |
| Remove invented fallback delivery options | GPT | open | Preserve real backend prices; show retry on failure. |
| R2 image hostname in next/image | GPT | blocked on R2 | Use the configured public hostname after Core 3. |
| Shop, product, footer, Arabic typography and navigation design repairs | GPT / Claude | planning | Preserve agreed core filters; bilingual business/legal drafts require owner review. No redesign in this consolidation. |
