# Reviewed baseline: RD-3 and RD-5 consolidation

2026-10-18. Seif explicitly authorized bringing the approved GPT work into reviewed-baseline for manual testing.

## Sources and boundaries

- Starting full-stack: 7351bc53ba0db37ab979e25c4678f5036f0a4bb8 (also freshly fetched origin/full-stack).
- Reviewed GPT application source: c3e16a3, including RD-3 through 093048b and RD-5 through d92f80d. ffccd84 adds only the authorized consolidation claim.
- Combined checkout: C:/Users/Seif Waleed/.codex/worktrees/reviewed-baseline/vi2 on full-stack.
- Backend source is byte-for-byte unchanged from 7351bc5; Redis/store-cache and manager-access fixes remain present.
- Storefront source is byte-for-byte identical to the approved GPT source. Existing Claude product-page (faa13d1) and cart-hardening (2da69b5) history remains present.
- Only docs/WORKBOARD.md conflicted. Preserved baseline's updated statuses and owner decisions; carried over RD-3/RD-5 records, the homepage-outage follow-up and development-only policy gate. No application merge conflict or new implementation.
- No package/lockfile/AGENTS/decision changes, migrations, catalog writes, environment-file edits, remote push or edits to Claude's checkouts. Unrelated author drafts preserved.
- Separate Claude product-admin, R2/storage and Resend/email branches were not included.

## Validation on the combined checkout

- Storefront: 32 suites, 329 tests pass. Plain root check stops at test discovery because its rootDir-expanded Windows glob mixes path separators in this checkout. Reran every storefront test with the portable CLI glob below; no test/config edits.
- Backend: 23 source suites, 207 tests pass. Plain backend command also discovers stale generated .medusa JavaScript copies on Windows (45 suites/406 tests pass); those duplicate generated results are not counted as source coverage. Source-only command below excludes build output.
- Both applications' type checks pass: npm run typecheck from workspace root.
- Both lint checks pass: npm run lint from workspace root; zero errors, 15 existing storefront warnings.
- Production storefront build passes: npm run build -- --webpack. Backend build not repeated because backend source is unchanged.
- Backend /health HTTP 200; Redis cache/event/workflow/locking connections established; existing database target localhost:5432/vi2_dev and Redis localhost:6379.
- Native category reads with x-medusa-locale en-US/ar-EG each return five parents and 33 children. No unexpected missing Arabic labels (scientific CoQ10 retained).
- Actual development HTTP checks: /en, /ar, both shop routes and both returns previews return 200 with server-rendered correct lang/dir.
- /categories, /en/categories and /ar/categories return 404.
- Production draft blocking was already verified in Claude's RD-5 review; not replayed against a production server in this consolidation. Development previews are intentional; policy content still requires Seif's approval and business facts.
- Existing runtime warning on homepage: an image src is empty. No source changes made for that pre-existing issue in this consolidation.

Portable test commands (run from the corresponding app directory):

```powershell
# apps/storefront
npm test -- --testMatch '**/src/**/__tests__/**/*.test.[jt]s'
# apps/backend: exclude generated copies, retain every source test
npm test -- --modulePathIgnorePatterns '[.]medusa' --testPathIgnorePatterns '[.]medusa'
```

## Manual test / restart

Both development servers started from this combined checkout and left running:

- Storefront: http://localhost:3000/en and http://localhost:3000/ar
- Backend/admin: http://localhost:9000/app
- Older author preview on port 3001 was left untouched; do not use it for combined acceptance.

If restarting, first stop the matching running baseline server to avoid a port collision. Keep PostgreSQL and Redis running.

Backend terminal:

```powershell
cd 'C:\Users\Seif Waleed\.codex\worktrees\reviewed-baseline\vi2\apps\backend'
npm run dev -- --port 9000
```

Storefront terminal:

```powershell
cd 'C:\Users\Seif Waleed\.codex\worktrees\reviewed-baseline\vi2\apps\storefront'
npm run dev -- --webpack --port 3000
```

Existing local frontend environment points to http://localhost:9000. Webpack avoids the external node_modules junction limitation in this checkout without changing configuration or dependencies.

Still pending: Seif's manual acceptance, signed-in/cart/checkout and browser/device regression checks in RD-6, populated multi-page catalog acceptance, native Arabic/legal review and business/policy facts. The separate homepage-backend-outage recovery task remains open. No remote push performed.
