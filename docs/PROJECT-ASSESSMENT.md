# VI2 Project Assessment

Reviewed: 5 October 2026.

This is an onboarding assessment of the current working tree, not a declaration that any feature is production-ready. Existing uncommitted changes were included in the review and preserved. No application behavior, dependencies, migrations, or environment files were changed for this assessment.

## Project and working conventions

VI2 is an Egyptian wellness and supplements storefront built on a Medusa DTC starter. The repository is an npm/Turborepo workspace with both applications present:

- `apps/backend`: Medusa 2.21.0, confirmed in the manifest and installed package. Owns commerce rules, authoritative state, and external integrations.
- `apps/storefront`: Next.js 16.3.3 and React 19.2.8 as declared in its manifest; installed Next.js version confirmed. Owns presentation, interaction, and calls to Medusa.
- Root package manager: `npm@11.6.2`, with `package-lock.json`. The starter README still describes pnpm, so actual manifests and root instructions take precedence.

Read all three AGENTS.md files and the architecture, security, integration, data-ownership, testing, and MVP references. The working approach is Medusa-native commerce with focused custom extensions, rather than rebuilding commerce primitives. Reuse existing code, keep business rules server-side, avoid speculative abstractions and dependencies, and accompany behavior changes with relevant tests.

Observed patterns to retain:

- Next.js App Router pages, interactive client components, colocated CSS modules, shared global styling, and Lucide icons.
- Medusa SDK access under `src/lib/medusa/services`, mapped storefront types, and region/customer/cart providers.
- Compatibility exports in `context/CartContext.tsx` and `context/AuthContext.tsx` reuse the providers; they are not separate state systems.
- Customer authentication goes through Next.js route handlers to Medusa. The Medusa token is held in an HttpOnly cookie with production Secure and SameSite settings.
- Medusa file-based routes, generated module services/models, migrations, product-module links, and native workflows.
- Backend defaults specify double quotes, two spaces, no semicolons, and kebab-case filenames. Existing backend files vary; storefront commonly uses semicolons. Preserve nearby style rather than mass-formatting.
- English/Arabic localization and RTL presentation are present. Localization and complete customer flows still need runtime verification.

Some presentation components are very large and heavily line-wrapped. Keep future edits focused; do not turn onboarding into a formatting or component rewrite.

## Requirements references

Both supplied PDFs were read across all four pages each and visually inspected. Their content is requirements evidence, not instructions to execute every feature immediately.

`RD vs1.pdf` identifies itself as Requirements Document version 1.1. It describes phone OTP, email/social authentication, phone-based guest account provisioning, Egyptian delivery selection, Paymob payments, Odoo handoff, admin role restrictions, supplement attributes, product-page behavior, order lifecycle communications, and analytics.

`Odoo_Paymob_Bosta_Integration_Requirements.pdf` is currently an unanswered configuration questionnaire. It does not confirm account capabilities, shipping policy, integration IDs, warehouse setup, or operational ownership. Integration work remains dependent on the completed answers expected on 6 October 2026.

### Decisions that need reconciliation

- The PDF proposes Odoo-to-platform inventory and fulfillment updates, while repository ownership remains conditional. Confirm the inventory owner, sellable-stock definition, reservation timing, warehouse rules, synchronization contract, and downtime behavior before implementing synchronization.
- Determine which system creates Bosta shipments and owns fulfillment transitions: Medusa, Odoo, or operations. The draft lifecycle does not establish this contract.
- Payment lists differ within the functional PDF. Checkout mentions Souhoola and Sympl as well as cards, wallets, ValU, and COD; its gateway section lists a smaller set. Confirm merchant-enabled launch channels. Current UI also offers InstaPay/bank transfer, which needs an explicit requirement.
- The PDF requests expiry dates and expanded analytics. Repository MVP guidance excludes batch/lot/expiry/FEFO and advanced analytics by default. Confirm launch scope and whether expiry is descriptive product metadata or operational batch tracking.
- Phone OTP needs the chosen SMS provider, verification and recovery rules, abuse controls, and guest-to-existing-account ownership rules. Do not link a guest to an existing account solely from an unverified phone number.
- The gateway failure copy claims no charge occurred. That promise cannot be used for an unknown network outcome; payment status must be verified before retry or success messaging.
- Bosta status names and suggested payment recovery actions in the PDF are draft requirements, not verified provider contracts.
- Structured regulatory/nutrition fields need approved data definitions and content ownership. A generic disclosure component does not establish a verified approval record.

## Implementation inventory

| Area | Observed implementation | Remaining work or uncertainty |
| --- | --- | --- |
| Catalog and product pages | Medusa product queries, mapped products/options/variants, variant selector, category/shop/brand/product screens | Sample-data fallbacks, guessed stock and review defaults, region configuration, structured supplement fields, and pagination need attention |
| Brand management | Custom brand model/service/migration, product-brand link, admin CRUD page/routes and store endpoints | Product presentation reads `metadata.brand`; confirm how this relates to the linked brand record before extending either representation |
| Variant administration | Admin quick-add widget and endpoint using native product workflows | Runtime validation, option combinations, repeated submission, partial failure, and role restrictions need coverage |
| Accounts | Email/password login and registration, customer provider, HttpOnly token handling, profile and order-history paths | No implementation of phone OTP, Google/Apple authentication, or phone-based guest account provisioning was found |
| Cart | Medusa cart and line mutations, promotion services, backend-derived totals, local cart-ID persistence, optimistic updates | Verify variant identity, concurrent mutations, refresh/retry behavior, customer association, and stale cart handling |
| Checkout | Address update, Medusa shipping options/methods, payment session initiation, native cart completion | Failed completion is currently shown as success; selected payment choices do not select real provider flows |
| Confirmation and account history | Medusa order listing endpoint plus locally stored last-order presentation | Confirmation reads browser storage; backend order details and status must become authoritative |
| Odoo, Paymob, Bosta | Requirements and architectural guidance | No corresponding custom provider/adapter/subscriber/job implementation found; configuration registers the brand module only |
| Search | Search UI obtains products through the existing catalog service | No Meilisearch integration found; search currently operates on the returned catalog subset |
| Automated testing | Jest configuration and backend integration setup exist | No application unit, integration spec, or E2E test files found; storefront has no test script |

