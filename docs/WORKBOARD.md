# Workboard

Shared task list for every agent working in this repository (Claude, GPT).
Read this before starting. Claim a task by setting Owner and Status before
editing files. Do not work on a task another agent owns. Update the row when
you finish, and record anything left open in Notes.

Rules: see the root `AGENTS.md`. Shared files (`package.json`,
`package-lock.json`, `AGENTS.md`, `docs/decisions/`) need the owner's (Seif's)
approval before any change.

## Done

| Task | Owner | Commit | Notes |
|---|---|---|---|
| 1. Trustworthy checkout confirmation + regression tests | GPT, then Claude | cdfbea8, db8b2d8 | Success requires a Medusa `order_` ID; confirmation page reads the order from Medusa. Unknown outcomes keep the same cart for retry. |
| 2. Lint/type errors; `npm run check` covers both apps | GPT, then Claude | cdfbea8, e2af23c | 0 errors. 21 storefront lint warnings remain (`<img>`, setState-in-effect), all in code not otherwise touched. |
| 3. Remove invented availability/social proof; brand/region owners | GPT, then Claude | cdfbea8, 8497eca | Brand comes from the linked Brand module; region must be a real EGP/EG Medusa region; ratings shown only when reviews exist (none do). |
| 4. Validation, secrets, safe errors, admin authorization, timeouts | GPT, then Claude | cdfbea8, e2af23c, b42edaf | Catalog Manager now matches RD v1.1 section 2.2 (no pricing, stock, publishing). Staff invite acceptance unblocked. Guest buyers can register. |

## Open: needs a decision from Seif

| Item | Why it is blocked |
|---|---|
| Inventory Manager and Content Editor roles (RD 2.2) | Not implemented. Content Editor has the same rights as Catalog Manager in the matrix, so it may simply reuse that role. Inventory Manager depends on who owns stock (Medusa or Odoo). |
| Admin dashboard usability for Catalog Manager | Only catalog APIs are allowed. Dashboard pages also call stores, regions, sales channels, and so on. Needs a test with a real Catalog Manager login. |
| Payment methods (Paymob), Bosta shipment ownership, Odoo sync contract | Waiting on the integration questionnaire answers. Production checkout stays disabled until then (`apps/backend/src/api/middlewares.ts`). |
| Phone OTP, social login, guest account provisioning, expiry dates, analytics | RD asks for them; `docs/MVP-SCOPE.md` excludes or does not mention them. |

## Open: ready to pick up

| Task | Owner | Status | Notes |
|---|---|---|---|
| Quick-variant partial failure: option created but variant creation fails leaves an unused option value | — | open | `apps/backend/src/api/admin/products/[id]/quick-variant/route.ts`; compose both steps in one workflow. |
| HTTP integration tests for auth, cart, checkout, admin access | — | open | Needs a test PostgreSQL. `npm run test:integration:http` in `apps/backend`. |
| Remaining storefront lint warnings | — | open | Low priority; style only. |
