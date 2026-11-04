# New product page (Vi2): author handoff

Requested by Seif on 2026-10-17. Author: Claude. Reviewer: GPT.
Branch `claude/new-product-page`, built from `origin/full-stack` fadec0f, folder `VI2 FInal/vi2-new-product`.
Commits: 1655922 (feature and tests), 0920441 (variant field labels, found in the live check), plus
this handoff.

## What it does

Medusa 2.21's own "Create product" form has no place for our fields (brand, EDA, Arabic name), and
patching `@medusajs/dashboard` is not allowed. This adds a separate admin page that creates a product
with everything in one form and one save.

- **Entry:** a "New product (Vi2)" button above the product list (widget zone `product.list.before`).
  It opens `/app/products-new`. Medusa's own Create button is untouched.
- **Form:** English name (required), Arabic name, description, categories (checkbox list, child
  categories shown as "Parent › Child"), status (Draft default), weight in grams, Discountable (on);
  brand (active brands only); EDA number and "Approved"; images (uploaded through Medusa's own
  `POST /admin/uploads`, first one is the thumbnail); options with comma-separated values; a variants
  grid built from every option combination with SKU (required), barcode and EGP price (required,
  more than 0). Rows can be removed before saving.
- **Filled in by the server, not the form:** the store's default sales channel, the default shipping
  profile, and per variant `manage_inventory: true`, `allow_backorder: false`, no stock and no
  inventory links (Medusa creates the usual empty inventory item, so stock starts at 0 until Odoo).
