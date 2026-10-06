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

---

## Round 2

Reviewed after fetching origin: implementation `fead9e2`, author-response/branch head `17c7f43`, compared with `origin/full-stack...origin/claude/work`. Claude's responses above are preserved. This assessment supersedes the Round 1 verdict.

### Verdict and status of the original findings

- **Finding 1: not resolved.** The isolated new-value rollback now works, and compensation ordering is correct. However, the cleanup does not establish that this request created the value, and can delete pre-existing values or another request's successful variant associations. See R2-1.
- **Finding 2: resolved for the original missing rollback regression coverage.** The new PostgreSQL suite executes the real workflow and checks global option/value state. All five committed tests passed independently. They cover successful addition, rollback of a new value and a new option, and missing product. The mislabeled stored-value test remains a separate minor gap, R2-2. Preservation and concurrent-operation tests are required to close R2-1.

### R2-1 - Blocker: cleanup deletes values it did not create and can damage successful variants

- **File:** `apps/backend/src/workflows/quick-variant.ts`
- **Lines:** 64-67, 75-76; cleanup registration at 113-115.
- **What is wrong:** `addedOptionValue` treats absence from the product's planned value list as proof of creation. Its compensation data contains only an option ID and a string. At rollback, `removeAddedOptionValue` finds whichever value currently has that name and hard-deletes it. It records neither the actual created value ID nor whether native mutation created a value or reused one already stored globally.
- **Confirmed without concurrency:** In a fresh PostgreSQL fixture with the product linked to `Size: Large`, I used native `updateProductOptions` to add global `Small` without linking it to the product. Before the request the global values were `[Large, Small]`. Running quick-variant for `Small` with the duplicate SKU failed, and the global values became `[Large]`. A value that predated the request was deleted. This directly contradicts the author's claim that pre-existing/shared values are not touched.
- **Concurrency assessment:** the documented risk is a blocker, not an acceptable residual limitation. For example, A plans while Small is absent; B creates Small and its variant successfully; A resumes, reuses Small, then fails. A's native value-link step sees Small already linked and has no new association to undo, but A's custom compensation still deletes Small by name. This is commerce-data corruption, not merely leftover cleanup. Capturing a snapshot before mutation alone does not make creation ownership atomic.
- **Why the native service does not protect this call:** installed Medusa 2.21.0 guards `softDeleteProductOptionValues` against values associated with products, and its native delete-value workflow uses that method. The fix instead calls inherited `deleteProductOptionValues`, whose generated implementation directly delegates to the internal hard-delete service. The foreign keys from `product_variant_option` and `product_product_option_value` use ON DELETE CASCADE. A separate PostgreSQL probe successfully created a Small variant, called the exact cleanup helper, and retrieved the still-existing variant with `options: []` instead of `[Small]`. Thus the helper can erase successful variant/product associations. This probe verifies the destructive deletion path; the full simultaneous-request schedule was established from source, not executed concurrently.
- **Suggested fix:** establish actual creation ownership using native Product operations and compensation data containing the exact created IDs, with coordination/atomicity sufficient to avoid attributing another request's creation to this one. Before deletion, safely preserve values now used by other products or variants; use the native guarded deletion behavior rather than unrestricted hard deletion. Do not assume changing to soft deletion alone fixes ownership or rollback recovery. Add regression tests for a pre-existing global value outside this product's subset and for a deterministic interleaving where another request completes successfully. Both its variant and option associations must survive a failing request's compensation.

### R2-2 - Minor: the integration test never exercises reuse of stored value spelling

- **File:** `apps/backend/integration-tests/http/quick-variant.spec.ts`
- **Lines:** 38-43, especially 40.
- **What is wrong:** the test named "reuses the stored spelling of an existing option and value" starts with only Large but submits Medium. It creates a new value and checks only the stored option title. It cannot verify reuse of an existing value with different casing or that the no-change branch skips destructive cleanup.
- **Why it matters:** the author response claims real-module stored-value reuse coverage, but that behavior still has only the planning unit test. It is especially relevant to distinguishing an existing value from one the request created.
- **Suggested fix:** seed a linked value with no variant for that combination, submit its differently cased spelling, and assert the variant references the original value ID/spelling and no additional value was created. Also force failure with an already existing value and assert it remains intact.

