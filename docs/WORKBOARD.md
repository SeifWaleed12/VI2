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


## RD-0 reviewed-baseline update - 2026-10-15

| Task | Owner | Status | Notes |
|---|---|---|---|
| Bring latest reviewed RD-0 and menu fixes into reviewed-baseline | GPT, authorized by Seif | complete locally | full-stack fast-forwarded from a68cbd1 to approved candidate 43a7b97. Includes RD-0, RD-0-NAV, RD-NAV-SIMPLE and RD-REVIEW-FIX; approved RD-1 retained. Backend source is unchanged from a68cbd1. Claude approval 84f3573 is copied into the review artifact. No push, database changes or service restart. Remaining manual checks: signed-in/populated-cart states and native zoom. |

## Redis store caching (requested by Seif, 2026-10-17)

| ID | Task | Author | Reviewer | Status | Notes |
|---|---|---|---|---|---|
| REDIS-1 | Cache public catalog reads in Redis; Redis event bus and workflow engine | Claude | GPT | `claude/redis-dev` (from `full-stack`) 4a107a8, 54c407f; GPT round 1 on 4a107a8: no findings. **Round 2 requested for 54c407f** (cache read timeout after the Redis-down hang; review only that diff and `store-cache.unit.spec.ts`). Seif skipped the integration test | `apps/backend/src/lib/store-cache.ts`, wired in `api/middlewares.ts`; table in `docs/ARCHITECTURE.md`. Seif asked for this explicitly, so it counts as the justified requirement for AGENTS.md rule 11. Live check 2026-10-17: repeat reads served from Redis, Arabic kept apart, and with Redis stopped the first version hung forever (the Redis client queues commands), so the cache read now times out after 250 ms; store answered in about 0.3 s with Redis down. Not checked live: an admin write clearing the cache (`integration-tests/http/store-cache.spec.ts` is written but needs the test PostgreSQL password to run). A read already in flight when an admin write finishes can store the old answer for up to its TTL. |

## Cart and region hardening (requested by Seif, 2026-10-16)

Seif asked Claude to audit the cart and fix what the audit found. This includes the "Remove invented fallback delivery options" follow-up that was listed for GPT. Seif reassigned it to Claude in this request. GPT: please don't start it.

| ID | Task | Author | Reviewer | Status | Notes |
|---|---|---|---|---|---|
| CART-1 | Shared region lookup | Claude | GPT | approved | `resolveRegionId` (`apps/storefront/src/lib/medusa/services/regions.ts`) now shares one `GET /store/regions` between concurrent product/cart calls and keeps it 60 s. An empty answer (Medusa down) is not kept. `RegionProvider` still calls `getRegions` directly. Test: `services/__tests__/regions.test.ts`. |
| CART-2 | A Medusa outage no longer replaces the shopper's cart | Claude | GPT | approved | `getCart` returned `null` for every error, so `CartProvider` created a new empty cart and overwrote the saved id on any network blip. Now `null` is returned only for 404 (gone) or 403 (belongs to another account's login); other failures throw and the saved id is kept. `removeCartItem` keeps its existing "failed to retrieve" error. Tests: `services/__tests__/cart-shipping.test.ts`, `providers/__tests__/cart-load.test.ts`. |
| CART-3 | One cart per browser, not two | Claude | GPT | approved | `CartProvider` loaded or created the cart from both `refreshCart` and `getOrCreateCart` with no guard. React's double effect in dev, or an Add before the first load ended, sent two `POST /store/carts` and orphaned one. Both now share one in-flight promise (`loadOrCreateCart`, `useRef`). Test: `providers/__tests__/cart-load.test.ts`. |
| CART-4 | Remove invented fallback delivery options | Claude | GPT | approved | `getShippingOptions` no longer invents "Standard 85 / Express 140" options with env or fake IDs. Only Medusa's options are shown, and failures throw. Checkout shows "Loading delivery options…", or "Delivery options could not be loaded. Try again" with a retry button. Ordering still refuses to continue without an option (existing check). `MEDUSA_SHIPPING_STANDARD_ID`/`_EXPRESS_ID` were removed from `apps/storefront/.env.template`. Local `.env.local` still has them; they are now unused. |
| CART-5 | Rate-limit `POST /store/carts` | — | — | blocked, waiting on Seif | Seif decided 2026-10-16: not built now. Guest cart creation has no account, so the limit must count per visitor IP. Behind Cloudflare/Coolify every visitor shares the proxy's IP unless Medusa trusts the proxy's client-IP header (no trust-proxy setting exists today). Needs the deployment/proxy decision first, then a policy (suggested 30 carts / 15 min per IP, reusing `attemptLimiterFrom`). |
| CART-6 | Clean up abandoned guest carts | — | — | blocked, waiting on Seif | Seif decided 2026-10-16: open decision, no deletion code. Needs a retention period from Seif (for example 30 days untouched, no account, not completed) before a scheduled job is built. |