- **Save:** `POST /admin/vi2-products` validates with `newProductSchema` (strict, also inside each
  variant and option), then runs `createVi2ProductWorkflow`:
  1. `prepare-vi2-product`: refuses SKUs that already exist in the store and an unknown or inactive
     brand, before anything is created; finds the default sales channel and shipping profile.
  2. `createProductsWorkflow` (Medusa's own) as a step: product, options, variants, EGP prices,
     categories, images, thumbnail, weight, discountable, status, sales channel, shipping profile.
  3. Brand link (`createRemoteLinkStep`), when a brand is chosen.
  4. EDA registration: the existing `setProductEdaWorkflow` run as a step (no copy, no change to
     `product-eda.ts`).
  5. Arabic name: Medusa's `createTranslationsWorkflow`, reference `product`, locale `ar-EG`,
     field `title` (the same Translation Module and locale the category setup uses).
  If any step fails, the earlier ones are compensated: nothing remains (proven by an HTTP test that
  makes the translation step fail).
- **Errors:** form errors come back as `{ message, errors: { "variants.1.sku": "..." } }` and the page
  shows each next to its field (variant rows by position). Workflow refusals (taken SKU, inactive
  brand, a duplicate barcode caught by Medusa) come back as `400 { message }`; the page shows the
  message and marks the SKU fields it names. What the user typed is kept.
- **Who:** admins and managers. The new path's first segment `vi2-products` is a manager area mapped
  to the product resource, so `managerAction` treats `POST /admin/vi2-products` as product create. The
  strict schema refuses inventory items and stock fields for everyone (400). (Before `full-stack`'s
  manager-stock change, merged here on 2026-11-03, the guard also refused inventory items for managers
  with 403.) Staff without a role get 403.

## Files

New:
- `apps/backend/src/admin/widgets/new-product-button-widget.tsx`
- `apps/backend/src/admin/routes/products-new/page.tsx`
- `apps/backend/src/admin/lib/variant-combinations.ts` and `__tests__/variant-combinations.unit.spec.ts`
- `apps/backend/src/admin/lib/get-json.ts` and `__tests__/get-json.unit.spec.ts` (added for NP-1)
- `apps/backend/src/api/admin/vi2-products/route.ts`
- `apps/backend/src/workflows/create-vi2-product.ts`
- `apps/backend/src/api/__tests__/new-product.unit.spec.ts`
- `apps/backend/integration-tests/http/new-product.spec.ts`
- `docs/reviews/new-product-page.md` (this file)

Changed:
- `apps/backend/src/api/validators.ts`: `newProductSchema` added at the end (nothing else touched).
- `apps/backend/src/lib/manager-role.ts`: one entry, `"vi2-products": full("product")`. `product` was
  already a full manager resource, so the role's permissions do not change and
  `setup-catalog-manager.ts` needs no rerun.
- `docs/WORKBOARD.md`: task row.

Not changed: `product-eda.ts` (reused as a whole workflow, so no export was needed),
`manager-access.ts`, `middlewares.ts`, Medusa's create flow, the EDA and quick-variant widgets, the
storefront, `package.json`, the lockfile. No new dependencies.

Why the path is `/admin/vi2-products` and not `/admin/products/vi2`: Medusa's own
`POST /admin/products/:id` route and its body validator would also match `/admin/products/vi2`, and the
manager guard would read it as product update.

## How to remove

1. Delete every new file listed above: the `src/admin/routes/products-new`, `src/admin/lib` and
   `src/api/admin/vi2-products` folders, the widget, the workflow, both test files, and this review
   file.
2. In `apps/backend/src/api/validators.ts`, delete the block from the comment
   `// The "New product (Vi2)" admin page.` to the end of `newProductSchema` (its `required` helper
   and the schema); the catalog schemas after it stay.
3. In `apps/backend/src/lib/manager-role.ts`, delete the two lines
   `// The "New product (Vi2)" page's save route (POST is product create).` and
   `"vi2-products": full("product"),`.
4. Remove the "New product page" section from `docs/WORKBOARD.md`.

No migration, no data and no configuration to undo. Products already created with the page are
ordinary Medusa products and stay.

## Tests

- Unit (`npm run check`): the schema (required fields with their messages, a SKU twice in one form
  reported on the second row, price more than 0, unknown fields, inventory items, stock settings,
  stock quantity, own currency refused), the manager mapping of the new path, and the combination
  helper.
- HTTP (`integration-tests/http/new-product.spec.ts`, 12 tests, real PostgreSQL):
  1. admin creates brand + EDA + Arabic name + 2x2 variants + images + category: product, SKUs,
     barcodes, titles, EGP prices, brand link, EDA record, `ar-EG` translation, default sales channel,
     default shipping profile, `manage_inventory`/`allow_backorder`, and no stock levels all checked;
  2. a manager creates it too; 3. only required fields; 4. a SKU that already exists: 400
     "SKU WH-CH-1 already exists" and nothing created; 5. a SKU twice in the form; 6. field errors for
     a missing name and a zero price; 7-8. inactive and unknown brand: 400 and nothing created;
  9. inventory items and stock settings refused for admin and manager (400; managers got 403 for
     inventory links before the manager-stock merge); 10. staff without a role: 403; 11. a failing late step (translation)
     leaves nothing behind; 12. `GET /store/products` shows the product with brand and EDA.
- Counterfactual: with the brand check in `prepare-vi2-product` disabled, both brand tests fail
  (201 instead of 400). Without the check an unknown brand id is linked too. Code restored and rerun.

Results on 2026-10-17:
- `npm run check` from the worktree root: backend 218 unit tests, storefront 225, typecheck of
  backend, admin and storefront, lint 0 errors (19 existing storefront warnings).
- Full HTTP suite (`integration-tests/http`, Git Bash, test PostgreSQL): 8 suites, 89 tests, all pass
  (the 12 new ones included; the existing admin-access, EDA and quick-variant suites still pass with
  the new manager area).

## Live check (2026-10-17)

Backend started from this worktree on port 9000 (dev database `vi2_dev`), storefront from the
canonical checkout on port 3000. Two temporary staff users were created for the check (a Catalog
Manager and a Super Admin, `live-check-*@vi2.test`) and deleted afterwards, together with the two test
products (`ZZ Live Check ... (delete me)`) and the uploaded test image.

- Manager: the "New product (Vi2)" button shows on the product list and opens the page; brands and
  the 38 categories load; Create with empty variant cells shows "Enter a SKU" / "Enter a price" on
  each row and keeps everything typed; a row can be removed; an image uploads through
  `/admin/uploads`; Create succeeds and opens the product page, which shows 3 variants with their
  SKUs and "0 available", the Biotin category, weight 1000, the Default Sales Channel, the Default
  Shipping Profile and the EDA widget with "Approved".
- Admin: a SKU that already exists is refused; the message shows and that SKU field is marked
  "Already exists in the store", with the form kept. After changing it, Create succeeds.
- Storefront `/en/products/<handle>`: brand, category, SKU, EDA number and 1,200 EGP, "Out of stock"
  (stock 0 until Odoo). `/ar/...` shows the Arabic name from the translation.
- Found and fixed during the check: variant input ids were built from the option values (quotes,
  spaces), so their labels did not attach for screen readers; they now use the row position.

## Not verified

- The widget renders under the product table, not above it: Medusa 2.21 places zone widgets through
  its layout composer (staff can move it with "Customize layout"). The zone is the one requested.
- Storefront with a manager-created published product: the manager run used Draft; the published
  storefront check was done with the admin-created product.
- Images uploaded but then removed from the form, or a form abandoned after uploading, leave the
  files in storage (Medusa's normal create form behaves the same).
- The page itself is English only, like the rest of the admin.

## Review focus for GPT

- `create-vi2-product.ts`: compensation of the nested workflows (`createProductsWorkflow`,
  `setProductEdaWorkflow`, `createTranslationsWorkflow`) when a later step fails.
- The SKU check runs before creation, but two saves at the same moment can both pass it; Medusa's
  unique SKU index then refuses the second (400 with Medusa's own message).
- `manager-role.ts`: the new area and the inventory-link refusal for the new path.
- The page matches workflow SKU messages by text (`SKU <sku> already exists`) to mark the fields.

## Review

Reviewer: GPT. Date: 2026-10-17. Reviewed only `1655922`, `0920441`, and `ead0518` on `claude/new-product-page`.

### NP-1 — [P2] Report unsuccessful brand/category requests

Location: `apps/backend/src/admin/routes/products-new/page.tsx:16` (`getJson`, used at lines 54-57).

`getJson` parses JSON without checking `res.ok`. A normal HTTP 500 from `/admin/brands` resolves with `{ message: "Failed to list brands" }`, so `body.brands ?? []` installs an empty list and the intended error toast never runs. Category HTTP errors follow the same path. The user sees missing choices as an empty catalog and can save the product without the intended brand/categories. Reject unsuccessful HTTP responses so the existing error handling runs instead of silently treating the request as successful.

Confirmed with an executable probe using the exact reviewed `getJson` definition and a JSON HTTP 500 response: it resolves and produces `[]`, rather than reaching the rejection handler.

### NP-2 — [P2] Bound option expansion before rendering variants

Location: `apps/backend/src/admin/routes/products-new/page.tsx:67` and `apps/backend/src/admin/lib/variant-combinations.ts:7-8`.

Every option edit eagerly constructs the full Cartesian product, which the page then renders as variant input rows. There is no client-side bound, although the server only accepts 100 variants. Three options containing 50 values each produce 125,000 rows (confirmed against the exact reviewed helper), with three inputs per row; adding further options grows this exponentially. The browser can become unresponsive and lose the unsaved form before server validation is reached. Check the combination count before materializing/rendering it, and show a limit message consistent with the supported variant count. Filtering removed rows after expansion does not bound the allocation.

### Validation

- Focused unit tests in the existing `vi2-new-product` checkout at `ead0518`: `npm run test:unit -- --runTestsByPath src/api/__tests__/new-product.unit.spec.ts src/admin/lib/__tests__/variant-combinations.unit.spec.ts` — **2 suites, 18/18 passed**.
- HTTP integration tests using existing credentials privately and Medusa's isolated temporary database: `NODE_ENV=test TEST_TYPE=integration:http node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --runTestsByPath integration-tests/http/new-product.spec.ts` — **1 suite, 12/12 passed**, 112.525 s.
- The HTTP run covers admin/manager creation, SKU and brand refusals, strict stock-field rejection, no-role denial, late-step compensation, and store API exposure. No additional defect was found in those paths.
- No live browser check or full-workspace check was rerun. The two UI findings above are outside the current schema/helper and HTTP test coverage.

Open problems: NP-1 and NP-2. No application code changed during review.

## Author response (Claude, round 1)

Fixed in 2e9c4a1.

- **NP-1 — fixed.** `getJson` moved to `apps/backend/src/admin/lib/get-json.ts` and rejects any
  non-OK answer, so a failed brand or category load reaches the existing error toast instead of
  showing an empty list. Test: `src/admin/lib/__tests__/get-json.unit.spec.ts` (an HTTP 500 with a
  JSON body rejects). Counterfactual: with the old one-line `getJson` restored, that test fails;
  restored.
- **NP-2 — fixed.** `combinationCount` (in `variant-combinations.ts`) counts the combinations without
  building them. When the count is above `MAX_VARIANTS` (100, the server's limit in
  `newProductSchema`), the page builds no rows and shows "These options make N variants; the most is
  100. Remove some values." Test: three options of 50 values count 125,000 without being built.

Checks after the fix: `npm run check` green (backend 222 unit tests, storefront 225, typecheck,
lint 0 errors / 19 existing storefront warnings). Not rechecked in a running browser: the limit
message and the load-failure toast are covered by the unit tests above only. HTTP behaviour is
unchanged (only admin page code changed), so the HTTP suite was not rerun.

Requesting GPT round 2 on 2e9c4a1 only.

## Round 2

Reviewer: GPT. Date: 2026-10-17. Scope: `2e9c4a1` only. Read the author response above.

- **NP-1 resolved.** The page imports the new `getJson`, which checks `res.ok` before parsing a successful response and rejects non-OK responses. Both existing lookup catch handlers therefore show their failure toast for JSON HTTP errors instead of treating them as an empty successful catalog. The regression directly checks HTTP 500 rejection, with a successful-response control.
- **NP-2 resolved.** The page computes `combinationCount` first. Above 100 it selects an empty row list without invoking `optionCombinations`, and renders the explanatory limit message. At or below 100 it retains normal generation and removed-row filtering. The 125,000-combination case is now counted in linear time over the options instead of materializing those combinations. The client limit matches the current server schema's 100 variants.

Validation: ran `npm run test:unit -- --runTestsByPath src/admin/lib/__tests__/get-json.unit.spec.ts src/admin/lib/__tests__/variant-combinations.unit.spec.ts` in the existing new-product checkout: **2 suites, 7/7 tests passed**. Reviewed page wiring and the conditional generation path directly. The count test does not itself render the page or verify the displayed warning. No additional actionable problem was introduced by this fix.

No live browser, HTTP suite, or full-workspace check was rerun for this admin UI-only diff. The prior round's 12/12 HTTP result remains the latest reviewer-run HTTP evidence.

No open problems.

## Redesign: Medusa's look, shared options (requested by Seif, 2026-11-03)

Seif found the page worse than Medusa's own Create form (categories, variants, layout). He did not
want the Arabic name, and he wanted shared product options with new values added on the spot. He
chose to rebuild this page in Medusa's design rather than patch `@medusajs/dashboard`. A patch would
need redoing on Medusa upgrades, and 2.22.2, the newest, still cannot add values to a shared option.

What changed (this section replaces the form, Arabic-name and options parts above):
- **Page** (`products-new/page.tsx`): Medusa's full-screen create window, built from `@medusajs/ui`
  (`FocusModal`, `ProgressTabs`, `Prompt` through `usePrompt`). Class names are copied from
  `@medusajs/dashboard` 2.21's `product-create`. It has three tabs and a footer:
  - **Details:** title, subtitle, handle, description, and media (a dashed upload box and a list with
    "Make thumbnail" / "Delete"). Under Variants: shared options as chips, then each option's values as
    chips, then the combinations with a tick per row (unticked = not sold) and a select-all box.
  - **Organize:** the Discountable card, brand, categories (chips, "Parent › Child"), weight, EDA
    number and the "Approved by EDA" card.
  - **Variants:** a spreadsheet-style table (option values, SKU, barcode, price EGP). Bad cells turn
    red with the message under them.
  - **Footer:** Cancel, Save as draft, and Continue / Publish. The status comes from the button, as in
    Medusa.
  - **Behavior:** Continue checks Details first and focuses the first problem. Editing a field clears
    its error. Closing with Esc, X or Cancel asks "Are you sure you want to leave this form?" when
    anything was entered (Medusa's wording).
- **Picker** (`products-new/chip-combobox.tsx`, new): a search box with chips. Keyboard: arrows,
  Enter, Backspace, and Esc (which closes only the list). It can show an `Add "<typed>"` row. Medusa
  does not export its Combobox or category picker to admin extensions, so these are look-alikes, not
  Medusa's code.
- **Shared options only.** The page lists `GET /admin/product-options?is_exclusive=false` (Products ›
  Options). A product links those options; it no longer gets its own copy. A typed value that the
  option lacks shows as a chip marked "new". It is added to the shared option when the product is
  saved, so every later product can pick it. A typed value equal to an existing one (ignoring case)
  selects the existing one.
- **Schema** (`newProductSchema`):
  - `title_ar` removed.
  - `subtitle` and `handle` added (handle: lowercase letters, numbers, dashes).
  - `options` is now `[{ id, value_ids, new_values? }]`, with at least one value per option and each
    option once.
  - Variants still name their values by option title.
- **Workflow** (`create-vi2-product.ts`): the translation step is gone. New step
  `add-shared-option-values` runs after `prepare-vi2-product` and before `createProductsWorkflow`:
  - It refuses, before writing anything, an option that is not shared ("Choose a shared option from
    Products > Options") or a value id from another option ("Choose Flavor values from its list").
  - It creates the new values with one `createProductOptionValues` call. Compensation deletes exactly
    the values it created.
  - The product gets `options: [{ id, value_ids }]` (Medusa 2.21's own input for linking a shared
    option).
  - Variant values are spelled as the option stores them ("mango" saves as "Mango").
- Stock comment updated: Medusa owns stock now (Odoo postponed); stock still starts at 0.

Why not use Medusa's `POST /admin/product-options/:id` to add a value: it replaces the whole value
list (`upsertWithReplace`). A list loaded earlier could then delete a value someone else just added.
The workflow adds single values instead, and only at save time, so an abandoned form adds nothing.

Files:
- New: `apps/backend/src/admin/routes/products-new/chip-combobox.tsx`. It is removed with the
  `products-new` folder in "How to remove"; nothing else to undo.
- Changed: `page.tsx`, `validators.ts`, `create-vi2-product.ts`, `vi2-products/route.ts` (comment
  only), both test files.

Tests:
- **Unit:** new cases for an option with no values, an option added twice, and a handle with spaces.
- **HTTP** (`new-product.spec.ts`, now 14 tests, all passing on 2026-11-03). The suite creates two
  shared options (Flavor, Size). New or changed:
  - The admin's product links the shared options (no option of its own).
  - A manager adds a new flavor ("Mango"), and the shared Flavor list becomes Chocolate, Mango,
    Vanilla.
  - `new_values: ["Mango", "vanilla"]` adds only Mango and reuses Vanilla; variant titles use the
    stored spelling.
  - Another product's own option and a value from a different option are refused, with nothing
    written.
  - A failing late step (the EDA store mocked to fail) leaves no product and no new flavor.
- **Counterfactual:** with the step's compensation emptied, the late-failure test fails ("Mango" is
  left in the shared list). Restored and rerun.
- **`npm run check`:** backend 225 unit tests, storefront 225, typecheck, lint 0 errors (19 existing
  storefront warnings).
- Not rerun: the other HTTP suites (only this page's route, schema and workflow changed).

Live check (2026-11-03): the backend ran from this worktree on port 9010 (another backend was using
9000), against the dev database. A temporary Super Admin and Catalog Manager (`live-check-*@vi2.test`)
were used and deleted afterwards.
- **Manager:**
  - Continue on an empty form shows "Enter a title" and "Add at least one option" and focuses the
    title.
  - Picked the shared "Flavors" option and Chocolate, and typed a new "ZZ Live Check Flavor": the chip
    is marked "new" and its row appears.
  - Organize: NOW Foods, Biotin, 1000 g, an EDA number, Approved.
  - Variants: Save as draft with empty cells marks the SKU and price cells red. Filled in, saved as
    draft, and the product page opened.
  - API check: the product's only option is the shared one (`is_exclusive: false`); the shared list
    gained the new flavor; EGP prices, barcode, weight and EDA were saved.
  - Closing with X asks before leaving; Cancel keeps the form.
- **Admin:**
  - The new flavor is now offered as an existing value. Typing it in lower case offers no "Add" and
    selects the existing one (no duplicate).
  - A SKU that already exists is refused: the toast names it and the cell says "Already exists in the
    store". After changing it, Publish works.
- **Found and fixed during the check:**
  - The hidden window title showed on screen (now `asChild`, like Medusa).
  - Errors stayed after a field was fixed.
  - Continue did not bring the error into view.
  - The first Down arrow skipped the top row.
  - Esc lost the form without asking.
- **Cleanup:** both test products deleted. Medusa's API refused to delete the test flavor
  ("associated with products"): Medusa soft-deletes products and keeps their option-value links. A
  one-off script removed it after unlinking the deleted test products. The Flavors list is back to
  Chocolate, hj, Peanut Butter, Vanilla.

Not verified / limits:
- Seif cannot delete a shared value through Medusa while a deleted product still references it.
  That is Medusa's behavior (above), not this page's.
- The page cannot create a new shared option, only values; options are created in Products ›
  Options. A product without options (Medusa's "Default variant") is not offered.
- Media is not drag-sortable (Medusa's is). "Make thumbnail" moves an image to the front instead.
- In this check, the browser tool's Esc key action did not reach the window. A real key event did,
  and showed the prompt.

Review focus for GPT:
- `add-shared-option-values`: validation before any write, the case-insensitive reuse, and
  compensation.
- Two saves adding the same new value at the same moment: the second hits Medusa's unique index
  (`option_id`, `value`) and fails with Medusa's message. Nothing is half-saved.
- `page.tsx`: error mapping to tabs and rows, and the close prompt.

## Round 3 review

Reviewer: GPT. Date: 2026-11-03. Copied from GPT's folder `vi2-gpt-review` (branch `gpt/work`), where it wrote the review.
Reviewed only `6fc5c04` on `claude/new-product-page`.

**Verdict: No actionable findings.** The shared-option workflow validates all requested option/value IDs before writing, reuses existing values case-insensitively, and records only newly created value IDs for compensation. The product workflow runs creation after that step, so a later EDA/product failure compensates the newly added shared values. The route remains strict and rejects cross-product options or values from another option. The page's selection and variant table align with the shared option IDs and backend limit described in the handoff.

The handoff reports the focused HTTP and unit checks plus live admin checks; I did not rerun them. Residual limits: the live browser could not verify Esc through its automation tool, and Medusa retains option-value links from soft-deleted products, so cleanup may require manual unlinking. No open code problems identified.

## Round 3b request: full review (Seif, 2026-11-03)

Seif asked for a full tester-style review of the redesign. Round 3 above only read the code and trusted the
author's test results, which is not what Seif means by a review. Scope: `6fc5c04` on
`claude/new-product-page` (from `full-stack` fadec0f), with the earlier, approved code as context.

Review instructions for GPT:
1. Use the `/ponytail:ponytail-review` skill for the review.
2. Run the checks yourself in this branch's folder (`D:\e commerce\VI2 FInal\vi2-new-product`) or a
   checkout of the same commit: `npm run check`, then the HTTP spec
   `integration-tests/http/new-product.spec.ts` (from `apps/backend`: `npm run test:integration:http --
   --runTestsByPath integration-tests/http/new-product.spec.ts`, with the test database login set the
   way you ran it in round 1). Report the results.
3. Test edge cases, not only the happy path. Write probes or extra test cases where useful (do not commit
   them), for example:
   - input: empty and whitespace values, very long text, 0 / negative / huge prices, a handle with
     uppercase or spaces, 10 options, 100 vs 101 variants, a variant naming an option or value the product
     does not have, `new_values` that duplicate an existing value or each other in different case;
   - security and roles: admin, Catalog Manager, staff without a role, an exclusive option of another
     product, a value id from another option, unknown fields, inventory or stock fields;
   - failures: a failure at each workflow step (values added, product created, brand link, EDA) leaves
     nothing behind; two saves adding the same new value at the same time;
   - the page: errors land on the right tab, row and cell; the close prompt; keyboard use of the chip
     picker; what is lost or kept after a failed save.
4. Judge code quality: clean code, readability, duplication, dead code, naming, comments.
5. Check the architecture against `AGENTS.md` (root section 4.1/4.2) and `apps/backend/AGENTS.md`:
   routes only parse/run/map; business rules in workflows and steps, not in the route or admin page;
   one step does one thing; Clean Architecture, SOLID, loose coupling, high cohesion.
6. For every problem: severity (P1/P2/P3), file:line, a concrete failing scenario (input, then wrong
   result), and the fix you suggest. Say what you checked and found fine, and what you could not check.

Write the findings below as "## GPT review, round 3b".

## GPT review, round 3b

Reviewed only `6fc5c04` on `claude/new-product-page`, from `full-stack` `fadec0f`.

### Finding

- **[P2] Announce the active chip-combobox option to screen readers.** `apps/backend/src/admin/routes/products-new/chip-combobox.tsx:82-86,102-123`: when a keyboard user arrows through the popup, `active` changes the row's visual highlight, but the `role="combobox"` input has no `aria-controls` or `aria-activedescendant`, and the highlighted row has no stable ID. A screen-reader user therefore is not told which option will be selected by Enter. The options are buttons with `role="option"`, mixing button and listbox semantics. Implement a complete combobox/listbox pattern with the active option exposed and proper option semantics.

### Checks and review

- `npm run check` from `vi2-new-product`: **passed**. Backend 225/225 tests and storefront 225/225 tests passed; both app typechecks passed; lint reported 0 errors and 19 warnings.
- HTTP `new-product.spec.ts`: **not verified**. I attempted it against a uniquely named disposable database, but the integration runner failed before exercising requests with `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` (14 setup failures). The configured `.env` DATABASE_URL points to `vi2_dev`, so I did not use the development database. The disposable database was removed.
- Static inspection: the workflow validates option IDs and value ownership before creating values, reuses existing values case-insensitively, and its compensation targets only values returned as newly created. It creates the product after that step, and the existing integration test covers a later EDA failure. The page maps server errors to the relevant tab/row and retains entered form state on failure; its close prompt and selector keyboard handling are implemented. Existing variant/schema bounds are 100 variants and up to 10 options.
- Not exercised by me: the requested live admin interaction, DB-backed role/failure/concurrency edge cases, or a screen-reader/browser accessibility run. The handoff reports these tests and checks; those reports are not my own verification. The main remaining verification blocker is a working integration-test database configuration.

**Verdict: P2 remains open; integration behavior is not independently verified.**

### Round 3b test follow-up

The earlier HTTP attempt failed before exercising the route because I did not pass the runner's required `DB_USERNAME` / `DB_PASSWORD` variables. Using Seif's `run-int.js` from `apps/backend`, which reads those values from `.env` and lets Medusa create/drop its disposable `medusa-*-integration-*` database, the requested command completed: **1 suite passed, 14/14 tests passed** (119.59 s). This supersedes the earlier statement that HTTP integration behavior was unverified due to database configuration. No credentials were printed, and the runner cleaned up its temporary database.

Combined verification: `npm run check` passed (225 backend tests, 225 storefront tests, typechecks passed, lint 0 errors / 19 warnings), and the focused HTTP suite passed 14/14. The P2 chip-combobox accessibility finding above remains open; tests do not cover screen-reader announcement of the active option.

### Additional Round 3b schema probes

I created and removed a temporary Jest probe for the requested boundary cases. Results: whitespace title, description over 5,000 chars, zero/negative prices, uppercase/spaced handles and 11 options were rejected; 10 options and exactly 100 variants were accepted; 101 variants were rejected. Two malformed inputs were accepted by `newProductSchema`:

- **[P2] Reject variants that name options outside the product.** `apps/backend/src/api/validators.ts:75-90`: with a product option `Flavor` and variant `{ Flavor: "Chocolate", Color: "Red" }`, schema validation accepts the body. `productData()` later iterates only selected product options and silently drops `Color`, so the API succeeds while creating a different variant than requested. Validate that every variant option key exactly matches the chosen option titles and reject extra/missing keys before any write.
- **[P2] Bound the accepted price to a storable/supported amount.** `apps/backend/src/api/validators.ts:85-89`: `Number.MAX_VALUE` passes because the only checks are finite and positive. This is an absurd but valid JSON number; it can become an unusable catalog price or fail later in Medusa/database handling instead of producing a field validation error. Set and test an upper bound aligned with Medusa's supported price storage and the product's allowed range.

The probe also showed `unknown_value` is accepted by the schema, but the product workflow's value ownership/creation behavior for that relation was not independently exercised in HTTP. Case-variant duplicate new values are accepted by the schema and deduplicated case-insensitively by the workflow before creation. These probe tests were temporary and removed after execution.

**Round 3b status: not fully clear.** Full and focused suites pass, but the two validation findings above remain open. I did not complete the requested manual admin-page/browser and screen-reader checks, nor isolate fault injection at every workflow step or simultaneous duplicate-value saves.

### Final Round 3b tester follow-up (2026-11-03)

I completed the independent checks and the findings remain open:

- **[P2] Validate each variant's option keys against the selected product options.** `apps/backend/src/api/validators.ts:80`: a disposable-database HTTP request with selected `Flavor: Chocolate` and variant options `{ Flavor: "Chocolate", Color: "Red" }` returned **201**. The created variant contained only `Chocolate`; `productData()` silently drops `Color`. Reject extra keys (and missing selected keys) in `newProductSchema` before starting the workflow.
- **[P2] Reject an unbounded price.** `apps/backend/src/api/validators.ts:83`: a disposable-database HTTP request with `price: Number.MAX_VALUE` returned **201**, and the stored EGP price read back as `1.7976931348623157e+308`. Define a supported maximum for this form and validate it before persistence; this amount cannot represent a usable retail price and can surface as absurd/unusable pricing downstream. The bound should follow the product's intended price range rather than silently relying on database or UI formatting.
- **[P2] Expose the active picker row to assistive technology.** `apps/backend/src/admin/routes/products-new/chip-combobox.tsx:84-85,102-123`: the keyboard-selected row changes visually, but the input does not reference the list with `aria-controls` or identify the highlighted row with `aria-activedescendant`; the rows are buttons with `role="option"`. Complete the combobox/listbox semantics so screen readers announce the option Enter will choose.

Other independent results:

- `npm run check` passed: backend 225/225 tests, storefront 225/225, typechecks passed, lint 0 errors and 19 warnings. The full focused `new-product.spec.ts` HTTP suite passed **14/14** using the supplied runner and its disposable database. Temporary probes were run with the same runner; all edited test files were restored, and the database was dropped by the runner.
- A variant using existing `Vanilla` while only `Chocolate` was selected was rejected with HTTP 400. Two concurrent saves adding the same new shared value returned 201 and 400, and the shared option contained one new value. The product creation and link failure injections were not independently proven: the temporary product-service spy did not observe the call, so its 500 response was not attributed to that injected failure. The normal HTTP test does prove compensation after EDA creation fails, including removal of the newly added value.
- The request route is thin (strict parse, workflow invocation, response/error mapping), and the business validation and writes are in workflow steps. The UI's error path mapping, close confirmation, and keyboard handlers are present on inspection, but I did not complete a live browser interaction or screen-reader run. The active-option announcement issue is therefore a code-level accessibility finding, not a claimed browser observation.

**Verdict: not approved yet.** Fix the three P2 findings above. I could not independently verify a failure after product creation or brand-link creation, or manually exercise the admin page; those remain unverified rather than assumed to pass.

### Round 3b completion: corrected probes and live admin checks (2026-11-03)

This section supersedes the earlier Round 3b statements that the admin page and product/link failure paths were unverified, and corrects the first concurrency probe, which reused the default product handle and therefore did not isolate the shared-value race.

Additional HTTP checks used unique handles and the integration runner's throwaway databases:

- With both product options selected, omitting `Size` from a variant returned **400** (`Option value  does not exist for option Size`); no product was created. With `new_values: ["CaseDup...", "casedup..."]`, the request returned **201**, created one shared value, and the variant used that canonical value.
- Concurrent admin and manager saves with unique product handles/SKUs and the same new value both returned **201**. They created two products and variants that reference the same single option-value ID; no duplicate value was left behind. This differs from the handoff's predicted second-request failure but is correct behavior.
- Fault injection at `createProductOptionValues`, `createProducts`, and the brand link each produced the expected **500**. After each, database queries found no new product/variant, brand association, EDA record, or shared value. The existing focused HTTP regression also verifies rollback after EDA creation fails.

I also ran the admin page in a live browser against a separately created database named `medusa-integration-ui-review-20261103` (not `vi2_dev`). The test admin signed in; the page loaded its brands/options/categories; I saved one draft and then exercised failed saves:

- Empty Continue showed title and option errors and focused Title.
- Keyboard selection added a shared option and value. Missing SKU/price errors appeared in the corresponding variant cells; a duplicate SKU in row two was attached to row two.
- A later save using an existing SKU showed the backend error on that SKU cell, while preserving the entered SKU, price, options and title.
- Clicking X opened the unsaved-changes confirmation; Cancel kept the form and its values. I did not independently verify Escape with a real native key event; the browser automation did not produce a state change for Escape.
- A valid draft saved and opened the product page with the expected two variants. The disposable database was dropped, the backend was stopped, and the temporary setup script and test edits were removed.

**Final verdict: not approved yet.** The three P2 findings remain: extra variant option keys are silently accepted and dropped (`validators.ts:80`), `Number.MAX_VALUE` persists as a price (`validators.ts:83`), and the chip picker does not announce its active option to screen readers (`chip-combobox.tsx:84-85,102-123`). Other tested paths behaved correctly. The UI accessibility finding remains based on the missing ARIA relationships in code; I did not run a screen-reader session.

## Author response, round 3b (`96f6cbc`)

Seif approved fixing all three findings, with a price cap of 1,000,000 EGP. I checked each finding in
the code first; all three were real.

- **Extra or missing variant options (P2).** The schema only knows option ids, so the check lives in the
  `add-shared-option-values` step, which already loads the options' titles and refuses bad options
  before writing. Every variant must now name exactly the product's options. Otherwise the step refuses
  with "Give each variant one value for each option: Flavor, Size" (400), before any new value is
  added. This covers both GPT's extra `Color` (which used to return 201 and drop `Color`) and a missing
  `Size` (which used to return Medusa's blank "Option value  does not exist" message).
  `create-vi2-product.ts`.
- **Unbounded price (P2).** `newProductSchema` now caps a variant price at 1,000,000 EGP, with the message
  "Price must be 1,000,000 EGP or less" on the price cell. `validators.ts`. The older quick-variant
  route (`quickVariantSchema`) has the same gap; I left it alone because it is outside this change.
- **Picker semantics for screen readers (P2).** `chip-combobox.tsx`: the input now has
  `aria-autocomplete="list"`, `aria-controls` pointing at the list while it is open, and
  `aria-activedescendant` naming the highlighted row. Rows are plain `role="option"` elements with
  stable ids (no more buttons inside a listbox), and the `Add "<typed>"` row is an option too. Keyboard
  focus stays in the input, as before.

Correction to my handoff: I predicted that two saves adding the same new value at the same moment would
make the second fail on Medusa's unique index. GPT's run shows both succeeded and share one value: the
second save's step most likely read the options after the first had added the value, so it reused it. Two requests
racing inside the same few milliseconds could still hit the unique index; the loser then fails with
nothing half-saved.

Tests:
- Unit: new case for a price over the cap (19 tests).
- HTTP: new test "refuses a variant with an extra or a missing option, before adding new values"
  (15 tests).
- Shown failing first on the old code: the unit case found no issue for 1,000,000.01, and the HTTP test
  got 201 instead of 400 for the extra option (run against the committed workflow file, then restored).
- After the fix: HTTP `new-product.spec.ts` 15/15; `npm run check` green (backend 226 tests, storefront
  225, typechecks, lint 0 errors / 19 existing storefront warnings).

Live check (2026-11-03, this branch's backend on port 9010, dev database, a temporary Super Admin that
was deleted afterwards): on the page, the options picker input keeps focus, `aria-controls` names the
open listbox, and `aria-activedescendant` names the highlighted row (`role="option"`, no buttons in the
list). Enter picked the highlighted option. A mouse click ticked Chocolate. Typing a new flavor made the
`Add "..."` row the active option, and Enter added it as a chip marked "new". Nothing was saved, so the
shared Flavors list is unchanged. Not checked: a real screen reader (NVDA or VoiceOver).

Review only `96f6cbc` on `claude/new-product-page`.

## GPT review, round 4

Reviewed only fix commit `96f6cbc` on `claude/new-product-page`; read the handoff and Claude's round 3b response in `ee43a43`.

### Findings

No actionable problems found in this fix.

- **Variant option validation:** The workflow rejects both extra and missing keys before it calls `createProductOptionValues`. My disposable-database HTTP probes got **400** for the invalid shapes and confirmed a requested new shared value was not added. Reordered keys were accepted (**201**) and Medusa created the expected `1 kg / Chocolate` variant. An empty `{}` option map was rejected (**400**) with both expected option titles. The duplicate-option-title probe was refused by Medusa (`Product option with title: Flavor, already exists.`), so duplicate titles do not bypass the current key check through the normal admin path. `newProductSchema` also limits options to 10 and variants to 100. The modified step has one caller, inside `createVi2ProductWorkflow`; the workflow is called by the new-product route. I do not consider the added key check a violation of “one step does one thing”: the step already resolves/validates the selected shared options and values before creating missing values, and this check is a precondition on that same option/value operation. Keeping it before the write is important for avoiding shared-value side effects on a rejected product.
- **Price boundary:** `1,000,000` returned **201**; `1,000,000.01` and `Number.MAX_VALUE` returned **400**, each with `variants.0.price: "Price must be 1,000,000 EGP or less"`. The page maps a `variants.<index>.price` error to the matching variant row and price field. I verified that mapping in code; I did not re-enter the boundary in the full admin page during this round.
- **Picker accessibility and interaction:** In a temporary browser harness using the actual `ChipCombobox`, opening the picker exposed `aria-controls="picker-list"`; the active descendant pointed to a rendered `role="option"`. ArrowDown moved the active descendant from Alpha to Beta, Enter selected Beta, Backspace removed it, typing `Mango` exposed the `Add "Mango"` option and Enter added it, and clicking Alpha selected it. The harness was removed after the check. This verifies the updated semantics and the listed interaction paths, but is not a screen-reader session.
- **Scope and architecture:** The exact-key check runs before shared-value creation, rather than in the route or page. The route remains a parse/workflow/map boundary. No other caller of the changed step was found. The 15-test HTTP suite includes the extra/missing-key regression and passes.

### Checks

- `npm run check` from the checkout root: **passed** — backend 226/226 tests, storefront 225/225, typechecks passed, lint 0 errors / 19 existing storefront warnings.
- `new-product.spec.ts` using the supplied `run-int.js` disposable-database runner: **15/15 passed**. The expected EDA failure test emitted its injected `EDA store down` log while passing.
- Additional disposable-database HTTP probes covered the price boundaries, reversed keys, empty variant options, and duplicate option titles. No test edits remained. The pre-existing untracked `apps/backend/static/1792275544776-download.webp` was left untouched.

**Verdict: the three round 3b findings are resolved; no new problem found.** I did not run a real screen reader or manually exercise the full admin page for the price-boundary cell presentation.

## Approval

GPT approved round 4 (2026-11-03): the round 3b findings are resolved and no new problems were found.
Open checks, as stated by both sides: no real screen-reader session, and the older quick-variant route
still has no price cap (outside this change). Ready for Seif to open a PR into `full-stack`.

## Merge with `full-stack` (2026-11-03, before the PR)

`full-stack` had moved to 1c09174 (PRs #30-#32). Two conflicts, both only additions on each side:
`validators.ts` (kept `newProductSchema` and the new catalog schemas; my stale "stock comes from Odoo"
comment now says stock is set in Medusa) and `docs/WORKBOARD.md` (kept both sections). "How to remove"
step 2 now says where `newProductSchema` ends, since the catalog schemas follow it.

The manager-stock change (3b3a2c0) lets managers edit stock, so the manager guard no longer refuses a
body with inventory items. This page still refuses them for everyone through its strict schema (400).
Two tests expected the old 403 for managers: the HTTP case now expects 400, and the unit case for the
guard was removed because that rule no longer exists.

Checks after the merge: `npm run check` green on the merged code (backend 440 tests, storefront 587, typechecks, lint with no errors or warnings); HTTP `new-product.spec.ts` 15/15.

## Seif's changes after the PR (2026-11-04)

Seif tried the page and asked for three changes, and to mimic Medusa's form in everything:

1. **Products without variants, as in Medusa.** Under Variants there is now Medusa's switch "Yes, this
   is a product with variants" ("When unchecked, we will create a default variant for you"). It starts
   off.
   - **Off:** the option pickers are hidden, and the Variants tab has one "Default variant" row (SKU,
     barcode, price).
   - **On save:** the workflow creates what Medusa 2.21's own form sends: the product's own option
     "Default option" with the value "Default option value", and one variant "Default variant". No
     shared option is touched.
   - **Server rules:** `options: []` is now allowed, with exactly one variant whose `options` is `{}`.
     More than one variant without options is refused ("A product without variants has one
     variant"). The variant-key check from round 3b still applies, since with no options a variant
     must name none.
2. **Brand and categories are required.**
   - **Schema:** `brand_id` is required ("Choose a brand"), and `category_ids` needs at least one
     ("Choose at least one category").
   - **Page:** "(Optional)" and "No brand" are gone. Continue on Organize, or a save, shows both
     errors there and focuses Brand.
   - **Workflow:** the brand link is no longer conditional.
3. **Medusa's category picker** (`products-new/category-combobox.tsx`, new; Medusa does not export
   its `CategoryCombobox` to admin extensions).
   - **Closed:** a count chip ("2 ×", which clears all) and "Selected".
   - **Open:** the main categories only. A category with children has an arrow that opens them, with
     a back row naming the parent. Clicking a row ticks or unticks it, marked with a dot. Typing
     searches every level (no arrows or back row while searching).
   - **Keyboard:** Up and Down move, Right opens a category, Enter ticks (or goes back on the back
     row), Esc closes only the list.
   - **Screen readers:** the input names the list and the highlighted row (`aria-controls`,
     `aria-activedescendant`). The arrow is mouse-only and hidden from screen readers; keyboard users
     use Right.
   - **Data:** categories are loaded once (with `rank`) and browsed in the page, so no request is made
     per level. Rows are ordered by rank, then name.
   - The page's tab check now runs per tab (`tabErrors`, `checkTabsBefore`). Continue checks every
     tab before the next one, and Save checks Details and Organize.

Tests:
- **Unit:** new cases for brand required, categories required, one variant without options, and a
  product without variants accepted (21 tests). `valid` now has a brand and a category.
- **HTTP:** "creates a product without variants the way Medusa does: a default option and variant"
  (replaces "only the required fields", which created a product without a brand) and "refuses a
  product without a brand or a category" (16 tests).
- **Shown failing first:** 4 unit cases, and both HTTP tests on the old code (a product without
  variants got 400; one without a brand or category got 201).
- After the change: HTTP `new-product.spec.ts` 16/16; `npm run check` green (backend 443 tests, storefront 587, typechecks, lint clean); admin type-check
  (`src/admin/tsconfig.json`) clean.

Live check (2026-11-04, this branch on port 9000, dev database, a temporary Super Admin):
- **Switch:** off by default, with the option pickers hidden.
- **Organize:** Continue with nothing chosen showed "Choose a brand" and "Choose at least one category"
  and focused Brand.
- **Category picker:** showed the six main categories with arrows. The arrow on Sports Nutrition
  opened its sub-categories with a back row. Ticking two showed "2 × Selected" and cleared the error.
  The keyboard path (Down, Right, Down, Enter) ticked a sub-category. Searching "protein" listed
  matches from the sub-level.
- **Saved product** (draft): the Variants tab showed one "Default variant" row. The saved product has
  the brand, both categories, the option "Default option" (product's own, `is_exclusive: true`) and
  the variant "Default variant" with 450 EGP, like a product made in Medusa's form.
- **Switch on:** the option pickers came back, and Continue without an option still said "Add at least
  one option".
- **Found and fixed during the check:** the back row's "↩" showed as a blue emoji on Windows. It is
  now a plain line icon.
- **Cleanup:** the test product and the temporary admin are deleted.

Not checked: a real screen reader.

Review only `6de2d61` on `claude/new-product-page`.
