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
| Redis holds the cache and locks whenever `REDIS_URL` is set; production runs PostgreSQL and Redis as Coolify resources. | 2026-10-06 |
| Managers may allocate stock to an order line ("Allocate items"), never more than the line still needs; they cannot reserve or release stock by hand. | 2026-10-06 |
| New variants keep the stock settings the form sends for now; which products track stock is decided with the Odoo sync work. | 2026-10-06 |
| Manager role redefined (replaces RD v1.1 section 2.2): full orders (incl. fulfil, refund, cancel, edit), products (incl. delete, publish, prices), brands, customers, promotions, price lists; inventory view only; in Settings only product types and tags. Store settings, staff, roles, API keys, regions, tax, shipping setup, workflows and future business pages (revenue) are admin only. Admin-only pages are hidden from managers in the dashboard. | 2026-10-06 |
| Incomplete storefront tasks from `mvp-remaining-work.md` are assigned to GPT on `gpt/work`, with Claude reviewing. GPT prepares the board and returns to Seif for approval before implementation. Other task ownership stays as assigned. | 2026-10-09 |

## In review

| Task | Author | Branch | Commits | Review file | Status |
|---|---|---|---|---|---|

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
| Guest account provisioning, expiry dates, analytics | RD asks for them; `docs/MVP-SCOPE.md` excludes or does not mention them. Seif to decide. |

## Open: ready to pick up

| Task | Owner | Status | Notes |
|---|---|---|---|
| Core 1. Egypt setup in code: EGP store currency, Egypt region, governorates, Cairo warehouse, shipping options | Claude | in progress | Size M. Seif (2026-10-09): warehouse address is Cairo, Egypt; one shipping option, flat 70 EGP; remove the demo data. Source: `mvp-remaining-work.md` section 1. The seed (`src/migration-scripts/initial-data-seed.ts`) still creates a Europe region, EUR/USD prices and T-shirts; the dev database has an EGP region made by hand, but a fresh or production database gets nothing. Needs from Seif: Cairo warehouse address; shipping option names and fees until Bosta replaces them (fees are a business rule, not to be invented); whether the T-shirt demo data is removed. |
| Core 2. Supplement attributes: EDA registration, serving size, servings per container, protein/carbs/fat per serving, flavours, key-metric tags | — | open | Size M. Partial today: only `metadata.servings` exists. Defined fields, validation, an admin editing widget, and the store API exposing them. Storefront display is a separate storefront task. Needs from Seif: confirm the field list and units, and which fields are required. |
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

| Homepage critique fixes (all five priorities) | GPT | gpt/work | in review | Commit c25bebd. All five implemented; independent follow-up review clear, provisional 28/40. Storefront: 152 tests, typecheck and lint pass (19 warnings). Full check: 184 backend tests pass, blocked by unchanged admin-access.spec.ts:78 type error. Live homepage/cart verification limited by unavailable Medusa backend. See docs/reviews/storefront-homepage-critique-fixes.md. No integration/package changes; owner merges. |

| GPT worktree Turbopack startup fix | GPT | gpt/work | done | Seif reported external node_modules junction panic on 2026-10-11. Next root includes the sibling dependency checkout only when storefront modules resolve outside this workspace. Normal installations keep the workspace root. Verified Turbopack startup and GET /categories HTTP 200; typecheck and targeted config lint pass. Test server stopped. No dependency/package/UI changes. |

## Category navigation and locale foundation (approved 2026-10-11)

| Task | Owner | Branch | Status | Notes |
|---|---|---|---|---|
| Native catalog translations and bilingual category setup | GPT | gpt/work | in review | f739bdc. Native translations, five parents/33 children, guarded local migrations and repeatable setup applied; dry run reuses all IDs. 187 backend tests, typecheck, lint and build pass. See docs/reviews/storefront-category-locales.md; Claude review and owner merge pending. |
| Locale URLs and translation compatibility | GPT | gpt/work | in review | b1f69a3 plus final compatibility completion in the dependent series. /en and /ar, server locale/RTL, keyed navigation/search text, localized links and screen-scoped legacy compatibility. 138 storefront tests, typecheck, lint and build pass; 19 existing warnings. |
| Shared desktop/mobile categories and removal of category directory | GPT | gpt/work | in review | Final commit in this series. Shared native hierarchy and descendant-ID filters; desktop/mobile/breakpoint/keyboard and cart-language continuity verified. Category page/client/CSS deleted; all three removed URLs return 404. Unrelated supplements root preserved. See handoff for live-check limits. Claude review and owner merge required. |
