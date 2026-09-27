# Backend AGENTS.md — Medusa Application

## Scope

These rules apply to `apps/backend/**` in addition to the root `AGENTS.md`.

The backend is the authoritative application boundary for commerce business logic and integrations.

---

## 1. Backend Structure

Expected structure:

```text
apps/backend/
├── medusa-config.ts
├── integration-tests/
│   ├── setup.js
│   └── http/
├── src/
│   ├── admin/
│   ├── api/
│   │   ├── store/
│   │   └── admin/
│   ├── jobs/
│   ├── links/
│   ├── migration-scripts/
│   ├── modules/
│   ├── subscribers/
│   └── workflows/
```

Inspect the actual repository before assuming every directory exists.

---

## 2. Medusa Skills & Documentation

For Medusa-specific work, prefer the project's available Medusa agent skills and official Medusa MCP/documentation when available.

Relevant skills include:
- `building-with-medusa` — backend modules, API routes, workflows, data models, links
- `building-admin-dashboard-customizations` — `src/admin`
- `db-generate`
- `db-migrate`
- `new-user`

If these tools are unavailable, inspect existing project patterns and the installed Medusa version before inventing an API or implementation.

Never rely on "latest" behavior when the installed package version differs.

---

## 3. Routing

Backend routing is file-based.

Store endpoint:

```text
src/api/store/<path>/route.ts
```

Admin endpoint:

```text
src/api/admin/<path>/route.ts
```

Export the HTTP methods required by the route.

Do not add a separate router or manually register routes.

Routes should:
1. Parse/validate input.
2. Resolve required dependencies/context.
3. Run the appropriate workflow/application behavior.
4. Map the result.
5. Return the response.

Do not put complex business logic in route handlers.

---

## 4. Workflows

Business behavior should normally live in Medusa workflows and workflow steps where the behavior crosses business boundaries or requires orchestration/transactional behavior.

Prefer:

```text
API Route
   ↓
Workflow
   ↓
Workflow Steps / Modules / Providers
```

Keep workflow steps focused.

Do not create workflows for trivial code merely to increase abstraction.

---

## 5. Modules

Use custom modules for genuinely project-specific domain capabilities.

A module may contain:
- Models
- Module service
- Migrations
- Module-specific tests

Before creating a module, verify that Medusa does not already provide the required capability.

Do not recreate Medusa commerce primitives as custom modules without a confirmed reason.

---

## 6. Database & Migrations

Never manually edit an already-applied migration.

When changing a custom module model:
1. Change the model.
2. Generate a new migration using the installed Medusa CLI.
3. Review the generated migration.
4. Run migrations in the appropriate environment.
5. Test the affected behavior.

Use the project's package manager:

```bash
cd apps/backend
<pm> exec medusa db:generate <module-name>
<pm> exec medusa db:migrate
```

Do not run destructive/reset database operations against the user's database without explicit confirmation.

Do not write raw SQL or import arbitrary DB clients when the behavior should go through Medusa modules/services/workflows.

---

## 7. Integrations

External providers must be isolated.

Expected examples:

```text
Application / Workflow
        ↓
PaymentGateway
        ↓
PaymobAdapter
```

```text
Application / Workflow
        ↓
FulfillmentProvider
        ↓
BostaAdapter
```

Provider-specific models must not leak through the domain/application boundary.

Every external operation must consider timeout, retry, idempotency, failure, recovery, and safe logging.

See `../../docs/INTEGRATIONS.md`.

---

## 8. Subscribers & Jobs

Use subscribers for event-driven reactions.

Use scheduled/background jobs for work that:
- is expensive,
- is non-critical to the immediate request,
- needs retries,
- needs periodic synchronization,
- or should not block a customer request.

Do not use background processing to hide a correctness requirement that must be synchronous.

---

## 9. Security

- Validate all API input.
- Enforce authorization server-side.
- Never trust client commerce values.
- Keep secrets server-side.
- Verify webhooks where supported.
- Never log secrets/auth tokens/payment-sensitive data.
- Scope customer resources to the authenticated customer.
- Do not expose internal/provider errors directly to customers.

---

## 10. Code Quality

The backend must satisfy the repository's configured `@medusajs/eslint-plugin` rules.

**Never disable a `@medusajs/*` rule to make lint pass. Fix the implementation.**

Conventions:
- No semicolons.
- Double quotes.
- 2-space indentation.
- Files: kebab-case.
- Classes/types: PascalCase.
- Functions/variables: camelCase.
- DB columns: snake_case.
- No emojis in code, comments, or commit messages.

Follow existing code style if the repository differs from these defaults.

Avoid:
- Giant services
- `everything.ts`
- Circular dependencies
- Duplicate business rules
- Premature abstractions
- Hidden side effects

---

## 11. Backend Testing

Expected test areas:

```text
src/**/__tests__/**/*.unit.spec.ts
src/modules/*/__tests__/**
integration-tests/http/*.spec.ts
```

Use unit tests for business logic and mappings.

Use module integration tests for module/database behavior.

Use HTTP integration tests for API behavior.

Critical cases:
- Duplicate webhook
- Payment failure/timeout
- Provider failure
- Inventory unavailable
- Unauthorized access
- Invalid input
- Repeated submission

Integration tests may require a reachable PostgreSQL instance. Do not mistake an unavailable test dependency for an application code failure.

---

## 12. Backend Commands

Detect the package manager from the root rules before running commands.

Common commands:

```bash
<pm> run backend:dev
<pm> run lint
<pm> run test
<pm> run test:unit
<pm> run test:integration:modules
<pm> run test:integration:http
<pm> exec medusa db:generate <module-name>
<pm> exec medusa db:migrate
```

Verify actual scripts in `package.json` before executing unfamiliar commands.

For a single Jest test:

```bash
cd apps/backend
<pm> run test:unit -- src/modules/foo/__tests__/service.unit.spec.ts
<pm> run test:unit -- -t "returns the cart"
```

---

## 13. Backend Off-Limits

Do not modify:
- `apps/backend/.medusa/`
- `node_modules/`
- Existing applied migrations
- `.env` / `.env.local`
- Lockfiles by hand
- Generated build output

Do not print/copy secret values.

Do not run destructive DB commands without explicit confirmation.

---

## 14. Backend Definition of Done

Before reporting backend work complete:
1. Correct Medusa primitive/extension was chosen.
2. Route/workflow/module boundaries are appropriate.
3. Business logic is not duplicated.
4. Input/authentication/authorization are checked.
5. Integration failure/idempotency is handled where applicable.
6. Relevant tests pass.
7. Lint/type/build checks pass where configured.
8. Migration exists for schema changes.
9. No unrelated refactor was introduced.
10. Remaining assumptions are reported.
