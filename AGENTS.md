# AGENTS.md — E-Commerce Platform

> **Every session starts here:** read `docs/WORKBOARD.md` before doing anything else. It holds the current tasks, who owns them, the review flow, and the owner's decisions. See section 14.

## Mission

Build a production-ready Egyptian health & wellness headless e-commerce platform using **Medusa v2 + Next.js**.

Priorities:
1. Correctness
2. Security
3. Maintainability
4. Testability
5. Performance
6. Practical scalability

The MVP is intentionally limited. Do not implement Phase-2 features unless explicitly requested.

---

## 1. Non-Negotiable Rules

1. **Do not modify Medusa core or `node_modules`.**
2. **Use Medusa native capabilities before custom replacements.**
3. **Frontend → Medusa API. Never bypass the backend.**
4. **Never access PostgreSQL directly from Next.js.**
5. **Business rules belong on the backend.**
6. **Never trust client-provided prices, totals, inventory, discounts, shipping costs, or payment success.**
7. **Never expose secrets or private provider credentials to the browser.**
8. **Never invent business rules, ownership, API contracts, or provider behavior.**
9. **Do not create competing sources of truth without an explicit synchronization contract.**
10. **External operations must be timeout-aware, retry-safe, and idempotent where applicable.**
11. **Do not introduce microservices, databases, frameworks, dependencies, caches, or abstractions without a justified requirement.**
12. **Do not refactor unrelated code.**
13. **Do not delete or weaken tests to make a change pass.**
14. **Prefer the smallest clean change that fully satisfies the requirement.**
15. **Follow existing repository patterns unless they conflict with these rules.**

---

## 2. Source of Truth & Decision Behavior

This file defines global operational rules. Detailed references live under `docs/`.

Before changing code:
1. Identify the exact requirement.
2. Inspect the existing implementation and nearby patterns.
3. Check whether Medusa already provides the capability.
4. Identify the correct architectural boundary.
5. Identify the authoritative data owner.
6. Check security/trust boundaries.
7. Check failure/idempotency requirements.
8. Implement the smallest appropriate change.

Before creating a new file, abstraction, utility, service, module, repository, adapter, dependency, or database object, search for an existing equivalent.

If an important requirement, ownership rule, API contract, or architectural decision is ambiguous:
- **Do not guess.**
- Do not silently invent behavior.
- Ask for clarification or explicitly report the affected work as blocked.

When existing code conflicts with this file:
- Preserve working behavior unless change is required.
- Prefer current Medusa conventions.
- Do not rewrite working code merely to match a preferred pattern.

---

## 3. System Boundaries

```text
Cloudflare
    ↓
Hetzner / Coolify
    ├── Next.js Storefront
    ├── Medusa Server
    └── Medusa Worker

Medusa
    ├── PostgreSQL
    ├── Redis
    ├── Meilisearch
    ├── Odoo
    ├── Paymob
    ├── Bosta
    └── S3/R2 Storage
```

### Next.js owns
- UI/UX
- Rendering
- Customer interaction
- Storefront state
- Product/search/cart/checkout/account presentation
- Calling backend APIs

### Next.js must NOT own
- Backend business rules
- Inventory authority
- Payment verification
- Supplier/warehouse logic
- Direct PostgreSQL access
- Direct Odoo access
- Private Paymob/Bosta APIs
- Authoritative order creation or totals

**Rule: frontend → Medusa API. Do not bypass the backend.**

### Medusa owns
Use Medusa's capabilities for:
- Products, variants, categories
- Customers/authentication
- Carts and orders
- Pricing/promotions
- Inventory/stock locations
- Payment collections/sessions/transactions
- Fulfillment/shipping
- Regions/sales channels/API keys

Treat the system as **Medusa + custom extensions**, not a generic backend being rebuilt from scratch.

---

## 4. Medusa Architecture

Prefer Medusa-native primitives:
- API routes
- Workflows
- Modules
- Module links
- Subscribers
- Scheduled/background jobs
- Payment providers
- Fulfillment providers

Never rebuild a Medusa commerce primitive unless a confirmed requirement proves it cannot satisfy the need.

Conceptually:

```text
Presentation
    ↓
Application / Workflow
    ↓
Domain rules
    ↑
Infrastructure / Providers
```

Clean Architecture is the required style. The dependency rule is mandatory: dependencies point inward, from presentation and infrastructure toward application and domain rules. Domain rules never import from routes, UI, or provider SDKs.