Branch: `claude/cart-hardening` (commits 90bca58, 2da69b5), built from `full-stack` 3d4e981 so it can merge without the pending R2 work. It is the same code as 8c490b8 on `claude/work`, copied on 2026-10-16 after the other session committed it there. Checks on `claude/cart-hardening`: `npm run check` passes, with 197 storefront tests (11 new), 199 backend tests, typecheck, and lint 0 errors / 21 warnings. Not checked in a running browser. GPT round 1 (on 8c490b8 and 90bca58): P2, the delivery card could wait forever without a cart and called an empty option list a failure; fixed in 2da69b5, after which `npm run check` passes with 201 storefront tests. Review: `docs/reviews/cart-hardening.md`. GPT round 2: resolved, no open problems; approved. Ready to merge.

Review focus for GPT:
- `loadOrCreateCart` resets the shared promise in `finally`, so a failed load can be retried.
- A 403 cart is treated as "start a new cart", the same as the old behavior for that case.
- Checkout's delivery card when options are empty or loading.

Also added `docs/API-REFERENCE.md`, a documentation-only inventory of every HTTP request in the project.

Known audit findings not fixed (no owner decision yet):
- A signed-in shopper's cart stays a guest cart until checkout (`assignOrderOwner`, documented shortcut).
- A guest cart id in localStorage gives read access to that cart's email and address (Medusa default).
- Rapid quantity clicks are not queued.
- The optimistic add matches on product, not variant.
- Missing postal code defaults to `00000`.

## Storefront redesign delivery (released by Seif, 2026-10-13)

Seif asked to start the redesign plan, divide tasks between GPT and Claude, and record ownership here. This entry authorizes the scoped repair sequence; it does not claim implementation has started in Claude's chat. Initial shared baseline: full-stack f63599e. Existing cart-access work is finished and consolidated.

Preserve The Wellness Editorial: Ink, Warm Paper and Muted Stone; Bebas Neue/Inter for English and Cairo for Arabic; crisp commerce surfaces and the existing logo/icon system. Improve composition and readability within that identity. Use Impeccable and Ponytail; no speculative features or dependencies. Shop/product interfaces are code-first; any separately requested marketing composition follows the saved comp-first preference.

### Tasks and ownership

