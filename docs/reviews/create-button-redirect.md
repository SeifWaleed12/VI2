# Create button opens our product page; quick variant removed

Requested by Seif, 2026-11-04. Branch `claude/create-button-redirect` from `full-stack` 4286dca
(after PR #34, the "New product (Vi2)" page, was merged).

## What Seif asked for

1. Medusa's own **Create** button on the product list should open our product page, and our separate
   "New product (Vi2)" button should go. One button, one create form.
2. Remove the **Quick Variant Creator** widget from the product details page. Keep the EDA widget.

Medusa 2.21 gives extensions no way to remove or change its own buttons. The options were a redirect
(chosen), hiding the button with CSS (fragile across upgrades) or patching `@medusajs/dashboard`
(redone on every upgrade).

## The change

- **Redirect** (`src/admin/widgets/create-product-redirect-widget.tsx`, renamed from
  `new-product-button-widget.tsx`):
  - Medusa's Create button links to `/products/create`. That route opens on top of the product list,
    so the list's `product.list.before` widget is still mounted.
  - The widget now renders nothing. When the path is `/products/create`, it navigates to
    `/products-new` with `replace`, so Back returns to the list, not to Medusa's form.
  - Typing `/products/create` directly lands on our page too.
- **Quick variant removed**, with everything only it used:
  - the widget `src/admin/widgets/quick-add-variant-widget.tsx`;
  - the route `POST /admin/products/:id/quick-variant` (`route.ts`, `errors.ts` and its unit test);
  - the workflow `src/workflows/quick-variant.ts` and its unit test;
  - the HTTP spec `integration-tests/http/quick-variant.spec.ts`;
  - `quickVariantSchema` and its two cases in `src/api/__tests__/validation.unit.spec.ts`;
  - its entries in `docs/API-REFERENCE.md`.

  Nothing else imported them. The EDA widget and its routes are unchanged.

## What this means for staff

- Adding a variant to an existing product is done with Medusa's own variant section on the product
  page.
- A new value for a shared option (for example a new flavor) is added in Products › Options first, or
  while creating a product on our page.

## Verification

- `npm run check` green: backend 426 unit tests (the quick variant tests are removed), storefront 605,
  typechecks, lint clean. Admin type-check (`src/admin/tsconfig.json`) clean.
- `grep` finds no remaining reference to the quick variant code outside history in `docs/`.
- Live check: not done yet; Seif will try it on this branch's backend.

## Limits

- The redirect depends on Medusa's create address being `/products/create` (2.21). If an upgrade
  renames it, Medusa's own form shows again; nothing breaks.
- Medusa's form may flash for a moment before the redirect, because the route has already started
  loading.
- This changes the admin screens only. Medusa's own `POST /admin/products` API is still open, so a
  CSV import or a direct API call can create products without our page's rules (required brand and
  category). Blocking that is a separate decision.

## Things to look at

- The redirect: `replace`, the exact path match, and anything else that could reach Medusa's create
  form (the "Create" entry on other screens, keyboard shortcuts, a link with a query string).
- That removing the quick variant code leaves no dead imports, routes or permissions behind,
  including the manager role table.