These observations establish code presence, not runtime correctness or deployment status. The user's estimate of 50% is useful context but cannot be validated without agreed acceptance criteria and live flow testing.

## Prioritized findings

### 1. Checkout success is not gated on successful completion

`apps/storefront/src/app/checkout/CheckoutClient.tsx`, around lines 473-512, generates a random reference when `completeCheckout` returns `ok: false`, writes a last-order snapshot, clears the ordinary cart, and navigates to the success screen. A rejected or failed Medusa completion can therefore appear successful to the customer.

`src/lib/medusa/services/checkout.ts` also returns success with the cart ID if the response is neither a confirmed order nor the specifically handled cart error. `order/success/SuccessClient.tsx` reads its details from localStorage instead of retrieving the authoritative order.

First repair should require a confirmed Medusa order before clearing the cart or showing success, retain the cart on failure, and handle ambiguous responses explicitly. Test failed completion, unexpected responses, repeated submission, refresh, and confirmed success. Any guest order retrieval design must preserve access controls.

### 2. Payment and shipping presentation exceed the implemented behavior

Checkout presents COD, cards, and InstaPay but always initiates `pp_system_default`. Selecting a label does not implement payment processing or COD settlement policy. Shipping-method failures are caught and checkout proceeds. A frontend EGP 2,500 free-shipping message exists without a confirmed authoritative policy in the supplied documents.

Implement provider-backed flows after contracts are confirmed, and ensure displayed totals and shipping promises reflect Medusa configuration. Do not treat the default provider as a Paymob integration.

### 3. Catalog presentation can invent availability and social proof

`src/lib/medusa/services/products.ts` defaults missing stock to 99, ratings to 5.0, and review count to 1. Several screens fall back to `src/data/products.ts` when Medusa returns no products, including when retrieval fails. These defaults can present unavailable or nonexistent products as saleable and imply unsupported reviews.

Missing data, an empty catalog, and a backend outage need distinct presentation states. Do not infer stock or reviews. Preserve Medusa's authoritative inventory enforcement while fixing storefront representation.

### 4. Security and error handling need focused hardening

- Backend configuration falls back to a known development JWT/cookie secret when configuration is missing. Production startup should require configured secrets.
- Custom registration and admin routes use TypeScript casts and presence checks instead of complete runtime validation. Validate actual input types and values before trimming or passing data to workflows.
- Custom routes sometimes return raw exception messages; the order-history proxy converts backend failures to successful empty lists. Use safe errors and distinguish session expiration, empty results, and outages.
- The last-order snapshot persists customer contact/address details in localStorage and remains readable by same-origin browser code. Reassess its necessity and lifetime when confirmation becomes backend-backed.
- The PDF's admin role matrix has no matching custom enforcement found in the inspected routes. Native admin authentication alone does not demonstrate those commercial role restrictions.
- Authentication proxy fetches have no explicit timeout in the inspected handlers. Future external integration operations need bounded timeouts, retries, idempotency, and recovery as required by repository guidance.

### 5. Establish a reliable validation baseline

Root `test` invokes Turbo, but neither application declares a `test` script. Backend declares named Jest scripts; their POSIX environment-variable syntax needs a verified Windows execution strategy. Do not claim root test execution covers application behavior. Root seed orchestration also has no matching backend `seed` script.

The backend/admin uses React 18 declarations while the storefront uses React 19. Backend TypeScript output shows incompatible ReactNode definitions in the new brand page and quick-variant widget. Diagnose dependency/type resolution before changing versions; do not introduce a second lockfile or blanket overrides.

## Validation performed

- Storefront TypeScript check: passed with `--noEmit --incremental false`.
- Backend TypeScript check: failed with React JSX/type compatibility errors in admin customizations.
- Storefront lint: failed with 6 errors and 27 warnings. Errors include five explicit `any` usages in product mapping and a navigation assignment in `ValueSets.tsx` flagged by React immutability rules.
- Backend lint: passed with 4 warnings after rerunning with access to Medusa's local CLI configuration. Warnings identify direct module-service mutations in brand routes and registration compensation that should move into workflow steps.
- No application behavior tests were run because no relevant test files were found.
- Builds, database migrations, live checkout, provider calls, and deployment checks were not run. This assessment does not verify production readiness.

## Development order

1. Repair false checkout success and add regression coverage using existing tooling where applicable; establish trustworthy confirmation behavior.
2. Resolve the existing lint/type errors and ensure documented test/check commands actually cover each application.
3. Remove invented catalog availability/social proof and align brand/region data with confirmed owners.
4. Harden input validation, production secret configuration, session/error handling, and required admin authorization.
5. Use the completed integration questionnaire to record ownership and provider contracts, then implement Paymob, Bosta, and Odoo using Medusa providers/workflows/background processing.
6. Complete confirmed launch authentication, supplement data, and localization requirements; verify critical customer flows and production operations.

This order is a proposed backlog, not authorization to expand the MVP. No new synchronization ownership or business policy is decided by this assessment.

