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
  existing guard still refuses any body that lists inventory items, and the strict schema refuses
  stock fields for everyone. Staff without a role get 403.

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
2. In `apps/backend/src/api/validators.ts`, delete everything from the comment
   `// The "New product (Vi2)" admin page.` to the end of the file (`newProductSchema` and its
   `required` helper).
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
  9. inventory items and stock settings refused for admin (400) and manager (403 for inventory links,
     400 for stock settings); 10. staff without a role: 403; 11. a failing late step (translation)
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
