# Storefront AGENTS.md — Next.js Application

## Scope

These rules apply to `apps/storefront/**` in addition to the root `AGENTS.md`.

This storefront is optional. If `apps/storefront/` does not exist, do not scaffold it or assume it was deleted.

---

## 1. Responsibility Boundary

The storefront owns:
- UI/UX
- Rendering
- Customer interaction
- Presentation state
- Calling Medusa APIs

The storefront does NOT own:
- Authoritative business rules
- Inventory authority
- Payment verification
- Order totals
- Discount calculation authority
- Direct PostgreSQL access
- Direct Odoo access
- Private Paymob/Bosta APIs
- Backend secrets

If business logic affects commerce correctness, implement the authoritative rule in Medusa/backend.

Client-side validation is for UX only; the backend must validate again.

---

## 2. Medusa Integration

Use the project's established Medusa storefront integration pattern.

Before changing integration code:
1. Inspect existing API clients/hooks.
2. Check the installed Medusa version.
3. Check existing authentication/session handling.
4. Reuse existing patterns.

Do not create a second API client or parallel auth system without a confirmed requirement.

When the storefront communicates with Medusa, use the required public/publishable configuration for the installed Medusa setup.

Never expose private backend credentials in `NEXT_PUBLIC_*` variables.

---

## 3. Authentication & Sessions

Authentication must follow the project's chosen Medusa authentication/session strategy.

Do not:
- Trust a customer ID from the browser as proof of identity.
- Put sensitive long-lived credentials in localStorage when secure server-managed cookies/sessions are appropriate.
- Implement a parallel auth system without a confirmed requirement.

Customer-owned resources must ultimately be authorized by the backend.

---

## 4. Data Fetching

Prefer the simplest correct Next.js data-fetching strategy for the page/use case.

Consider:
- Server rendering when it improves correctness/performance/SEO.
- Client fetching for genuinely interactive state.
- Avoiding duplicate requests.
- Pagination for large collections.
- Appropriate caching/revalidation.

Do not fetch an entire catalog when only a page/subset is required.

Do not duplicate backend commerce calculations in the client.

---

## 5. State

Keep client state limited to actual UI/session interaction needs.

Do not copy authoritative backend state into multiple frontend stores unnecessarily.

Examples of appropriate client state:
- Drawer/modal state
- Form state
- Temporary UI state
- Presentation filters
- Optimistic UI state that is reconciled with the backend

Cart/order/payment state must ultimately be reconciled with Medusa.

---

## 6. Checkout & Payments

The frontend must never declare payment success as authoritative.

Typical boundary:

```text
Customer
   ↓
Next.js
   ↓
Medusa
   ↓
Payment Provider
```

The backend verifies payment state.

Handle:
- Loading
- Failure
- Cancellation
- Timeout/unknown payment state
- Refresh/retry
- Duplicate submission

Do not create a second payment verification flow in the browser.

---

## 7. Security

- Do not expose private environment variables.
- Only intentionally public configuration may use `NEXT_PUBLIC_*`.
- Do not log tokens or sensitive customer/payment data.
- Do not place provider secrets in frontend code.
- Do not assume hiding a UI element is authorization.
- Do not trust route parameters or client state for authorization.
- Avoid unsafe HTML injection.
- Validate user input before sending it, but rely on backend validation for security.

---

## 8. Performance

Avoid:
- Unnecessary client components.
- Large client-side bundles.
- Duplicate API calls.
- Fetching unused fields/data.
- Rendering entire large collections unnecessarily.
- Blocking the UI on unrelated external operations.

Use appropriate:
- Server rendering
- Streaming/loading boundaries
- Pagination
- Image optimization
- Code splitting/lazy loading where justified
- Caching/revalidation where correct

Do not optimize prematurely. Measure or identify a real bottleneck before adding complexity.

---

## 9. API Errors

Do not expose raw backend/provider errors directly to customers.

Map errors into useful user-facing states while retaining safe diagnostic information server-side.

Handle expected states explicitly:
- Validation error
- Unauthorized/expired session
- Not found
- Out of stock
- Payment failure
- Provider unavailable
- Network failure

Do not silently swallow errors.

---

## 10. Architecture

Prefer:

```text
UI
 ↓
Presentation hooks/components
 ↓
Medusa API client
 ↓
Medusa backend
```

Do not put domain/business logic in UI components.

Avoid giant components and duplicated API logic.

Use existing project component, hook, and utility patterns before introducing new abstractions.

---

## 11. Commands

Only run storefront commands after confirming `apps/storefront/` exists.

Detect the package manager from root `AGENTS.md`.

Verify scripts in `apps/storefront/package.json` before executing commands.

Common commands may include:

```bash
<pm> run storefront:dev
cd apps/storefront && <pm> run lint
<pm> run build
```

Do not assume a storefront test suite exists.

---

## 12. Storefront Definition of Done

Before reporting work complete:
1. UI behavior works.
2. API integration uses existing Medusa patterns.
3. No backend business rules were duplicated.
4. No secrets are exposed.
5. Authentication/authorization boundaries are respected.
6. Loading/error/empty states are handled.
7. Relevant lint/type/build checks pass.
8. Existing behavior is preserved unless intentionally changed.
9. No unnecessary dependencies or abstractions were introduced.
10. No unrelated refactor was made.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