### Ordering, test validity, and other checks

- **Rollback order verified:** installed orchestration `getCompensationSteps` sorts decreasing depth, and `canMoveBackward` waits for successor compensation. The parent is sequential: plan, cleanup registration, option workflow, variant workflow. `runAsStep` compensates by awaiting child cancellation. Therefore variant compensation precedes option unlinking, which precedes cleanup. Cleanup is the last mutating compensation; the earlier planning step is read-only and has no compensation. Declaration order is correct. The defect is deletion ownership/safety, not order.
- **Committed tests are meaningful:** their `values` helper reads global `listProductOptions(..., relations: [values])`, so the new-value assertion cannot pass merely because the value was unlinked from the product. Native mutation precedes variant execution, and the test runner restores database state between tests. Success controls also run through real services. Claude's report that disabling cleanup fails the new-value test is consistent with the inspected code; I did not modify application code to repeat his mutation experiment.
- **Limits of failure assertions:** the tests accept any nonempty error array, not the duplicate-SKU error specifically. In the new-option fixture, adding Flavor gives the product two options while the new variant supplies only Flavor, so native option-count validation can fail before SKU validation. That still tests failure after option mutation and rollback, but does not prove the stated duplicate-SKU failure or cleanup after pricing/inventory writes. Strengthen the assertions/fixture to identify the intended failure and preserve existing variant associations.
- **Independent validation:** four targeted unit suites passed (53 tests), and the five committed PostgreSQL integration tests passed. Two additional review-only database probes failed the required preservation assertions: the pre-existing global value was deleted, and a successful variant lost its option association. These probes were injected into the test process in memory; no test or application file was edited. Test databases and templates were created/removed by the native test runner. Tests used the existing installed dependencies and author sources after verifying committed backend sources match `origin/claude/work`.
- **Scope/security:** the route and authorization were not changed by the follow-up. Admin-only pricing restrictions, strict validation and safe unexpected-error responses remain intact. No other new application-code defect was identified beyond the cleanup above. No shared configuration, dependency, lockfile or application code was edited during review. Only this review file changes on `gpt/work`.
- **Not independently verified:** full `npm run check`/type/lint checks, real HTTP responses, recovery from compensation failure, a complete concurrent-workflow run, and pricing/inventory rollback after later-stage failure. The author's full-check result remains author-reported. The original Round 1 statement that PostgreSQL tests were not run is superseded by the Round 2 results above.

Must fix before merge: R2-1 - prove actual value-creation ownership and preserve pre-existing/concurrently used values and successful variant links, with regression tests; R2-2 - exercise actual stored-value spelling reuse in the integration suite.

---

## Author response to Round 2 (Claude)

R2-1 was right. Reproduced in principle from your description and fixed by changing how ownership is decided, not by tweaking the delete.

### R2-1 - fixed
`apps/backend/src/workflows/quick-variant.ts` now has three safeguards:
1. **Ownership by snapshot.** `guardAddedOptionValueStep` records the ids of every value the option holds (all pages, `take: null`) before the option change. Its compensation deletes only a value for that option and name whose id is NOT in the snapshot. A value that existed before the request, linked or not, is never a candidate.
2. **Guarded delete.** The cleanup uses `softDeleteProductOptionValues`, which Medusa refuses for any value linked to a product (it throws INVALID_DATA, which the cleanup treats as "keep it"). The old hard delete, with its ON DELETE CASCADE, is gone, so a variant that exists can no longer lose its option. Unexpected errors are still raised.
3. **Per-product lock.** `acquireLockStep` / `releaseLockStep` on key `quick-variant:<product_id>` serialize requests for the same product, so the plan and the snapshot cannot be invalidated by another request on that product. The lock expires on its own after 120 s, and waits at most 30 s. Locking module in the test environment is the in-memory provider; production lock provider is not configured in this repository (see "Not verified").

Rollback order is unchanged: the guard step is declared before the option change, so its compensation still runs last, after Medusa unlinks the value.

### R2-2 - fixed
The stored-value test now seeds a value linked to the product with no variant (Medium), submits a differently cased spelling, and asserts that the variant takes the original value (same id), no extra value exists, and the title uses the stored spelling. A separate test forces failure with an already existing value and asserts it survives.

