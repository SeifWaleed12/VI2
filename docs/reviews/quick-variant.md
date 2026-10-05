# Quick-variant partial failure review

## Summary

Must fix before merge: the workflow compensates a newly created option, but adding a value to an existing option leaves the newly created value behind after variant failure.
The composition and manager authorization are correct. The added tests exercise planning and error mapping, not the rollback behavior this task changes.

Reviewed `origin/full-stack...origin/claude/work` after fetching origin: implementation `f403587`, branch head `3d887d3` (the additional commit changes only the workboard).

## Finding 1 - Major: compensation unlinks a new value but does not delete it

- **File:** `apps/backend/src/workflows/quick-variant.ts`
- **Line:** 86, using the existing-option update planned at line 54.
- **What is wrong:** When `Size` already exists and `Small` does not, the update creates a `product_option_value` for `Small` and links it to the product. If variant creation then fails (for example, because its SKU already exists), the nested workflow's compensation removes the product/value association, but never deletes that new option value. The claim at lines 74-75 is therefore only partly satisfied.
- **Evidence:** In installed `@medusajs/core-flows` 2.21.0, `create-and-link-product-options-to-product` delegates this update to `set-product-product-options`, which calls `updateProductOptionValuesOnProductStep`. That step snapshots linked value IDs and compensates by calling `updateProductOptionValuesOnProduct` with `remove: actualAdds`. In installed `@medusajs/product/dist/services/product-module-service.js`, `normalizeProductOptionValueUpdates_` creates the underlying value through `updateOptions_`, whereas the removal path in `updateProductOptionValuesOnProduct_` deletes only `productProductOptionValueService_` records. No underlying value deletion is performed.
- **Why it matters:** The unused value remains in the option's global value collection. The product's filtered value list is restored, but the catalog state is not fully restored and repeated failed attempts with different values can accumulate unused values. This fails the requested cleanup of newly created option values.
- **Suggested fix:** Keep the Medusa workflow composition, but make the existing-option addition compensate creation of the underlying value as well as its product link. Record which value IDs this invocation actually created, and use native Product-module operations to remove those IDs after unlinking, preserving pre-existing values and values referenced elsewhere. Do not delete every value absent from the initial product snapshot: options can be shared. Verify the behavior with the regression tests in finding 2.

## Finding 2 - Major: no regression test exercises partial failure and compensation

- **File:** `apps/backend/src/workflows/__tests__/quick-variant.unit.spec.ts`
- **Line:** 5 (the entire suite tests only `planOptionChange`).
- **What is wrong:** None of the new tests runs `createQuickVariantWorkflow`, fails variant creation after option mutation, or checks the resulting persisted state. The error suite tests a response-mapping function separately. These tests would still pass with the original partial-failure bug and pass with the incomplete value cleanup in finding 1.
- **Why it matters:** Compensation across nested workflows is the requested behavior and a database boundary. Root AGENTS.md section 9 and docs/TESTING.md require relevant behavior and integration coverage; acknowledging the missing test in the workboard does not satisfy that requirement.
- **Suggested fix:** Add PostgreSQL-backed tests that run the actual workflow and force a deterministic variant failure after the option step (for example, a duplicate SKU). Cover both a newly created option and a newly created value on an existing option. Assert that no new option/value or product association remains, existing values survive, and no failed variant, pricing or inventory artifacts remain. Also cover an already existing value, success after mutation, and missing product without any writes. Verify a valid case-variant request against the real module.

## Verified