| ID | Task | Author | Reviewer | Status | Scope and acceptance |
|---|---|---|---|---|---|
| RD-0 | Shared English/Arabic typography foundation | GPT | Claude | done: merged into full-stack (3d4e981, pushed 2026-10-15) | First GPT task. Establish readable text roles (starting targets: 16px body/form text, 14px navigation/filter labels; larger headings with appropriate line-height). Reuse existing fonts and tokens; correct broad RTL heading overrides and tiny labels across shared controls. Preserve display hierarchy; Arabic uses Cairo and untracked text. Audit homepage, shop, product, footer, account, cart and checkout for remaining local overrides. Ownership: globals.css, rtl-support.css, font setup and shared typography styles. Publish the token/role handoff before other authors apply local styles. Implementation: 16899c0, 8bf7e95. Shared chrome/cards/discovery/account/checkout text consumes rem roles; locale-aware titles replace generic Arabic size overrides. Shop changes only its shared title role; local filters and product detail remain RD-3/RD-4. Root check: 368 tests, type/lint pass (20 existing warnings); production storefront build passes. EN/AR computed roles and 320/390/980/981/1440 reflow checked. Backend synchronized to approved full-stack 09ab9cb via f1c1f6e. Author handoff: docs/reviews/storefront-typography-foundation.md. Preview localhost:3001; Seif merges after Claude review. |
| RD-0-NAV | Correct desktop navigation regression reported by Seif | GPT | Claude | done: merged into full-stack (3d4e981, pushed 2026-10-15) | Completed 2026-10-15 after independent Impeccable assessments. Three frontend files: explicit category/utility/promotion groups; shared 1680px header/dropdown shell; 14px controls centered in a 64px band at 1400px+, deliberate categories then secondary row at 981–1399px, existing mobile drawer at 980px and below. EN/AR live geometry checks pass at ten requested widths per locale, including both sides of the breakpoints (981 request resolves to 982 in this browser). Both mobile drill/back flows, desktop keyboard/Escape, dropdown anchoring and empty cart verified. 368 tests, type/lint and production build pass; 20 existing lint warnings. No backend/catalog/copy change. Handoff: docs/reviews/storefront-navigation-layout-fix.md. Candidate localhost:3001; Seif approves merge after Claude review. |
| RD-NAV-SIMPLE | Simplify navigation destinations and grouping | GPT | Claude | done: merged into full-stack (3d4e981, pushed 2026-10-15) | Completed 2026-10-15 on Seif request. Removed New, Bundles and Shop Products from desktop/mobile menus and the redundant dropdown sidebar. Five native categories lead; Brands/Health Goals/Deals form one secondary cluster. Restored 1440px header shell, distinct group spacing, compact secondary row, unchanged mobile drill/back and Shop all. 171 storefront tests, TypeScript via production build, lint/build pass; 20 existing lint warnings. EN/AR live geometry and interaction checks pass. Handoff: docs/reviews/storefront-navigation-simplification.md. No backend/page removal or merge. |
| RD-REVIEW-FIX | Resolve Claude typography/navigation review findings | GPT | Claude | done: merged into full-stack (3d4e981, pushed 2026-10-15) | Completed 2026-10-15: adba911 fixes F1/F2/F3, hero T1/T2, drawer T3 and sticky header N1 from Claude review 71e4fb9. Only the 72.8px search/account/cart row remains sticky; categories/announcement scroll normally. EN/AR 320–1440px checks pass, native dropdown/focus and cart retained. Approved RD-1 baseline a68cbd1 synchronized via f97d08c; backend restarted and new live brand filter verified. Root check: 186 storefront +199 backend tests, both type/lint checks and production build pass; 20 existing lint warnings. Handoff: docs/reviews/storefront-review-fixes.md. Claude recheck 84f3573 approved all seven findings. Seif authorized the local baseline update on 2026-10-15; full-stack fast-forwarded to 43a7b97. Two non-blocking follow-ups remain for RD-2: dismiss orphaned dropdowns on scroll and label desktop navigation/utility landmarks. Review: docs/reviews/storefront-review-fixes-review.md. |
| RD-1 | Verified catalog contract and shared product data | Claude | GPT | merged into full-stack a68cbd1: `claude/rd1-catalog` 7d79579, ad051aa, 28a011b; GPT round 1: 2 P2s (OR within a filter list; invalid filters vs outages) fixed in 28a011b; GPT round 2: resolved, no open findings; approved. Merged via PR #2; contract `docs/CATALOG-CONTRACT.md`; review `docs/reviews/catalog-contract.md`. Found and fixed: the product-brand link allowed one product per brand; category id/name/handle were silently dropped by the store API. Open (not RD-1): nothing assigns a brand to a product yet. 75 HTTP (6 new), 199 backend and 178 storefront unit tests, typecheck and lint green. | First Claude task, parallel with RD-0. Inspect installed Medusa 2.21 native support before custom code. Prove public categories/descendants, active brand IDs, combined category+brand+search filtering, bounded limit/offset and accurate total count; locale explicit. Include products beyond the first 100 and unknown/inactive IDs, empty results and API failures. Prefer native APIs; if linked-brand filtering has a real gap, supply the smallest Medusa extension with tests, no storefront full-catalog filtering or unapproved index/cache. Own backend catalog routes/contracts plus shared products.ts, types/product.ts and adapter tests; keep existing getProducts callers compatible. Expose actual category IDs/handles, brand IDs and optional EDA number/approval for the product task. No new supplement-fact fields, inventory rules, auth changes or provider work. Freeze/document request-response fields before RD-3/RD-4. |
| RD-2 | Header alignment, bilingual categories and announcement copy | GPT | Claude | done: merged into full-stack (PR #5, 1da0723) | Vertically align utility links with wrapped desktop category labels; preserve mobile drawer and dropdown/cart layering. Verify all five parents/33 children already come from the localized backend; fix only any reproducible remaining fallback issue, never hardcode a second taxonomy. Remove announcement items ENGLISH & ARABIC and SHOP SUPPLEMENTS IN EGP in both languages. Suggested truthful replacements: Find your daily essentials / اكتشف مكملات روتينك اليومي; Vitamins, minerals & sports nutrition / فيتامينات ومعادن وتغذية رياضية; Explore the collection / اكتشف المنتجات. Preserve motion, pause controls and reduced-motion behavior. Check desktop, mobile and both sides of the 980/981 breakpoint. Completed 2026-10-15: shared keyed EN/AR announcements replace both unwanted messages; existing motion hook supplies pause/resume, hover/focus/visibility pause and static keyboard-browsable Reduced Motion. Announcement text uses 14px UI role. Closed recheck R1/R2: dismiss dropdown when category band is obscured by sticky header, preserve keyboard focus in search, name navigation and language/currency region. Live Medusa inventory: five parents +33 children, Arabic names present (CoQ10 scientific label retained), all 16 EN/AR desktop/mobile samples match native child names and IDs exactly. No category mapping, backend/catalog changes or dependency changes. 190 storefront tests, TypeScript, lint (20 existing warnings) and production webpack build pass. Impeccable: zero primary findings, 18 existing advisory notes. Handoff: docs/reviews/storefront-header-announcements.md. Preview localhost:3001; full-stack remains approved RD-0 baseline until review and owner merge. Claude 566b90f approved with A1-A6 follow-ups; response appended to the handoff. A1 preferences region scoped to its controls; A2 static viewport named; A3 static RTL order corrected; A4 redundant pressed states removed from three ticker action buttons; A5 focus-out closes dropdown (partial-scroll gap not reproduced: anchor follows band in EN/AR); A6 covered drawer layers inert with Back/opener focus restoration. Ten live EN/AR samples at 320/390/980/982/1440 pass; normal motion explicitly exercised for A0. 193 storefront tests pass; final production type check/build and lint pass (20 existing warnings). Claude recheck 3b89351 approved with B1/B2/B3 follow-ups, now addressed: first-scroll/resize dismissal, ignore null focus-out on empty panel clicks, existing drawer focus hook reused for named modal and opener recovery. Shared hook adds one bounded retry after the first paint for visibility transitions and cancels pending frames. Final ten EN/AR browser samples pass actual wheel/click and Enter/Tab/Escape checks, including 28 Tabs contained per mobile sample, drill/Back, hamburger recovery and empty-cart focus. 196 storefront tests, final production typecheck/build and lint pass (20 existing warnings). Final Claude recheck 0062ed8 approves implementation 1c3a90e: B1/B2/B3 fixed, no new findings; 196 tests and TypeScript independently pass. Real desktop wheel/blank-panel clicks, EN/AR mobile Tab/Shift+Tab/Enter/Escape, panel isolation and shared cart focus verified. A0 retains GPT normal-motion proof; Claude browser forces Reduced Motion. No backend/catalog changes or merge. |
| RD-3 | Shop layout and real core filters | GPT | Claude | Claude approved 093048b (ebb62bc / de16e1e); merged locally into reviewed-baseline on Seif authorization 2026-10-18; manual acceptance pending | Claude recheck 4862257 approved ff05125; minor R1-R3 follow-up: configured SITE_URL (production ignores Host), desktop category results focus, populated later-page canonicals. 283 tests/typecheck/lint/build pass; live production hostile-Host probe and EN/AR focus pass; deployment must set SITE_URL. Claude review a86729c addressed: removed invalid goal links, desktop navigation links preserve brand-toggle focus, native sheet retained, localized metadata/canonical/noindex, 307 name bookmarks vs 308 IDs, one empty live announcement. 273 tests/typecheck/lint/build pass; detector no findings; live EN/AR keyboard and HTTP checks pass. See appended review response in handoff. Completed 2026-10-17 from approved 707c1ab: native 24-product pages/totals, category descendants and handles, stable brands/search, URL state/chips/pagination, invalid/empty/outage recovery, English/Arabic server copy, aligned sidebar and accessible mobile sheet. 262 storefront tests, TypeScript, lint (0 errors/15 existing warnings) and production build pass. Live EN/AR 320/390/980/982/1440, keyboard, 308/404, language/Back/refresh and actual outage/retry checked. Same-checkout preview frontend/backend 3001/9001, vi2_dev; no backend/catalog/dependency changes. One live product: beyond-100 pagination covered in tests. Handoff: docs/reviews/storefront-shop-filters.md.  Rebuild aligned desktop sidebar and accessible mobile filter sheet using shared typography. Keep only backend-backed categories, brands, search and pagination. Remove unsupported diet/allergen/health-goal/form/rating controls and any unverified price/availability sorting or filters. Active selections/chips, clear filters and page reset use URL state; preserve locale on refresh/back/share. Fetch bounded pages with authoritative totals, never filter the first 100 locally. Include loading, empty, invalid input, backend failure/retry and directory failure without breaking all-products browsing. Integrate existing readable category-address task: /[locale]/shop/<handle>, legacy category_id links resolve to the matching handle with 308 and preserve other parameters, unknown handles 404; /categories stays removed. Own shop routes/UI and frontend catalog/category-link integration. Do not edit RD-1 shared services until its contract is merged. |
| RD-4 | Product page, variant selector and truthful information | Claude | GPT | done: merged into full-stack (PR #4, 44ae1c9). Branch `claude/rd4-product` 94a4c43, faa13d1; GPT approved in round 2; handoff and reviews `docs/reviews/product-page.md`. Also fixed Seif's product-page screenshot issues (font sizes, invented key info, trust tiles, related chips, similar items). Open: native-speaker check of the Arabic copy. | Use the agreed fonts and neutral palette; replace purple variant treatment with Ink/Warm Paper states, visible selection/focus and unavailable variants. Replace hardcoded key info with actual product/variant/description fields; omit absent facts. Show only backend EDA registration number and explicit approval; no registration means no badge, approval does not block purchase. Real assigned categories use stable IDs/handles and valid shop destinations, with readable labels. Remove Complete the Routine and redesign/remove unsupported authenticity/trust claims. Preserve product images, authoritative prices/stock, selection, add-to-cart and checkout/session behavior. Own ProductDetailClient/CSS, VariantSelector/CSS and product-specific children/tests; no global typography or shared catalog-service edits. Never claim ingredient/serving/clinical facts without a confirmed field/source. |
| RD-5 | Footer logo, navigation and bilingual business/policy drafts | GPT | Claude; Seif approves content | code approved by Claude 5bd4a01 through d92f80d; merged locally into reviewed-baseline on Seif authorization 2026-10-18; manual acceptance and policy content approval pending | Final confirmation 5bd4a01 approves d92f80d: G1 fixed, no doubled offsets; real EN/AR home and shop anchors independently verified at 96px; 329 tests and TypeScript independently pass. No remaining code-review findings. Claude recheck 7a80b33 approves F1-F3 and production guard. G1: four-line low-specificity default 96px content-anchor margin; existing margins are not doubled. Live EN/AR default/explicit anchors land at 96px. 329 tests/type/lint/build pass; final code confirmation complete. Claude review 369b9eb preserved; reproduced fragment focus without scrolling, fixed shared template once with frame/timer cleanup and fragment-aware route/history handling; sidebar label preserves h1-first outline; breadcrumb links 44px. 329 tests/TypeScript/lint/build pass (15 existing warnings); live EN/AR target at 96px confirmed. Policy gate unchanged; homepage outage F5 recorded separately. Completed 2026-10-18 from 093048b: supplied logo replaces text wordmark; explicit server locale/keyed EN/AR footer, 16px links, real categories preserved, unsupported trust/social text removed. Six localized development-only information pages with review notices, missing facts, contents anchors and sidebar/mobile navigation; production hides draft links and all 12 routes return 404 even with preview query. Review drafts docs/drafts/storefront-information.en.md and .ar.md; handoff docs/reviews/storefront-footer-information.md. 318 tests, typecheck/lint/build pass (15 existing warnings); Impeccable finish disposition ship at interface scope. Live EN/AR 320/390/980/982/1440 checks; initial native directory acceptance was limited by stopped Docker/Redis; Claude 369b9eb subsequently verified five real categories in development and his production build. Outage All products fallback works. No backend/catalog/dependency changes. Replace text Vi2 footer wordmark with supplied logo asset and accessible alt text; make footer typography readable in both languages. Replace fake text destinations with real localized About, Contact, Shipping, Returns, Terms and Privacy page interfaces. Prepare English/Arabic drafts with missing business facts explicitly marked in review drafts. Draft policy content is preview/review only until Seif approves; never publish placeholders as factual policies. Hide unsupported authenticity/social destinations until evidence or real URLs exist. Preserve real category links. Reuse page/component patterns, no CMS dependency. Business identity, contact details and binding policy terms remain owner inputs. |
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
- Invented checkout delivery fallback removal was done separately as CART-4 (merged, PR #3).
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
| Redis holds the cache, locks, event bus and workflow engine whenever `REDIS_URL` is set (store-read caching added on `claude/redis-dev`, 2026-10-17); production runs PostgreSQL and Redis as Coolify resources. | 2026-10-06 |
| Managers may allocate stock to an order line ("Allocate items"), never more than the line still needs; they cannot reserve or release stock by hand. | 2026-10-06 |
| New variants keep the stock settings the form sends for now; which products track stock is decided with the Odoo sync work. | 2026-10-06 |
| Manager role redefined (replaces RD v1.1 section 2.2): full orders (incl. fulfil, refund, cancel, edit), products (incl. delete, publish, prices), brands, customers, promotions, price lists; inventory view only; in Settings only product types and tags. Store settings, staff, roles, API keys, regions, tax, shipping setup, workflows and future business pages (revenue) are admin only. Admin-only pages are hidden from managers in the dashboard. | 2026-10-06 |
| Incomplete storefront tasks from `mvp-remaining-work.md` are assigned to GPT on `gpt/work`, with Claude reviewing. GPT prepares the board and returns to Seif for approval before implementation. Other task ownership stays as assigned. | 2026-10-09 |
| Managers keep full shop access, including price and publish (reconfirmed against RD v1.1 2.2). Only the EDA number and approval are product fields; other facts go in the description. Odoo matching uses SKU and barcode until one is chosen. Brands come with the catalog import, so no brand box for now. | 2026-10-17 |

## In review

Nothing from Claude is waiting for review. Work still on branches is listed under "Open: ready to pick up".

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
| 10. Core 1: Egypt store setup in code (EGP, Cairo Warehouse, 70 EGP delivery, demo removal) | Claude, reviewed by GPT (2 rounds) | 1831342, 565a344, b1c41bf | Review: `docs/reviews/egypt-store.md`. Merged through GPT's consolidation (f63599e). Existing databases still need the steps in "Staging and production to-do". |
| 11. Core 2: EDA registration number and approval on products | Claude, reviewed by GPT | 6116354 | Review: `docs/reviews/product-eda.md`. Merged through the consolidation (f63599e). |
| 12. Checkout HTTP tests (cart, delivery, totals, stock, order history, production gate) | Claude, reviewed by GPT (2 rounds) | 58d64ec, 5d94e01 | Review: `docs/reviews/checkout-tests.md`. Merged through the consolidation. Closes the old "HTTP integration tests for auth, cart, checkout, admin access" row (auth: `sign-in.spec.ts`; admin: `admin-access.spec.ts`). |
| 13. Cart access and order owner: a customer's cart and order only through their login | Claude, reviewed by GPT (3 rounds) | 373cf6a, 1de0340, 213ef3e, 58800fb | Review: `docs/reviews/order-owner.md`. Merged through the consolidation. |
| 14. Order export turned off (customer details would sit in a public file) | Claude, reviewed by GPT | 09ab9cb (from 8ad7860) | Review: `docs/reviews/r2-storage.md`. Merged into full-stack 2026-10-13. |
| 15. RD-1: catalog contract and shared product data | Claude, reviewed by GPT (2 rounds) | 7d79579, ad051aa, 28a011b | PR #2. Contract `docs/CATALOG-CONTRACT.md`; review `docs/reviews/catalog-contract.md`. |
| 16. RD-4: product page | Claude, reviewed by GPT (2 rounds) | 94a4c43, faa13d1 | PR #4. Review `docs/reviews/product-page.md`. Includes the storefront EDA number and "EDA approved" badge. |
| 17. Cart and region hardening (CART-1 to CART-4: shared region lookup, cart kept through outages, one cart per browser, no invented delivery options) | Claude, reviewed by GPT (2 rounds) | 90bca58, 2da69b5 | PR #3. Review `docs/reviews/cart-hardening.md`. CART-5 and CART-6 stay blocked (see below). |
| 18. Checkout summary shows live totals including delivery | Claude, reviewed by GPT | bcd7dde | PR #6. Review `docs/reviews/checkout-totals.md`. Also fixes `LegacyTranslations` restoring stale text on any wrapped page. |
| 19. Managers can create products from the dashboard form | Claude, reviewed by GPT | df6d909 | PR #7. Review `docs/reviews/manager-create-product.md`. |
| 20. RD-0, RD-0-NAV, RD-NAV-SIMPLE, RD-REVIEW-FIX, RD-2 (typography, navigation, header and announcements) | GPT, reviewed by Claude | see the RD table | Merged into full-stack (3d4e981, then PR #5). |

## Open: blocked, waiting on Seif

| Item | Why it is blocked |
|---|---|
| Payment methods (Paymob), Bosta shipment ownership, Odoo sync contract | Seif is collecting more information. Do not build, stub or guess these until Seif releases the work. Production checkout stays disabled until then (`apps/backend/src/api/middlewares.ts`). |
| Egyptian VAT rate | Seif (2026-10-09): rate still unknown; use best practice meanwhile. Done in Core 1: EGP prices and the Egypt region are tax-inclusive, and the Egypt tax region has no rate (0%). When Seif (or the accountant) sets the rate in the admin, prices shown to customers stay the same and tax is split out of them. |
| Guest account provisioning, expiry dates, analytics | RD asks for them; `docs/MVP-SCOPE.md` excludes or does not mention them. Seif to decide. |
| Cloudflare R2 bucket (Core 3 image storage) | Code built and approved on `claude/work` (e41dbf7, `apps/backend/src/lib/file-config.ts`), not merged into full-stack yet. Seif (2026-10-17): merge it so only credentials are missing; see "Merge Core 3" below. **Needed to finish.** Claude: (1) move e41dbf7 onto its own branch from full-stack; (2) storefront `next.config.ts` allows the bucket's public host from an env var, so `next/image` shows R2 images; (3) GPT review; Seif merges. Seif, in Cloudflare: (a) enable R2 (free plan, card required); (b) create buckets `vi2-media-dev` (local) and `vi2-media` (production); (c) dev bucket: turn on the r2.dev public URL; production bucket: connect a custom domain such as `media.<shop domain>`; (d) CORS on each bucket: allow `GET` and `PUT` from the admin address (`http://localhost:9000` locally, the production admin URL later), headers `*`; (e) R2 API token with Object Read & Write on that bucket only. Then set in `apps/backend/.env` (never in code or chat): `S3_FILE_URL` (public URL), `S3_BUCKET`, `S3_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (`S3_REGION` optional, default `auto`); and the same public URL for the storefront's image host setting. Then Claude runs the live check: upload an image, product export and import, delete the test file. Production refuses to start without these settings. Existing images saved on local disk are not moved. |
| Email provider | SendGrid sending is built and merged (`src/lib/notification-config.ts`); it switches on when `SENDGRID_API_KEY` and `SENDGRID_FROM` are set. Waiting for Seif's choice of provider (SendGrid works today; Resend or Brevo need a small provider module). **What email is used for (Seif, 2026-10-17):** (1) staff invite, when a staff member is invited: built; today staff use "Copy invite link" instead; (2) password reset for staff and customers, on "Forgot password": built; until a provider is set, customers who forget their password are stuck; (3) order received, when an order is placed (RD: "Order received – pending payment"): not built; (4) payment confirmed, when Paymob confirms payment: not built, needs Paymob; (5) shipped, with the Bosta tracking link, when the order is dispatched: not built, needs Bosta; (6) delivered, with the invoice, when Bosta reports delivery: not built, needs Bosta and Odoo; (7) payment failed, with a retry link, when a Paymob payment fails: not built, needs Paymob. Minimum for launch: password resets and "order received"; the rest come with Paymob and Bosta. The RD also asks for SMS and WhatsApp for some of these (for example "Driver is on the way"); that needs a separate provider, not covered by email. |
| CART-5: limit how many carts one visitor can create | Not built (Seif, 2026-10-16). Counting per visitor needs the visitor's real IP, which behind Cloudflare/Coolify needs the production proxy setup first. Suggested policy: 30 carts per 15 minutes per IP. |
| CART-6: clean up abandoned guest carts | Not built (Seif, 2026-10-16). Needs a retention period from Seif (for example 30 days untouched, no account, not completed). |
| Cart audit findings without an owner decision | A signed-in shopper's cart stays a guest cart until checkout; a guest cart id in the browser gives read access to that cart's email and address (Medusa default); rapid quantity clicks are not queued; the quick add matches product, not variant; a missing postal code defaults to `00000`. |
| Odoo details (from Seif, 2026-10-17) | Products: imported from Odoo first, then also created in Medusa. Matching key: SKU or barcode, not decided (the RD says both). One warehouse (Cairo). Orders and customers go to Odoo (RD 2.4 C). Stock: Claude recommends an Odoo webhook plus a full check every 15-30 minutes and nightly, safety stock subtracted, and a live check when an order is placed. Blocked until Seif releases the Odoo work. |

## Open: ready to pick up

| Task | Owner | Status | Notes |
|---|---|---|---|
| New product page in the admin (one form: brand, EDA, Arabic name, images, options, variants with SKU, barcode and EGP price) | Claude (another session) | in progress on `claude/new-product-page`, experimental | Seif (2026-10-17): its own branch so it can be tested and dropped. Medusa 2.21 can't add fields to its own create form. No stock field (Odoo owns stock). Managers can use it. |
| Merge Core 3 (R2) so only credentials are missing | Claude | next | Move e41dbf7 onto its own branch from full-stack. Dev keeps the local disk until `S3_*` is set; production refuses to start without a bucket. The storefront image host comes from an env var in the same change. |
| Core 4. Load the real supplement catalog (products, variants, SKUs, barcodes, images, brands) | — | blocked | Size M. Blocked on a data source: an Odoo export once Odoo access is known, or a CSV from Seif. Seif (2026-10-17): the import should bring brands, so no separate brand box for now. Core 1 and Core 2 are merged. |
| Remaining storefront lint warnings | — | open | Low priority; style only. |
| Split oversized storefront components (for example `ProductDetailClient.tsx`, `CheckoutClient.tsx`) | — | open | Matches the clean code goal, but is a refactor. Needs Seif's approval before starting. |

### Follow-up from RD-5 review (2026-10-18)

| Task | Owner | Status | Notes |
|---|---|---|---|
| Homepage outage recovery (RD-5 review F5) | — | open; outside RD-5 | Claude review 369b9eb observed /en returning HTTP 500 while Medusa was down; shop returned its outage state. Investigate and provide truthful homepage recovery without fake products. Verify both locales and recovery after backend returns. No homepage implementation in the RD-5 review follow-up. |

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

| Homepage critique fixes (all five priorities) | GPT | gpt/work | merged `5d7bb9e`; 2 follow-ups open | Commit c25bebd. All five implemented; independent follow-up review clear, provisional 28/40. Storefront: 152 tests, typecheck and lint pass (19 warnings). Full check: 184 backend tests pass, blocked by unchanged admin-access.spec.ts:78 type error. Live homepage/cart verification limited by unavailable Medusa backend. See docs/reviews/storefront-homepage-critique-fixes.md. No integration/package changes; owner merges.  Claude approved with two should-fix items (`docs/reviews/storefront-homepage-critique-fixes.md` on `claude/work`): F1 the mega-menu "BEST SELLERS" link and `/best-sellers` page wording still claim popularity; F2 the other add-to-cart buttons (`ProductCard`, `FlashDeals`, `ProductDetailClient`, `AccountClient`, `ProductValueOffer`) still ignore the cart result. Not fixed yet. Update 2026-10-17: `ProductDetailClient` now awaits the cart result (RD-4) and `ProductValueOffer` was removed; the others remain. |

| GPT worktree Turbopack startup fix | GPT | gpt/work | done | Seif reported external node_modules junction panic on 2026-10-11. Next root includes the sibling dependency checkout only when storefront modules resolve outside this workspace. Normal installations keep the workspace root. Verified Turbopack startup and GET /categories HTTP 200; typecheck and targeted config lint pass. Test server stopped. No dependency/package/UI changes. |

## Staging and production to-do (remember before and after each deploy)

Nothing below has been run on staging or production. Local `vi2_dev` already has the translation migration, the 38 categories, the Egypt setup with the demo removed, and the EDA table. Full steps: `docs/CATEGORY-LOCALES-DEPLOYMENT.md`.

| # | When | Do | Notes |
|---|---|---|---|
| 1 | Before deploying | Back up the target database. | Check the release runner uses that environment's database, not `vi2_dev`. |
| 2 | Before the new backend starts | From `apps/backend`: `node ../../node_modules/@medusajs/cli/cli.js db:migrate` | Creates the Translation Module tables and the EDA registration table (Core 2). No `--skip-links --skip-scripts --skip-search` flags (those were local only). `medusa-config.ts` and the migrations ship together. |
| 3 | After the migration | `... exec src/scripts/setup-egypt-store.ts` | Core 1: EGP, Egypt region and tax region (prices include tax, no VAT rate yet), Cairo Warehouse, one Standard Delivery option at 70 EGP, storefront key. Adopts an existing Egypt region and warehouse; stops without changing anything when the setup is ambiguous (several Egyptian locations, a delivery zone that is not exactly Egypt). Safe to rerun. New databases get it from `initial-data-seed`. |
| 4 | Only after step 3 succeeded, and only if Medusa's starter demo is there (Europe region, European Warehouse, t-shirt products) | `... exec src/scripts/remove-demo-data.ts` | Removes the Europe region, European Warehouse, unconfigured starter tax regions, the demo products and empty demo categories. Refuses and deletes nothing if the European Warehouse holds or reserves stock. Then check Admin: one delivery option, Standard Delivery 70 EGP. |
| 5 | After step 3 | Dry run: `... exec src/scripts/setup-wellness-catalog.ts` | Prints the database host, port and name first; confirm it is the right one. Lists create/reuse for the 38 categories. |
| 6 | After the dry run looks right | Apply: `... exec src/scripts/setup-wellness-catalog.ts apply`, then rerun the dry run | Second dry run must show reuse for all 38. Rerunning apply overwrites Admin edits to those names, ranks and Arabic labels. |
| 7 | After apply | In Admin, set the old `supplements` root to Inactive. | Seif's decision 2026-10-11. Products keep their assignments. |
| 8 | After any deploy that changes the role table | `... exec src/scripts/setup-catalog-manager.ts <admin-user-id>` | From task 9 (manager role). Run it on the first deploy too. |
| 9 | After the backend release | Start the storefront release. | Check `/en` and `/ar`, Arabic RTL, the category menus, shop filters, and that `/categories` returns 404. |
| 10 | After release | Manual checks: edit a category translation in Admin as staff; switch language as a signed-in customer with items in the cart; guest checkout offers one 70 EGP delivery option; a signed-in customer's order appears in My orders; signing out empties the cart; the EDA box saves on a product in Admin; Admin order export is refused. | The first two were not exercised by GPT or Claude; the checkout ones are covered by HTTP tests, not by a live run on that environment. |
| 11 | Before launch | Native Arabic speaker reviews the 38 labels (`apps/backend/src/lib/wellness-categories.ts`). | Owner task. |
| 12 | Before the first deploy that includes Core 3 (R2) | Set `S3_FILE_URL`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` for that environment's bucket. | The backend refuses to start in production without them. Production bucket `vi2-media` with a custom domain; bucket CORS allows `GET`, `PUT` from the admin's address; the storefront must allow the image host (GPT task). Core 3 is not in full-stack yet; this step applies once it merges. |
| 13 | Always | Production checkout stays disabled until Paymob, Bosta and Odoo are released. | See "Open: blocked". |


RD-5 release gate: before publishing any business/policy page, Seif must approve complete bilingual wording and supply all marked business facts; legal/native Arabic review is pending. Unapproved drafts stay development-only and absent from production navigation.

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
| R2 file provider | Claude / Seif | see "Open: blocked" and "Merge Core 3" | e41dbf7 approved; the order-export part merged as 09ab9cb. |
| Readable category addresses /[locale]/shop/<handle> | GPT | part of RD-3 | Seif requested 2026-10-13. |
| EDA registration display on product pages | Claude | done in RD-4 (PR #4) | |
| Remove invented fallback delivery options | Claude | done as CART-4 (PR #3) | |
| R2 image hostname in next/image | GPT | blocked on R2 | Use the configured public hostname after Core 3. |
| Shop, product, footer, Arabic typography and navigation design repairs | GPT / Claude | replaced by RD-0 to RD-6 | |

## RD-3 / RD-5 reviewed-baseline consolidation - 2026-10-18

| Task | Owner | Status | Notes |
|---|---|---|---|
| Combine approved GPT shop/footer work with the merged backend for manual testing | GPT, authorized by Seif | complete locally; manual acceptance pending | Seif requested bringing these together in reviewed-baseline. Merge reviewed gpt/work c3e16a3 into full-stack 7351bc5; preserve the existing backend, Claude changes, local environment files and unrelated author drafts. No additional Claude feature branches, catalog/database operations or remote push. Both apps run from this combined checkout: storefront 3000, backend 9000, vi2_dev and localhost Redis. 329 storefront + 207 backend source tests pass; both type/lint checks and production storefront build pass (15 existing lint warnings). EN/AR home/shop and information previews HTTP 200; removed category routes 404; native categories 5 parents/33 children in both locales. Evidence and restart commands: docs/reviews/reviewed-baseline-rd3-rd5.md. |