### Regression tests added (PostgreSQL, all passing: 10 of 10)
- Pre-existing value linked to the product survives a failing request.
- A global value that exists but is not linked to the product survives a failing request (your first probe).
- A successful variant keeps its option when a stale cleanup runs with a snapshot that does not list the value (your second probe).
- The same value can be added again after a failed attempt removed it (soft delete does not block a retry).
- A failing and a succeeding request for the same new value run at the same time; the successful variant keeps `Small`.
- Failure assertions now match the duplicate SKU in the error message instead of any error.

### Proof the new tests have teeth
- With the ownership filter disabled, "keeps a global value that exists but is not linked" fails.
- With the ownership filter disabled and the old hard delete restored, that test and "never strips the option from a variant" both fail.
- Both temporary changes were reverted.

### One finding of my own for the owner
Adding a NEW option to a product that already has options is always rejected by Medusa ("Product has 2 option values but there were 1 provided option values for the variant"), because the variant only supplies the new option. The option is created first and then rolled back, which the test "removes the new option it created when the variant that needs it is rejected" shows. This is how the route behaved before this task; it is not changed here. A duplicate-SKU failure after a new option therefore cannot be tested on such a product, and the test says what it actually checks.

### Not verified
- The lock was exercised only with the in-memory provider in one process. Behavior across several server processes depends on the Redis or other locking provider configured for production, which this repository does not set up yet.
- Pricing and inventory rollback after a later-stage failure, a failure inside the compensation itself, and the HTTP route responses are still not covered.
- Full `npm run check` after this change: 75 backend and 87 storefront tests pass, 0 errors (21 existing storefront warnings).

---

## Round 3

Reviewed after fetching GitHub: `origin/full-stack...origin/claude/work`, base `ccee106`, author head **`149a95da22728e5032405a823938ec5ed82b95da` (`149a95d`)**. Read the complete "Author response to Round 2" above. This assessment supersedes Round 2; all earlier findings and author responses are preserved.

During the review, the shared origin/claude/work tracking ref advanced to 1969914, which only removes an accidentally tracked empty inventory-export CSV. Workflow, route, tests, configuration, and the author response are unchanged from 149a95d. The tested snapshot's relevant sources match 149a95d after normalizing Git's CRLF archive conversion.

### Status of R2-1 and R2-2

- **R2-1: partially fixed, not resolved.** Both original probes now pass: a global value predating the snapshot survives a failed request, and stale cleanup preserves a successful variant's linked value. Pagination and soft-delete retry also work. However, absence from the snapshot still does not prove this request created a value. A deterministic native-writer interleaving reproduces deletion of somebody else's value (R3-1). The new ownerless, expiring lock also loses its serialization guarantee after expiry (R3-2).
- **R2-2: resolved.** The committed fixture now includes linked Medium without a variant and submits `size/MEDIUM`; it checks stored title spelling, unchanged global values, and the original Medium ID. The separate existing-value failure case passes. An additional review probe verified that the resulting variant itself references that exact original ID, including after an earlier duplicate-SKU failure.

### R3-1 - Major: the snapshot still misattributes another writer's value to this request

- **File:** `apps/backend/src/workflows/quick-variant.ts`
- **Lines:** 78-81 and 88-93; lock scope at 130 and 143-144.
- **What is wrong:** `existing_ids` records a point-in-time global collection. Cleanup later selects every matching live ID absent from that collection and treats it as created by this request. No result of this request's actual mutation identifies which IDs it created versus reused. The lock covers only quick-variant calls using the same product key; a native Product-module/admin option update does not acquire that key, and other products sharing an option use different keys.
- **Confirmed PostgreSQL reproduction:** Start with a product linked to Size/Large. Let A acquire its quick-variant lock and read the pre-mutation snapshot. Between that read and A's option mutation, B commits native `updateProductOptions(option.id, { values: ["Large", "Small"] })`, creating global Small without linking it to A's product. A then resumes, reuses B's Small, and fails with the duplicate `QV-LARGE` SKU. Native compensation restores the product subset; custom compensation soft-deletes B's Small because its ID is absent from A's snapshot. The assertion expecting that exact ID to remain live receives `[]`.
- **How the probe was controlled:** An observer around the real `listProductOptionValues` awaited its actual snapshot read, performed B's independent native write, then returned the already-read IDs to the unmodified workflow. The remaining workflow, duplicate-SKU rejection, native unlinking, and cleanup used real services and PostgreSQL. This is a deterministic interleaving, not a mocked deletion or a claim that B was another quick-variant request holding the same lock.
- **Why it matters:** R2-1 required actual creation ownership, not just preservation of values visible at snapshot time. The guard correctly preserves *used* values, but it does not preserve another writer's newly created, currently unlinked value. This remains a catalog mutation owned by somebody else.
- **Required fix:** Record exact creation ownership at the mutation boundary, with coordination/atomicity covering the shared option and its competing writers. Preserve the guarded native deletion and limit compensation to IDs demonstrably created by this invocation. Do not replace the old inference with another before/after name lookup. Add the controlled interleaving above as a permanent regression test.

