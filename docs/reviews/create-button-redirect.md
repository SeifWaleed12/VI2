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
- Live check: done by GPT in round 1 (Create, Back, trailing slash and query string, EDA widget).

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

## GPT review, round 1

Reviewed only `38f8d29` against `4286dca` on `claude/create-button-redirect`.

### Findings

No code findings identified in the scoped diff.

### Checks and limits

- `npm run check` passed: backend 50 suites / 426 tests, storefront 64 suites / 605 tests, type checks, and lint. The type-check and lint results were served from the shared Turbo cache; both reported success.
- I ran the requested HTTP specs (`new-product.spec.ts`, `admin-access.spec.ts`, `security-boundaries.spec.ts`) with the disposable-database runner after connecting it to the running PostgreSQL service. All three suites passed: 59/59 tests, exit code 0. The runner created isolated `medusa-…-integration-1` databases.
- I started the local backend and checked the live dashboard after sign-in. From the product list, Medusa's Create button opened `/app/products-new`; browser Back returned to `/app/products` with the create panel closed. Directly opening `/app/products/create/?source=review` also redirected to `/app/products-new`, confirming trailing slash and query-string handling. The product list showed Medusa's Create button and no separate “New product (Vi2)” button.
- The EDA widget remained visible on an existing product, and its read endpoint returned that product's existing registration JSON. I did not save or remove EDA data. Source search found no quick-variant imports, route, schema, tests, or manager-role permission entries left in `apps/backend`; `docs/API-REFERENCE.md` no longer lists the route. The deleted POST route itself was not called in the browser.
- I did not try to submit Medusa's native form during the redirect window, since that could create a product in the development database. No flash was visible during normal navigation; the `useEffect` redirect still means this UI is not a security boundary, and the direct admin product API remains available by design.
- A redirect-only admin widget is a reasonable small extension here: it changes dashboard navigation only and contains no business rule. The Medusa product form can briefly mount before the `useEffect` redirect; the documented Medusa API remains open by design, so this UI redirect is not an access-control boundary.

**Verdict:** no code findings from the scoped diff. The requested checks pass, including the live redirect and Back behavior. The deleted POST endpoint was verified by source absence rather than a live request; native-form submission during the redirect window was not attempted.

## Approval

GPT approved round 1 (2026-11-05) with no findings. Not checked by anyone: calling the deleted
`POST /admin/products/:id/quick-variant` live (verified by its absence from the source), and submitting
Medusa's form during the moment before the redirect. Ready for Seif to open a PR into `full-stack`.
