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
| Redis holds the cache and locks whenever `REDIS_URL` is set; production runs PostgreSQL and Redis as Coolify resources. | 2026-10-06 |
| Manager role redefined (replaces RD v1.1 section 2.2): full orders (incl. fulfil, refund, cancel, edit), products (incl. delete, publish, prices), brands, customers, promotions, price lists; inventory view only; in Settings only product types and tags. Store settings, staff, roles, API keys, regions, tax, shipping setup, workflows and future business pages (revenue) are admin only. Admin-only pages are hidden from managers in the dashboard. | 2026-10-06 |

## In review

| Task | Author | Branch | Commits | Review file | Status |
|---|---|---|---|---|---|
| Admin lockout: RBAC module was never loaded, so every staff user got Forbidden | Claude | `claude/work` | 226d9f0, e3a4024, and the round-2 commit (`git log full-stack..claude/work`) | `docs/reviews/rbac-module.md` | Round 1: 3 P1s fixed. Round 2: RBAC-1/2/3 confirmed resolved; 1 new P1 (manager could switch off stock enforcement) fixed by Seif's decision to block `manage_inventory` and `allow_backorder` for managers. 9 live access tests pass; `npm run check` green (83 backend, 87 storefront). Waiting for GPT round 3 and Seif's browser test as a manager. |
| Sign-in hardening (staff and customers): attempt limit, 8+ password rule, change password, forgot password, invite and reset emails, Redis config | Claude | `claude/work` (after the RBAC commits) | 6e96ac6, ccacb28 | `docs/reviews/sign-in.md` | GPT round 1: 1 P1 (GET sign-in bypassed the limit), fixed with HTTP regressions; waiting for GPT round 2. Requested by Seif on 2026-10-06 while the RBAC review is open. 11 HTTP tests (30 total pass), 126 backend and 105 storefront unit tests; `npm run check` green. Live check passed (limits, short passwords, reset limit, storefront forgot/reset pages). Waiting for GPT review and Seif's browser test of the admin "Change password" page. |
| Manager role: full shop access, admin-only settings hidden in the dashboard, permissions that survive restarts | Claude | `claude/work` (after 6e96ac6) | eaf4145 and the round-1 fix commit | `docs/reviews/manager-role.md` | GPT round 1: P1 (managers could reserve or release stock by hand) and P2 (inventory export refused) fixed; waiting for GPT round 2. Managers can no longer allocate stock to order lines (admin does, only for stock-tracked variants); Seif to decide if managers should. Requested by Seif on 2026-10-06. Found and fixed: Medusa deletes permissions no code defines at every start (manager lost `brand:*` and could never get refunds); now defined in `src/policies/project-policies.ts`, and the HTTP tests simulate the restart. 33 HTTP tests and `npm run check` green; checked in the browser as a manager (orders, products, inventory, customers, promotions, price lists, brands load). Open: Settings opens on Store (Medusa's fixed start page); new variants keep the form's stock values (Seif to confirm). |

## Done

| Task | Owner | Commit | Notes |
|---|---|---|---|
| 1. Trustworthy checkout confirmation + regression tests | GPT, then Claude | cdfbea8, db8b2d8 | Success requires a Medusa `order_` ID; confirmation page reads the order from Medusa. Unknown outcomes keep the same cart for retry. |
| 2. Lint/type errors; `npm run check` covers both apps | GPT, then Claude | cdfbea8, e2af23c | 0 errors. 21 storefront lint warnings remain (`<img>`, setState-in-effect), all in code not otherwise touched. |
| 3. Remove invented availability/social proof; brand/region owners | GPT, then Claude | cdfbea8, 8497eca | Brand comes from the linked Brand module; region must be a real EGP/EG Medusa region; ratings shown only when reviews exist (none do). |
| 4. Validation, secrets, safe errors, admin authorization, timeouts | GPT, then Claude | cdfbea8, e2af23c, b42edaf | Catalog Manager now matches RD v1.1 section 2.2 (no pricing, stock, publishing). Staff invite acceptance unblocked. Guest buyers can register. |
| 5. AGENTS.md: clean architecture, SOLID, MVP decisions, multi-agent rules | Claude | fe48d5c | Approved by Seif. |
| 6. Quick-variant partial failure: option or value is rolled back if the variant fails | Claude, reviewed by GPT (3 rounds) | f403587, fead9e2, 149a95d | Review: `docs/reviews/quick-variant.md`. 10 PostgreSQL integration tests pass; `npm run check` green. Merged by Seif's decision with two known limitations recorded in the review file (R3-1 timing risk with a concurrent native admin write; R3-2 lock has no per-request owner and expires after 120 s). Production needs a shared lock provider (Redis) if more than one server runs. |

## Open: blocked, waiting on Seif

| Item | Why it is blocked |
|---|---|
| Admin dashboard usability for the manager role | Only catalog APIs are allowed. Dashboard pages also call stores, regions, sales channels, and so on. Needs a test with a real manager login by Seif. |
| Payment methods (Paymob), Bosta shipment ownership, Odoo sync contract | Seif is collecting more information. Do not build, stub or guess these until Seif releases the work. Production checkout stays disabled until then (`apps/backend/src/api/middlewares.ts`). |
| Brand visibility for the manager role | The manager can currently hide or show a whole brand; the requirements matrix does not mention brands. Seif to confirm whether this stays. |
| Guest account provisioning, expiry dates, analytics | RD asks for them; `docs/MVP-SCOPE.md` excludes or does not mention them. Seif to decide. |

## Open: ready to pick up

| Task | Owner | Status | Notes |
|---|---|---|---|
| HTTP integration tests for auth, cart, checkout, admin access | — | open | Needs a test PostgreSQL. `npm run test:integration:http` in `apps/backend`. |
| Remaining storefront lint warnings | — | open | Low priority; style only. |
| Split oversized storefront components (for example `ProductDetailClient.tsx`, `CheckoutClient.tsx`) | — | open | Matches the clean code goal, but is a refactor. Needs Seif's approval before starting. |
