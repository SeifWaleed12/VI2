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
