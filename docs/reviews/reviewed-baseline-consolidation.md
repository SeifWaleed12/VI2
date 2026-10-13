# Reviewed baseline consolidation — 2026-10-13

Seif authorized local consolidation before further design work. Both apps for manual testing must run from the same full-stack release; do not combine Claude's older backend checkout with GPT's newer storefront.

## Included sources

- Starting full-stack: 57124ae (category translations, locale routing, category navigation).
- GPT: eb0892f, merged at f6683ad (language button, account first name, cart layers/focus, ticker motion).
- Claude: reviewed Egypt/EDA history through 2509f84, merged at fddcdf0.
- Checkout HTTP tests: 58d64ec and 5d94e01, reapplied at 71bb7f6 and b13555c.
- Reviewed cart access: 373cf6a, 1de0340, 213ef3e, 58800fb. Final approval recorded in 03ef5cf and docs/reviews/order-owner.md.
- Integration-only correction 0e6ab39 adds the existing BrandModuleService type to an admin-test container lookup. No assertions or application behavior changed.

Native translations and EDA coexist in medusa-config.ts. Cart completion changes applied to the locale checkout page. Logout clears pending recovery, 403 is definite failure, and timeouts/5xx retain the same cart.

## Excluded and preserved

R2 commits e41dbf7 and 8ad7860 await bucket configuration and live checks. Claude's branch therefore intentionally differs from this release; it must not be used as the backend source during combined manual testing. No R2 secrets, migrations, seeds, catalog updates or provider setup were applied. Existing vi2_dev data is reused.

Claude's local next.config.ts and drafts are untouched. GPT's intersecting untracked review drafts are backed up before synchronizing. No package, lockfile or AGENTS changes; no remote push. Remaining product/shop/footer/header redesign work and readable category URLs are not implemented here.

## Validation

- Backend unit tests: 199 passed.
- Storefront unit tests: 169 passed.
- Both app type checks pass.
- Both lint checks pass, zero errors; 20 storefront warnings remain.
- Both production builds pass (storefront uses webpack for external dependency junctions).
- Combined Egypt/EDA/checkout HTTP tests: 25 passed before cart-access integration; changed checkout suite rechecked afterward, 8 passed.
- Native HTTP runner created and dropped disposable integration databases. It did not change vi2_dev.
- Managed checkout is under .codex: Jest's expanded absolute testMatch initially found zero storefront tests. Equivalent CLI testMatch '**/__tests__/**/*.test.[jt]s' ran all 169 tests without changing configuration or weakening coverage.

Real signed-in header display, normal-motion visual looping, Admin category translation edits, and the user's complete manual checkout walkthrough remain manual acceptance checks. Production checkout remains disabled pending real providers.

## Manual testing source

Canonical checkout: C:/Users/Seif Waleed/.codex/worktrees/reviewed-baseline/vi2
Backend: localhost:9000, development, same existing vi2_dev database.
Storefront: localhost:3000, development with webpack; /en and /ar.
GPT's gpt/work is fast-forwarded to the same release. Claude's checkout is kept intact for its pending work. Stop old frontend/backend processes before running this pair.

Staging/production require their own database backup, native migrations, Egypt setup and category dry-run/apply as documented in docs/CATEGORY-LOCALES-DEPLOYMENT.md and WORKBOARD.md. Nothing was deployed there.

## Final running-release verification

After synchronizing GPT, the unmodified root npm run check passed there (368 unit tests, both type checks and both lint checks). Both apps now run from this single release checkout on ports 9000 and 3000.

The native category API returns the same 38 IDs for en-US and ar-EG: five parents with 8, 8, 8, 5 and 4 children. All localized names use Arabic except the unchanged international label CoQ10. Browser verification shows Arabic parents and vitamin subcategories; switching to English reaches /en and restores English navigation.

Existing local media was copied without overwriting destination files. The original environment files were copied into ignored release-local paths; credentials were not displayed or committed. Four intersecting GPT review drafts are preserved under C:/Users/Seif Waleed/AppData/Local/Temp/vi2-gpt-review-preserved-20261013-163858.

To restart this exact manual-test pair from the canonical checkout:
- Backend: npm run dev --workspace=@dtc/backend
- Storefront: npm run dev --workspace=@dtc/storefront -- --webpack --port 3000
- Avoid running the old author backend at the same time. Claude's pending R2 branch is intentionally not the manual-test backend.

No remote push. Authenticated customer/header and full manual checkout acceptance still remain for Seif.