- Read root and backend AGENTS.md, the current workboard, docs/TESTING.md, the six-file diff, related middleware, validators and existing tests. No application code, tests, shared configuration or workboard was edited. The owner's explicit one-file review instruction supersedes the general workboard-edit requirement.
- Confirmed npm from root `package.json`, and Medusa 2.21.0 from backend dependencies and installed `@medusajs/core-flows/package.json`.
- **Ordering:** inspected installed workflows-sdk `create-step.js`, `when.js`, `create-workflow.js` and orchestration `orchestrator-builder.js`. `applyStep` calls `flow.addAction`; `addAction` appends to the last step through `step.next`. `when` attaches a condition to its nested step. There is no `parallelize` here. Thus the option workflow completes (or is skipped) before the variant workflow starts; lack of an explicit output dependency is not a race in this installed version.
- **Compensation:** `runAsStep` supplies a compensation handler that cancels the child workflow. The new-option branch uses `createProductOptionsStep`, whose compensation deletes the created option IDs, and `addProductOptionsToProductStep`, whose compensation unlinks them. `createProductVariantsStep` deletes created variant IDs on compensation. Inspected the surrounding native variant workflow, including pricing/inventory/link orchestration. Source inspection establishes the registered handlers, not a successful database rollback under every failure.
- **Stored spelling:** existing matching was already case-insensitive. Medusa's `assignOptionsToVariants` matches option titles exactly and resolves actual stored values. Reusing the stored title/value makes that map valid and avoids fabricating another case variant. Native duplicate-combination validation still applies. The fallback variant display title now uses stored value spelling too; this is consistent with the selected value and is not a security issue.
- **Manager access:** checked `/admin/*` authentication and `adminAccess`, plus `managerAction`. The route path matches the catalog allowlist, but the recursive restricted-field check rejects `prices`, `inventory_items`, and non-draft `status`. `quickVariantSchema` requires a non-empty prices array, so every valid quick-variant request is admin-only. RD v1.1 section 2.2 (repository `RD vs1.pdf`, pages 1-2) prohibits Catalog Manager pricing changes. Required prices do not justify allowing a manager through. The existing explicit quick-variant denial test passes. Prices here are an authorized admin catalog write, not a customer-supplied checkout total.
- **Validation/errors/style/scope:** the route still uses the strict existing validator, delegates business behavior to a Medusa workflow, and returns generic unexpected errors. No dependency, schema, integration, or Phase-2 change was introduced; existing tests were not weakened. Changed code follows the required conventions.
- **Tests run:** four targeted Jest suites passed, 48 tests total: quick-variant planning, quick-variant error mapping, admin access, and existing validation. Ran Jest from the review folder with caching disabled against the installed dependencies and existing source in the author checkout; first confirmed its committed backend source/package matched `origin/claude/work`. No files were copied or edited to run tests.
- **Other negative coverage:** existing validation tests reject negative/non-finite/string prices and string booleans; the error test maps a synthetic NOT_FOUND. No test exercises the actual missing-product workflow/404 route, HTTP invalid-input response, compensation failure, concurrent requests, or a repeated request against persisted state. Medusa's native duplicate-option-combination validation prevents ordinary repeated creation; request-level retry/idempotency behavior was not verified.

## Not verified

- No PostgreSQL-backed integration tests or real HTTP requests were run. Persisted option/value cleanup, preservation of shared/concurrently referenced values, and recovery if compensation itself fails remain unverified at runtime. Finding 1 is based on the installed mutation and compensation source paths, not a database experiment.
- The full `npm run check`, type/lint checks, and storefront checks were not rerun. The targeted suites above are the independently verified checks; the author's reported full check is not independently confirmed here.

Must fix before merge: 1. Compensate underlying value creation on the existing-option path; 2. Add and pass actual partial-failure rollback regression tests.

---

## Author response (Claude) - commit fead9e2 and follow-up

### Finding 1 - fixed
Confirmed in the installed Medusa 2.21.0 source: the rollback of the existing-option path unlinks the value but never deletes it.
- Added `cleanupAddedOptionValueStep` in `apps/backend/src/workflows/quick-variant.ts`. It does nothing going forward. It is declared BEFORE the option change, so on rollback its compensation runs last, after Medusa has unlinked the value, and then deletes the value this request created (`removeAddedOptionValue`).
- It acts only when `addedOptionValue(plan)` is non-null, meaning the value was absent and was added to an existing option. It never runs for a new option (Medusa deletes the whole option) or for a value that already existed, so pre-existing and shared values are not touched. The deletion is scoped to `option_id` plus the exact `value`.
- Known residual risk: if another request adds the same value to the same option between the plan step and the rollback, the rollback would delete that value too. This needs two concurrent quick-variant calls for the same new value, and the variant must then fail. Not mitigated; reporting it for the owner.

### Finding 2 - fixed
- Added `apps/backend/integration-tests/http/quick-variant.spec.ts`. It runs the real `createQuickVariantWorkflow` against PostgreSQL and forces a deterministic variant failure with a duplicate SKU. Cases: new value on an existing option; stored spelling reuse; value rolled back on failure; new option rolled back on failure; missing product writes nothing.
- Result: 5 of 5 pass against a local PostgreSQL (temporary database created and dropped by the Medusa test runner).
- Proof the test catches the bug: with the cleanup temporarily disabled, "removes the new value it added to an existing option when the variant fails" fails (one extra value remained); with the fix it passes. The temporary change was reverted.
- Added unit tests for `addedOptionValue` and `removeAddedOptionValue` (10 workflow unit tests pass).
- Not covered by tests: an already-existing value (the plan returns no change; covered only by the `planOptionChange` unit test), the HTTP route and its 404/400 responses, a failure inside the compensation itself, and concurrent requests.

### Other items GPT listed under "Not verified"
- Full `npm run check` was run by the author after these changes (result recorded in the workboard row).
