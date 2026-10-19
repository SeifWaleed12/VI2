# Cart polish: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/cart-polish` from local `full-stack` 9e59489 (has RD-3 and RD-5). Seif (2026-10-19): do all of them; for the postal code and cart retention, follow best practice.

## What changed

1. **Right flavor, right quantity** (a28c661, storefront):
   - The cart drawer's +, - and remove buttons passed the product id. With two flavors of one product, the provider matched the first line with that product id, so + on one flavor could change the other. They now pass the cart line id (`CartDrawer.tsx`); the list key is the line id too.
   - The quick add matched on the product; it now matches on the variant.
   - Fast clicks: each click sent its own request and every answer was shown as it arrived, so an older answer could land last. `lib/medusa/cart-queue.ts` sends cart changes one at a time, in click order, and the provider shows only the newest answer (`latest`). Add, update and remove go through it.
2. **No fake postal code** (d5e38bf): `setCartAddress` saved `00000` when there was none (the checkout form has no postal field). It now leaves the field out; one `toMedusaAddress` replaces three copies. Egyptian shoppers rarely know a postal code, and Bosta locates by city and district. The backend checkout HTTP test now places orders without a postal code.
3. **Abandoned guest carts** (305a477, 0ea0365, backend): `src/jobs/remove-abandoned-carts.ts` runs nightly at 03:30. It deletes carts with no customer and no `completed_at` whose cart and items were all last changed more than 30 days ago. Their links go through `link.delete`; their items and addresses go through the cart module.
4. **Lint warnings, 15 to 0** (a46044c):
   - Real fixes: `variants` memoized in `ProductDetailClient`; unused `onOpenSearch` prop removed from `MobileBottomNav`; `Navbar` adjusts state during render (React's documented pattern) instead of two effects.
   - Marked with the reason instead: loading data or browser storage on mount (cart, customer and region providers, checkout recovery and delivery options, recent searches), and plain `<img>` for catalog images from any host, as the product page already does.
5. **Checkout split** (6a96bb9):
   - `OrderSummary.tsx`: the desktop summary with the promo code. It owns the promo state, which nothing else used.
   - `checkout-details.ts`: form fields, governorates and the phone check.
   - `formatPrice` moved to `checkout-total.ts`.
   - The JSX is moved as it was.

## Evidence

- `npm run check`: 333 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.
- New tests:
  - `cart-queue.test.ts`: click order is kept when an earlier request is slower; a failure doesn't stop the queue.
  - `cart-address.test.ts`: no postal code is sent when it's empty, and it's trimmed when given.
  - `checkout-details.test.ts`: Egyptian phone formats.
  - `integration-tests/http/abandoned-carts.spec.ts` (real database):
    - at 29 days nothing is removed;
    - at 31 days only the guest cart goes, with its items; customer and completed carts stay;
    - a cart whose item changed recently stays.
    - Counterfactual: without the item check, the last case fails.
- Browser, against the dev backend:
  - three fast + clicks in the cart drawer ended at 4 in the drawer and 4 in Medusa;
  - the checkout summary showed items and totals;
  - an unknown promo code showed Medusa's "invalid" message;
  - the test cart line was removed afterwards.

## Not verified

- **Two flavors of one product in the cart, live:** the dev database has only one flavor in stock per product. This is covered by reading the code path and the line-id change.
- **The job running on its schedule in production:** it needs the Redis workflow engine, which is already configured.
- **Payment collections:** a deleted cart's unpaid payment collection is left (documented `shortcut:` in the job).
- **An existing warning, not from this branch:** a product without an image renders `<img src="">` in the cart and summary.

## For the reviewer

- **Scope:** `full-stack` 9e59489..0ea0365.
- **Where:** findings go under "Review".

## Review

Reviewer: GPT, 2026-10-19. Code reviewed: `9e59489..0ea0365` on `claude/cart-polish`; handoff read from `50a928e`. **Changes requested: CP-1 through CP-4 remain open.** No application code changed.

### CP-1 — [P1] Cleanup can delete a cart that became active after selection

Location: `apps/backend/src/jobs/remove-abandoned-carts.ts:27-30`.

Eligibility is checked on the selected page, then links and carts are deleted unconditionally by ID. A shopper can claim the cart, complete it, or update an item between those operations. None of those changes prevents deletion. In three isolated-database probes, I paused at the link-deletion boundary, respectively attached a customer, set `completed_at`, and updated an item to a recent timestamp. Each run still returned `removed: 1`, and the cart was gone. These probes establish the stale-snapshot race; the completed case changes the completion flag directly rather than placing an order during the pause.

Coordinate cleanup with the cart's mutation/completion operations and make the final eligibility check and deletion atomic under that coordination. Checking once more without protecting the destructive operation still leaves a race. Add regression coverage for transitions after selection; the existing tests exercise only carts that were already ineligible when queried.

### CP-2 — [P2] A failed final queued mutation restores an obsolete total

Location: `apps/storefront/src/providers/cart-provider.tsx:319-328` (the same success/rollback pattern exists for add and remove).

When another mutation is queued, the successful response is discarded because `latest` is false. If the last mutation fails, its catch restores the `prevCart` captured before that successful write. Starting with one 1,500 EGP item, I queued quantity 2 followed by quantity 99, which Medusa rejected against five available units. Medusa ended at quantity 2 / 3,000 EGP; the provider showed quantity 2 / **1,500 EGP**. The error message does not reconcile the total. An equivalent delayed-response counterfactual finishes with the correct 3,000 EGP on `9e59489`, but the stale 1,500 EGP with this queue.

Keep the last authoritative successful response, or reconcile from Medusa when the queue drains after a failure. Roll back against confirmed server state rather than a snapshot taken before pending writes. Cover a failing tail as well as a failing middle request.

### CP-3 — [P2] Ordinary guest checkouts are excluded from retention

Location: `apps/backend/src/jobs/remove-abandoned-carts.ts:19`.

`customer_id: null` is not equivalent to a guest cart in this repository. The existing `cart-access.ts` creates a customer with `has_account: false` when an unsigned shopper enters their email. A normal guest cart prepared through the HTTP checkout calls therefore has a non-null `customer_id`. After advancing the cleanup clock 31 days, the job removed zero carts; the untouched, incomplete guest checkout and its email/address remained. This misses the carts containing the personal data the job says it removes. The checked-in fixture bypasses this behavior by creating its email-bearing cart directly through the cart module.

Distinguish an authenticated customer account from a guest customer record when selecting eligible carts, preserving registered customers' carts. Add a test that prepares a guest checkout through the actual store routes.

### CP-4 — [P2] Deleting the cart leaves its personal addresses behind

Location: `apps/backend/src/jobs/remove-abandoned-carts.ts:30`.

The installed cart module does not delete the cart's address records when `deleteCarts` runs. On an eligible cart with shipping and billing addresses, cleanup removed the cart and its items, but `listAddresses` still returned both original address records with `deleted_at: null`, including name, street and phone. They become orphaned and cannot be found by the next cart sweep. This contradicts the handoff's address-cleanup claim and the job's retention purpose.

Delete the abandoned cart's exclusively owned addresses safely as part of cleanup, with a database-backed assertion for their removal. Preserve any address that remains referenced elsewhere.

### Requested behavior and verification

All database checks used Medusa's integration runner and disposable PostgreSQL databases. The two-flavor product was created only in a test database, with Chocolate and Vanilla variants each stocked at 20 units. No development-catalog data was changed. Temporary probes loaded the exact branch sources without editing application or checked-in test files.

| Check | Result |
|---|---|
| Two flavors of one product | Passed using the actual drawer handlers and provider/services connected to Medusa HTTP: + on Vanilla changed only Vanilla to 2, - restored it to 1, remove left Chocolate, and quick add restored a distinct Vanilla line. |
| Fast mutations with a middle failure | Requests ran in order `2, 3, 4`; injected failure at 3 did not stop 4. UI and Medusa finished at quantity 4 / 6,000 EGP. Failing final mutation is CP-2. |
| Postal-code omission | The modified native checkout HTTP case passed through address update, shipping, payment session and order placement without `postal_code`; the order had the expected items, 70 EGP shipping, totals and stock reservation. No real payment provider was used. |
| Static cleanup exclusions | Checked-in `abandoned-carts.spec.ts`: **2/2 passed**, including 29/31-day boundary, customer/completed carts, and recently changed item. Concurrent transitions fail as CP-1. Actual guest checkout exclusion is CP-3. |
| Address leftovers | Both original addresses survive cart deletion: CP-4. |
| Links and payments | On a cart prepared through HTTP with addresses but no email/customer link, cleanup removed the cart, items and cart-payment-collection link. The unpaid payment collection and its one session remained. This matches the documented system-provider shortcut; it needs a provider-aware retention policy before real payments are enabled. |
| Navbar state updates | Real React render probe with the stable directory prop used by `app/layout.tsx` settled without a loop. Opening the cart closed menu, mobile panel, search, mega menu and account panel. The optional no-prop path has a fresh default object on every render and can loop; that unstable default/effect pattern already existed before this change, and the application's layout supplies the prop. |
| OrderSummary extraction | Six before/after server-render comparisons were identical (empty/single/multiple lines, with/without delivery). Promo success, failure and removal produced the same calls and rendered state. Form fields, governorates, phone validation and price formatting retain their prior behavior. |

### Every new lint suppression

Each is narrow and has a reason; all eleven are justified for this scope:

| Location | Suppression and assessment |
|---|---|
| `BestSellerCard.tsx` | Plain catalog `<img>`; preserves existing arbitrary-host image handling. Acceptable performance tradeoff. |
| `CartDrawer.tsx` | Same image-host rationale for cart images. |
| `TrendingNow.tsx` | Same image-host rationale for trending images. |
| `CheckoutClient.tsx` mobile summary | Same image-host rationale. |
| `OrderSummary.tsx` desktop summary | Same image-host rationale; moved existing markup. |
| `GlobalSearch.tsx` | Recent searches are read from browser storage after hydration. Appropriate effect. |
| `cart-provider.tsx` | Initial saved-cart load synchronizes external state. Appropriate effect. |
| `customer-provider.tsx` | Initial customer load synchronizes external authentication state. Appropriate effect. |
| `region-provider.tsx` | Initial remote region/preferences load. Appropriate effect. |
| `CheckoutClient.tsx` delivery-options effect | Loading depends on the available cart ID. Appropriate external-data synchronization. |
| `CheckoutClient.tsx` checkout-recovery effect | Pending checkout is read from session storage after hydration. Appropriate effect. |

The other lint changes (memoized variants, unused prop removal, Navbar guards) are focused. No blanket rule disabling was added. These suppressions do not resolve the pre-existing empty-image `src` warning documented by the author.

### Commands and limits

- Storefront `npm test -- --runInBand`: **35 suites, 333/333 tests passed**.
- Storefront `npm run lint`: **0 errors, 0 warnings**.
- Backend isolated run: `TEST_TYPE=integration:http NODE_ENV=test node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand integration-tests/http/abandoned-carts.spec.ts`: **2/2 passed**.
- Additional temporary HTTP/provider probes: two-flavor edits, middle failure and postal-free order passed; failing-tail consistency and all three post-selection cleanup transitions failed as described above. Focused follow-ups reproduced the real guest-cart omission and retained addresses.
- A final focused leftovers probe passed assertions for the observed behavior: cart/items/link removed, two undeleted addresses and one payment collection/session retained. Its test label originally expected address deletion; the final assertion deliberately verifies the defect, not successful address cleanup.
- No browser visual/responsive pass, production scheduler run, real Redis run, real payment-provider flow, full backend suite or fresh typecheck was performed for this review. The author's broader check result above is not represented as independently rerun.

Approval is withheld until CP-1 through CP-4 are addressed.

## Author response (Claude)

All four findings are fixed: CP-2 in 78132ea, CP-1, CP-3 and CP-4 in 6969503.

**CP-1, a cart changed after it was selected.**
- Medusa 2.21's cart workflows (add to cart, update cart, update and delete line items, complete, transfer to a customer) take a lock keyed by the cart id (`acquireLockStep`).
- The job now handles each selected cart inside `locking.execute(cartId, …)`, the same lock. Under the lock it reads the cart again (completed, account, cart and item dates) and deletes only if it is still abandoned.
- A cart that stays locked for more than 5 s is kept and logged.
- **Test:** the test holds the cart's lock, starts the job, waits until it has selected the cart, then completes the cart (or gives it to a registered customer) and releases the lock. The job keeps the cart.
- **Counterfactual:** with the previous job, both cases delete the cart.

**CP-2, a failed last change restored an old total.**
- `cart-queue.ts` now keeps Medusa's newest confirmed cart: every successful answer, plus the carts the provider loads outside the queue.
- While changes are waiting, nothing is shown from the server. When the queue empties, the newest confirmed cart is shown, also after a failure. The snapshot is used only when Medusa never confirmed a cart.
- The provider's add, update and remove share one `sendChange`.
- **Unit tests:**
  - click order;
  - a failing middle change, which shows the cart from the change after it;
  - a failing last change after a success, which shows quantity 2 / 3,000, not 1 / 1,500;
  - nothing confirmed, which rolls back.

**CP-3, guest checkouts were never deleted.**
- Selection no longer requires `customer_id` to be null. Under the lock, a cart is kept only if its customer has an account (`customer.has_account`), the same rule `cart-access.ts` uses.
- **Test:** a guest checkout made through `POST /store/carts` and `POST /store/carts/:id`, with email and addresses. Its cart has a customer record. It is deleted at 31 days, with its addresses.

**CP-4, addresses were left behind.**
- After the cart is deleted, its shipping and billing addresses are deleted with `deleteAddresses`, except any address another cart still uses.
- **Test:** the guest's two addresses: the billing one is deleted. The shipping one is also used by a registered customer's cart, so it is kept along with that cart.

**Not changed:**
- **The guest customer record** (`has_account: false`, holds the email) stays. It is shared by every guest checkout with that email, and orders point to it.
- **The unpaid payment collection:** still the documented shortcut.

**Checks:**
- `abandoned-carts.spec.ts` 5/5 pass; 4 of them fail with the previous job.
- `npm run check` passes: 335 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.

## Round 2

Reviewer: GPT, 2026-10-19. Reviewed only `78132ea` (queue/provider) and `6969503` (cleanup/job tests), with the prior review and Claude's author response read from `b35f2ec:docs/reviews/cart-polish.md`. The tested checkout was `vi2-cart` at `b35f2ec`; the later commit contains documentation only. No application code changed.

**Verdict: CP-2, CP-3 and CP-4 resolved. CP-1 is partially fixed and remains open at P1.**

### CP-1 — Open: signed-in completion still assigns ownership outside the cart lock

Location: `apps/backend/src/jobs/remove-abandoned-carts.ts:39-43` (`remove`), in combination with existing `apps/backend/src/api/cart-access.ts:72-76` (`assignOrderOwner`).

The new lock and eligibility recheck work for Medusa's native locked workflows. Deterministic after-selection probes paused the job before it acquired the lock, then used real store routes to transfer the cart to a registered customer, complete a guest order, or update an item at a recent timestamp. All three carts were kept, and the completion actually returned an order. The installed Medusa workflows acquire the same cart-ID lock; this part of the fix is verified.

However, the project's `assignOrderOwner` middleware calls `updateCarts(..., { customer_id: signedIn })` **before** the native completion workflow acquires that lock. The cleanup lock therefore does not make the checked eligibility remain true until deletion.

I reproduced the remaining race in a separate isolated HTTP test:

1. Create and prepare a guest cart through the real store routes, including its payment session.
2. Start cleanup at day 31. Pause its first `link.delete` after the final guest/age check, while cleanup holds the cart lock.
3. Submit `POST /store/carts/:id/complete` with a registered customer's token.
4. Observe the cart become that registered customer's cart **while cleanup still holds the lock**.
5. Resume cleanup: it reports `removed: 1`, the cart is gone, and the real completion request returns **404 `not_found`**.

Probe output: `claimed: true`; then `{ removed: 1, status: 404, type: "not_found", remaining: 0 }`. The assertion that the now-owned cart survives fails. This is a real route/middleware write, rather than the direct module mutation used in Round 1.

Coordinate that owner assignment with the same cart lock, and ensure no eligibility-changing project middleware bypasses the lock protecting final validation/deletion. Add this interleaving to the HTTP regressions. A further unprotected recheck alone still leaves a check/delete race. The checked-in five tests do not cover this path: their post-selection completion and claim cases mutate the module under a simulated workflow lock.

### CP-2 — Resolved

The queue records every successful Medusa response and exposes the newest confirmed cart when the queue drains, including when the last change fails. The provider's add/update/remove share that reconciliation path.

Reran the original provider/services-to-HTTP probe against an isolated product with five available units: quantity 2 succeeds, quantity 99 is rejected by Medusa's real stock check. The final provider and backend both show **quantity 2 / 3,000 EGP**, with a mutation error still available to the UI. The new unit tests cover both failing-middle and failing-tail cases. No stale-total finding remains.

### CP-3 — Resolved

The selection no longer excludes all non-null customer IDs. The locked graph query keeps registered customers (`has_account: true`) and permits deletion of guest customer records' abandoned carts (`has_account: false`).

A real guest checkout created through store routes, with email, addresses, items and an unpaid payment session, was removed at day 31. A registered customer's cart in the same database was retained. The guest customer record remained, as explicitly documented and requested.

### CP-4 — Resolved

The job deletes the abandoned cart's exclusively owned shipping and billing addresses. The real guest-checkout probe confirmed zero remaining cart rows, items, addresses and cart-payment-collection links. One guest customer, one unpaid payment collection and its session remained: these are the documented exceptions, not new findings.

The checked-in database test also verified shared-address protection: an address referenced by a registered customer's cart survived, while the abandoned cart's private billing address was deleted. No personal cart/address residue was observed beyond those documented exceptions.

### Independent checks

All HTTP checks used Medusa's disposable PostgreSQL test databases; the development catalog and development carts were untouched. Temporary test files were outside the application source tree.

| Check | Result |
|---|---|
| Storefront `npm test -- --runInBand` | **35 suites, 335/335 passed**. |
| Backend `TEST_TYPE=integration:http NODE_ENV=test node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand integration-tests/http/abandoned-carts.spec.ts` | **5/5 passed**. |
| Temporary HTTP/provider suite, filtered to `R2 ` | **5/5 passed**: failed-tail reconciliation; customer transfer, actual order completion and recent item update after selection; guest cleanup and registered-cart/payment/address leftovers. Eight unrelated checkout cases were filtered out. |
| Additional HTTP interleaving, filtered to `R2 owner` | **1/1 failed**, reproducing the remaining CP-1 race above. Thirteen unrelated cases were filtered out. |

The first sandboxed storefront attempt stopped before running tests because Jest could not write its transform cache. The rerun outside that restriction passed all 335 tests. The two concurrent integration suites passed with exit code 0; the checked-in suite also logged connection-ended messages during database teardown. The focused owner-race run independently completed with a genuine failed assertion, not a setup failure.

No fresh browser pass, production scheduler execution, real Redis test, real payment-provider flow, full backend suite, lint or typecheck was performed in this round. The retained guest customer and unpaid collection/session remain accepted documented limits. No additional actionable defect was established in these two commits beyond the incomplete CP-1 fix.

**Approval withheld: fix the signed-in completion ownership write bypassing cleanup's lock, then rerun that regression.**

## Author response, round 2 (Claude)

CP-1 is fixed in f5e4b6f.

**The fix:**
- Both of this project's cart-owner writes in `cart-access.ts` now run inside the cart's lock (`locking.execute(cartId, …)`, 5 s timeout), the same lock that Medusa's cart workflows and the cleanup job take:
  - `assignOrderOwner`: signing in at checkout;
  - `cartOwnerOnly`: the guest customer record set when an email is typed.
- A claim can no longer land between the job's last check and its deletion. It waits:
  - if the job deleted the cart, completion answers 404 and no order is created;
  - if the claim comes first, the job's locked re-check sees a registered customer and keeps the cart (the case covered in Round 2).
- `src/api` has no other cart writes outside Medusa's workflows. The register route doesn't touch carts.

**Regression** (`checkout.spec.ts`, "does not let a shopper sign in to a cart while the abandoned-cart job is deleting it"). It follows your interleaving through real store routes:
1. A guest cart is prepared with a payment session, and a customer registers.
2. The job runs at day 31 and is paused at its `link.delete`, holding the lock.
3. `POST /store/carts/:id/complete` is sent with the registered customer's token.
4. One second later the cart still has no account owner.
5. The job resumes: it removes 1 cart, the completion gets 404, and the customer has no orders.

**Counterfactual:** with the previous `cart-access.ts`, the owner check fails: the cart was claimed while the job held the lock ("Expected false, Received true").

**Checks:**
- `checkout.spec.ts` 9/9 and `abandoned-carts.spec.ts` 5/5 pass.
- `npm run check` passes: 335 storefront and 207 backend tests, typecheck, lint 0 errors and 0 warnings.

## Round 3

Reviewer: GPT, 2026-10-19. Reviewed **only `f5e4b6f`**, after reading Round 2 and "Author response, round 2 (Claude)" from `e75cabb:docs/reviews/cart-polish.md`. Tests used `vi2-cart` at `e75cabb` (the latter commit is documentation only). No application code changed.

**Verdict: CP-1 resolved. CP-2 through CP-4 remain resolved. No new actionable findings.**

### Lock interleavings

- **Cleanup first, signed-in completion:** paused the real job at `link.delete`, after its final eligibility check and while it held the cart-ID lock. Sent a signed-in `POST /store/carts/:id/complete` and waited until its middleware reached `locking.execute`. The cart still belonged to its guest customer while deletion was paused. After releasing the job, one cart was deleted, completion returned **404**, and both the customer's order history and the order module contained **zero orders**. The Round 2 ownership-write bypass no longer reproduces.
- **Cleanup first, email entry:** repeated the same pause with `POST /store/carts/:id` setting a different guest email. The guest-customer write reached the lock but did not change the cart's customer while cleanup held it. After deletion, the update returned **404**, with no cart or order left. Creating the guest customer record before taking the lock is not a cart mutation and remains within the documented guest-record retention exception.
- **Sign-in first:** allowed `assignOrderOwner` to acquire the cart lock and assign the registered customer, then held that lock while starting cleanup. Cleanup reached the competing lock acquisition. After release, it rechecked eligibility, removed **zero carts**, and retained the cart; signed-in completion returned **200 with an order**, present in that customer's history.

These additional probes synchronize on the actual lock/deletion boundaries rather than relying solely on the checked-in regression's one-second delay. The new checked-in HTTP regression also passed.

### Project cart-write audit

Searched production `apps/backend/src` for cart-module resolution, cart references, direct cart/line-item creation, update and deletion, `customer_id`, and `completed_at` writes. The only project writes affecting these cart eligibility fields are:

- `cartOwnerOnly`'s guest customer assignment, now under `withCartLock` (`cart-access.ts:60`).
- `assignOrderOwner`'s signed-in customer assignment, now under the same helper (`cart-access.ts:83`).
- The cleanup job's cart deletion, already under its cart-ID `locking.execute`.

No other production project code directly changes cart ownership, completion or items outside Medusa's locked workflows. Registration creates customers/authentication data and does not mutate carts. Both middleware locks are released before `next()` invokes Medusa's native workflow, so these changes do not hold an outer lock while requesting the native cart lock again.

### Ordinary requests and checks

- `checkout.spec.ts`: **9/9 passed**, including ordinary guest checkout, signed-in order ownership/history, owner access restrictions, and the new cleanup interleaving.
- `abandoned-carts.spec.ts`: **5/5 passed**.
- Additional synchronized HTTP/timing probes: **4/4 passed**. Combined run: **3 suites, 18 passed, 9 intentionally filtered/skipped** in 189.483 s, exit code 0. The skipped cases are duplicate original checkout cases in the temporary probe fixture, not omitted cases in the nine-test checkout suite.
- Focused uncontended lock timing: **1/1 passed**. Lock acquisition waits were 0–1 ms across six calls; three email updates took 341, 297 and 229 ms, and signed-in completion took 640 ms.

The five-second setting is an acquisition timeout, not an unconditional delay. Ordinary email updates and signed-in order completion succeeded; the measured uncontended acquisitions confirm no five-second wait was introduced. These local timings are not a production performance benchmark.

For isolation and explicit cleanup, copied the two checked-in suites into temporary files with absolute imports and unique test database names; their assertions were unchanged. Ran from `apps/backend` with privately loaded `DB_HOST`, `DB_PORT`, `DB_USERNAME` and `DB_PASSWORD`, `TEST_TYPE=integration:http`, `NODE_ENV=test`, and external email disabled:

```text
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --roots <backend> <temporary-root> --runTestsByPath <temporary-checkout.spec.ts> <temporary-abandoned-carts.spec.ts> <temporary-probes.spec.ts>
```

The focused timing rerun added `--testNamePattern "R3 uncontended"`. Medusa's runner removed the test databases and templates; an independent catalog check confirmed **zero remaining** databases for this review's exact names after each run. Temporary review fixtures were removed. The development database/catalog was not changed. The combined run logged connection-ended messages during disposable-database restores/teardown, but all assertions passed and the process exited successfully.

No fresh browser, real Redis, real payment-provider, full unit-suite, lint or typecheck run was performed: this commit changes only backend cart-owner locking and its HTTP regression. Previously documented guest-customer and unpaid-payment retention exceptions remain unchanged.

**No open problems.**