Medusa already supplies the layers (routes, workflows, modules, providers). Map the layers onto those primitives. Do not build a parallel layer hierarchy beside them.

See `docs/ARCHITECTURE.md`.

---

## 4.1 Clean Code and SOLID

All new and changed code must follow SOLID. Apply the principles through Medusa's primitives:

- **Single responsibility:** a function, workflow step, service, or component has one reason to change. Split a file that mixes validation, business rules, persistence, and presentation.
- **Open/closed:** add behavior by adding a new workflow step, provider, adapter, or handler, not by growing conditionals inside existing code.
- **Liskov substitution:** every implementation of a provider/adapter contract (for example payment or fulfillment) must be usable in place of any other without callers special-casing it.
- **Interface segregation:** keep contracts small and specific to what the caller needs. Do not create one wide interface that forces unused methods.
- **Dependency inversion:** application code and workflows depend on a contract, never on a concrete provider. Inject dependencies (Medusa's container, function parameters) instead of importing concrete clients inside business logic.

Clean code rules:
- Names state intent. Prefer small functions that do one thing.
- One business rule lives in exactly one place.
- Routes, controllers, and UI components stay thin. They contain no business rules.
- No hidden side effects, no circular dependencies, no `everything.ts`, no giant files or components.
- Prefer composition over inheritance.
- Comments explain why, not what.

Limit on abstraction: apply SOLID where it removes real coupling or duplication. Do not add an interface, layer, or pattern that has no second implementation, no isolation benefit, and no testing benefit. A plain function is the right answer for simple logic.

When this section and existing working code disagree, do not rewrite unrelated code. Apply these rules to everything you create or change.

---

## 5. Security

- Keep secrets server-side.
- Use HTTPS in production.
- Configure CORS deliberately.
- Validate all untrusted input.
- Enforce authorization server-side.
- Verify webhooks where supported.
- Rate-limit sensitive/abusable operations where appropriate.
- Never log secrets, passwords, auth tokens, or sensitive payment data.
- Scope customer resources to the authenticated customer.
- Protect admin operations with appropriate authentication/authorization.
- Do not put sensitive long-lived credentials in browser storage when a secure server-managed strategy is appropriate.

Never trust frontend declarations of:
- Identity
- Prices
- Inventory
- Discounts
- Shipping costs
- Order totals
- Payment success

See `docs/SECURITY.md`.

---

## 6. External Integrations

Odoo, Paymob, Bosta, Meilisearch, and storage are external boundaries.

Isolate provider-specific behavior behind appropriate adapters/providers.

For external operations define where applicable:
- Timeout
- Retry policy
- Backoff
- Maximum retries
- Idempotency
- Failure behavior
- Recovery
- Safe logging/correlation

Never use infinite retries.

A payment network timeout is not automatically payment failure.

External failure must not corrupt commerce state.

Do not hard-code undocumented provider behavior; verify provider documentation when implementation depends on it.

See `docs/INTEGRATIONS.md`.

---

## 7. Data Ownership

Every important data object must have one authoritative owner.

If ownership is undefined:
**do not guess and do not implement synchronization.**

A derived cache/index may not silently become a second source of truth.

Any synchronization contract must define source, destination, direction, trigger, conflict behavior, idempotency, retries, and recovery.

See `docs/DATA-OWNERSHIP.md`.

---

## 8. Database / Redis / Performance

### PostgreSQL
- Use migrations.
- Never manually edit production schema.
- Add indexes intentionally.
- Avoid N+1 queries.
- Paginate large collections.
- Fetch only required data where practical.
- Use transactions for atomic operations.
- Preserve constraints protecting business invariants.
- Do not load entire catalogs into memory.
- Do not use PostgreSQL as a general-purpose cache.
- Do not add another database or partitioning without a concrete requirement.

### Redis
Use only where justified for supported caching, jobs/workflows, temporary state, rate limiting, or coordination.

Every cache needs a purpose, TTL, invalidation strategy, source of truth, and unavailable-cache behavior.

Correctness must not depend on cached payment, inventory, or order state.

### Performance
Avoid unnecessary queries/API calls, synchronous non-critical external work, process-only critical state, and premature distributed complexity.

See `docs/ARCHITECTURE.md`.

---

## 9. Testing & Definition of Done

Every behavior change must have relevant tests.

Use:
- Unit tests for business rules, validation, mapping, and custom logic.
- Integration tests for database/provider boundaries.
- E2E tests for critical customer flows.

Critical negative cases include failed/duplicate payments or webhooks, out-of-stock, invalid address, provider failure, Odoo downtime, network timeout, repeated checkout submission, refresh during checkout, and unauthorized resource access.

A task is complete only when:
1. Requested behavior works.
2. Existing behavior is preserved unless intentionally changed.
3. Relevant tests pass.
4. Type/lint/static checks pass where configured.
5. Migrations are valid if schema changed.
6. Security and trust boundaries were checked.
7. Required idempotency exists.
8. No secrets are exposed.
9. No unnecessary dependencies/complexity were introduced.
10. No unrelated code was changed.
11. Remaining assumptions are explicitly reported.

Never delete/weaken tests to make a change pass.

See `docs/TESTING.md`.

---

## 10. Development Workflow

### Before
Requirement → inspect → check Medusa → identify boundary/owner → check security/failure → implement.

### During
- Keep changes focused.
- Keep routes/controllers thin.
- Centralize business rules.
- Isolate provider-specific code.
- Reuse existing patterns.
- Avoid speculative features and abstractions.

### After
1. Run relevant tests/checks.
2. Fix errors caused by the change.
3. Verify integration boundaries.
4. Check security.
5. Check unnecessary queries/API calls.
6. Report implementation, validation, and remaining assumptions.

For significant architectural changes, update the relevant reference/ADR.

---

## 11. Repository-Specific Rules

The repository is a Turborepo workspace containing a Medusa backend and an optional storefront.

The actual installed Medusa version is authoritative: inspect `apps/backend/package.json`. Do not assume an API because a different/latest Medusa version may behave differently.

The package manager is authoritative from:
1. Root `package.json` → `packageManager`
2. Root lockfile: `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lock`, or `bun.lockb`

Never introduce a second lockfile.

Never assume a script exists solely because it is documented. Verify the relevant `package.json` first.

`apps/storefront/` is optional. Before using storefront commands or files, check that it exists. If absent, treat the repository as backend-only. Do not scaffold it or assume it was accidentally deleted.

See `apps/backend/AGENTS.md` and `apps/storefront/AGENTS.md` for app-specific rules.

---

## 12. References

Read only when relevant:

- `docs/ARCHITECTURE.md` — architecture and boundaries
- `docs/SECURITY.md` — security/authentication/authorization
- `docs/INTEGRATIONS.md` — Odoo/Paymob/Bosta/Meilisearch/storage
- `docs/DATA-OWNERSHIP.md` — sources of truth and synchronization
- `docs/TESTING.md` — test strategy
- `docs/MVP-SCOPE.md` — MVP boundaries
- `docs/decisions/` — accepted architectural decisions

Do not reread all references for a small task.

---

## 13. MVP Decisions (set by the owner)

These are decided. Do not reopen them or build beyond them.

- **Roles:** exactly two, `admin` (full access) and `manager` (the Catalog Manager role). More roles are Phase 2.
- **Customer and staff login:** email and password only. Phone OTP and OAuth 2 are Phase 2.
- **Integrations (Paymob, Bosta, Odoo):** the integration PDF in the repository defines them, but the owner is still collecting information. Do not build, stub, or guess any of them until the owner releases the work.

---

## 14. Working With Other Agents

Several AI agents (Claude, GPT) work in this repository.

1. Read `docs/WORKBOARD.md` before starting. Claim a task on it before editing files.
2. One agent owns a task. Do not edit another agent's claimed task.
3. Work on your own branch in your own folder. Do not commit to `full-stack` or `main` directly.
   - Claude (author): branch `claude/work`, folder `vi2`.
   - GPT (reviewer): branch `gpt/work`, folder `vi2-gpt-review`. Review the changes between `full-stack` and `claude/work` and write findings to `docs/reviews/<task-name>.md`.
   - Never edit files in the other agent's folder.
4. A reviewing agent reports problems in a review note and does not edit the author's code.
5. The owner merges. Nothing is merged without the owner's approval.
6. Shared files (`package.json`, lockfile, `AGENTS.md` files, `docs/decisions/`) change only with the owner's approval.

---

## Core Principle

**Use Medusa for commerce primitives, custom Medusa extensions for project-specific behavior, Next.js for the customer experience, and backend adapters/providers for external systems. Keep the MVP small, secure, testable, maintainable, performant, and ready to extend without premature complexity.**
