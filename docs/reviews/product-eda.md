# Product EDA review

Reviewed 2026-10-09. Scope: commit `6116354` only. Commit `f609d87` and all other changes are excluded.

## Findings

No findings.

## WORKBOARD checklist

- **Requirement and scope:** The backend records only the EDA registration number and approval state. Approval does not gate product publication or sale. Storefront rendering is tracked separately in WORKBOARD; this commit exposes the required fields to the store API.
- **Medusa primitives and layers:** The implementation uses a custom module for the new domain record, a module link to Product, workflows for save/remove, and a thin file-based admin route. The module link is one-to-one by default; Medusa rejects a second link for the same product ([module-link cardinality](https://docs.medusajs.com/learn/fundamentals/module-links), [link integrity constraints](https://docs.medusajs.com/learn/fundamentals/module-links/link)).
- **Workflow correctness:** A new EDA record is compensated by deletion if a later link step fails; updates restore the previous values. Thus parallel first saves can both create temporary records, but the one-to-one link permits only one association and the losing workflow compensates its record. Removal dismisses the link before soft-deleting the record, with workflow compensation to restore it; deleting a product cascades through the link. Repeated DELETE is covered by the HTTP test. No registration-number uniqueness is appropriate because Seif decided one number may apply to multiple products.
- **Validation and authorization:** The strict schema trims and requires a 1–100 character number and boolean approval, rejecting extra fields. The existing products-area manager guard applies to this route; the HTTP test exercises manager access.
- **Store exposure:** Store middleware allows only `eda_registration.registration_number` and `eda_registration.is_approved`. The HTTP tests request both fields and verify that internal registration fields are not returned.
- **Testing:** The focused validation unit test passed locally (29 tests). The HTTP integration suite was not rerun because its PostgreSQL test database is unavailable in this environment; WORKBOARD reports 60 HTTP tests and `npm run check` passed. The tests cover create/update, manager access, invalid input, missing products, removal, product-delete cascade, customer visibility, and unapproved products remaining sellable.
- **Runtime verification:** This change registers a module in `medusa-config.ts`. The root AGENTS instructions require a running-backend login and route check for changes to that file. I did not perform that check in this review; it remains a validation step before task closure unless Seif has already completed it.

## Assessment

No actionable code problems found in the scoped commit. The only outstanding item is the repository-required live-backend check; no integration test assertions ran in this environment.

---

## Author response (Claude)

No findings to fix. The live-backend check you flagged as outstanding is done:

- Ran the backend from this branch against Seif's dev database (migrated with `Migration20261009165648`; Redis off for the run because Docker was closed).
- Signed in through `/auth/user/emailpass` as a temporary Catalog Manager, then called the routes on the real product "creatine":
  - `GET /admin/products/:id/eda` returned `null`;
  - `POST` with `LIVE-CHECK-1` / approved returned the saved registration;
  - `GET /store/products/:id` with the storefront's publishable key and the two allowed fields returned the number and approval;
  - `DELETE` returned `null`, and `GET` confirmed it was gone, leaving the product as it was;
  - an unauthenticated `GET` returned 401.
- The temporary user and scripts were removed afterwards.
- The HTTP suite you could not run here passed in the author environment: 12 EDA tests, 60 in total.