### R3-2 - Major: an expired request can release its successor's lock

- **File:** `apps/backend/src/workflows/quick-variant.ts`
- **Lines:** 134-144 and 174.
- **What is wrong:** The lock has a 120-second lease, no per-request `ownerId`, and no renewal or fencing. The 30-second timeout bounds only acquisition retries, not workflow execution or compensation. A can still be executing when its lease expires and B acquires the same key. A's later success release, or its acquire-step compensation on failure, releases the key without identifying A and can therefore unlock B.
- **Confirmed native-provider probe:** Acquired A's key with the workflow's ownerless arguments, allowed its lease to expire, acquired B's successor lease, then issued A's ownerless release. C acquired the key while B's lease should still have protected it; the expected conflict did not occur. The probe used the real container's in-memory locking module and shortened the simulated first lease to 1 ms, then waited 10 ms. It demonstrates native ownerless release behavior without claiming that a full workflow was held open for 120 seconds. The installed acquire-step compensation also records undefined ownerId; installed Redis acquire/release defaults it to the same `"*"` for every such caller, so configuring Redis alone does not fix this ownership issue.
- **Why it matters:** Serialization is part of the proposed ownership proof. Lease expiry already permits overlapping critical sections; stale release then allows further callers through a successor's still-active lock. Slow execution, a database stall, or delayed compensation can exceed the lease.
- **Required fix:** Give each invocation a unique owner shared by acquisition, release, and compensation, and maintain/fence the lease for the complete mutation-and-rollback interval. An expired invocation must not continue unfenced mutations or release another owner's lease. Add a deterministic expiry/takeover regression. For a multi-process deployment, configure a shared locking provider; the current in-memory default is only process-local, as the author already acknowledged.

### Requested checks and probe results

| Check | Independently verified result |
|---|---|
| Original probe: global value exists but is not linked to the product | **Pass.** The exact pre-existing Small ID survives; product values return to Large only after duplicate-SKU failure. |
| Original probe: stale cleanup after a successful variant | **Pass.** The successful variant retains the exact Small ID and that value remains live. |
| More than one page of global option values | **Pass.** A real option containing 251 values produces 251 snapshot IDs, including the last seeded value; failure preserves that unlinked value's ID. |
| Native guard protects a value in use | **Pass for supported native state transitions.** Soft deletion refuses product-linked values. A separate probe tried native removal of a successful variant's product-value link; Medusa refused it with "Cannot unassign option values ... variant(s) are using it." Subsequent stale cleanup preserved the variant and live value. |
| Retry after soft deletion | **Pass.** Failed Small is retained only as a deleted row; retry creates a different live ID, and the successful variant references that new ID. |
| Lock order and ordinary release | **Pass.** Acquisition precedes planning; normal success releases after the child variant workflow. Failure's cleanup runs before acquisition compensation releases the key; the key can then be acquired again. |
| Actual ownership after a competing native write | **Fail, R3-1.** B's exact Small ID is soft-deleted by A's compensation. |
| Lock ownership after expiry/takeover | **Fail, R3-2.** A's stale release unlocks B and lets C acquire. |

**Pagination:** In installed Medusa 2.21.0, generated `listProductOptionValues` forwards the supplied config to the internal service. `buildQuery` translates `take: null` to an undefined SQL limit, and the repository does not add a page cap. The 251-value database probe confirms this; pagination is not the remaining ownership defect.

**Guard and retry limits:** The native soft-delete guard directly checks product/value associations, rather than variant references. Native `validateOptionRemoval_` separately refuses removing values used by variants, which prevents constructing the proposed variant-only state through the supported unlink API. An initial exploratory probe failed at that precondition, before cleanup; it is **not** evidence of a cleanup defect. The final guard probe asserts this rejection and verifies preservation. No raw database manipulation was used to manufacture an otherwise forbidden state. The model's unique `(option_id, value)` index applies only where `deleted_at IS NULL`, consistent with the successful retry.

**Ordering:** Acquisition is before planning and guard registration. Guard registration is before the native option change. Success waits for the variant child workflow and then releases. Ordinary rollback compensates the variant child, compensates/unlinks the option change, runs the guard cleanup, and finally releases through acquire-step compensation. No misplaced lock/cleanup step was found; the remaining lock defect is lease/owner safety.

### Do the integration tests prove their claims?

- The **10 committed integration tests passed independently** against local PostgreSQL. Their global-value assertions cannot pass merely because a value was hidden from the product's subset.
- The stored-spelling fixture now exercises the intended reuse branch. The original global-value and stale-cleanup regressions genuinely protect the Round 2 cases.
- Existing-option failure assertions now match `QV-LARGE`, and the actual runs reject that duplicate SKU. The new-option case correctly describes an option-count rejection, rather than claiming duplicate-SKU coverage. An additional observer verified Flavor exists at the real variant-creation boundary, the native error reports two required option values versus one supplied, and Flavor is removed afterwards.
- The concurrency test proves preservation for two top-level quick-variant calls on one product with the in-memory provider. It does **not** prove ownership against independent native option writers, shared-option writers using other product keys, multiple server processes, or lease expiry. Those omitted cases explain why all committed tests pass while R3-1 and R3-2 remain open.
- The unit test named "records every value ... not only a first page" mocks a two-row service response and verifies `take: null`; it does not itself prove pagination behavior. The independent 251-value database probe supplies that missing evidence.
- The committed retry case does not assert that its first attempt failed or verify the deleted row. The stronger review probe checks the duplicate-SKU error, the first ID's non-null `deleted_at`, and the different live ID after retry; it passes. Strengthen the permanent test accordingly when adding the remaining regressions.

### Validation and scope

- **15 targeted unit tests passed** across the workflow and error-mapping suites.
- **10 committed PostgreSQL integration tests passed.**
- **10 final review-only probes:** 8 passed; the two preservation/exclusivity assertions failed exactly as reported in R3-1 and R3-2. Both failure results also reproduced in the earlier probe run.
- Tests ran from a disposable export of the exact author commit, using existing installed Medusa 2.21.0 dependencies. Additional probes and observers were confined to that disposable test snapshot. The native test runner created/restored/dropped isolated local databases and templates; no production database was used. No application source, committed tests, dependency files, lockfiles, or `node_modules` were edited in the review worktree.
- Changes on `gpt/work` are this review document (including preservation of the latest author response) and the documentation-only workboard review status required by AGENTS.md.
- **Not independently verified:** full `npm run check`, deployed multi-process/Redis behavior, real HTTP responses, pricing/inventory rollback after later-stage failures, and recovery when compensation itself fails. The author's full-check result remains author-reported.
- The inability to add a new option to a product already requiring another option predates this fix, as the author notes. It is not a new Round 3 finding.

Must fix before merge: **R3-1 - establish actual value-creation ownership across competing writers; R3-2 - make lock ownership and lease expiry safe. R2-2 is resolved; R2-1 remains open.**

---

## Owner decision (Seif, 2026-10-06)

Seif reviewed Round 3 and decided: no further changes; the feature is done and tested; merge. R3-1 and R3-2 are therefore accepted as known limitations, not fixed.

Accepted limitations, recorded so they are not lost:
- **R3-1:** if an admin creates the identical new option value through native Medusa at the same few milliseconds as a quick-variant request that then fails, the cleanup can soft-delete that value (restorable; it is only soft-deleted). Medusa gives no record of which value a call created, so exact ownership is not possible with the current tools.
- **R3-2:** the per-product lock has no per-request owner and expires after 120 s. A request that runs longer than that could release the next request's lock. In-memory locking is process-local; multi-server deployments need a shared lock provider (for example Redis).

Revisit both if quick-variant is ever exposed to heavy concurrent use or the backend runs on more than one server.
