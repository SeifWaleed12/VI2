# Product reviews — author handoff

## Scope / ownership
GPT authors on codex/product-reviews, from origin/full-stack05d78a6; Claude reviews, Seif merges. Application commit136a67c contains the backend/API foundation; planning commit642e3bd contains the workboard contract and separate desktop/mobile illustrative proposals. Owner selected local rules only: any signed-in customer, no order/delivery proof, clean reviews auto-publish, flagged text pending for admin or Catalog Manager. No external API/AI, verified badge, new dependency or Redis review cache.

This handoff is REV-2 (backend/API foundation), not the completed product-review feature. REV-1 visual approval is pending in the user question. REV-3 Admin queue UI and REV-4 storefront UI are deliberately not implemented before the agreed design gate. No storefront product-page JSX/CSS, fonts, colors, existing purchase controls or existing catalog logic changed. REV-5 final visual/accessibility and user-flow acceptance remains open.

## Delivered foundation
- Native productReview module and one product_review table, DML-generated migration/snapshot. No custom link tables, core-table changes or native customer/order/product mutations. Cross-module IDs validated through native module/query APIs; the snapshot first-name is limited to the first token on submission.
- Required integer1–5 rating,20–3000 feedback, optional120-char title, strict payloads rejecting forged identity/extra fields. Customer ID from authenticated context only.
- Unique(customer_id,product_id) plus native create reconciliation for lost-response/parallel duplicate retries. Atomic version-predicated updates within the injected module persistence context protect edits, withdrawal and stale/concurrent moderation even across processes. No process-only lock used as the uniqueness/version invariant.
- Local exact-token English/Arabic list, normalized detection copy for diacritics/tatweel/zero-width hiding; suspicious URLs and excessive repeated characters held. Original text retained. No rating/sentiment/medical-word filtering. Prior staff rejection requires staff review on subsequent edits until explicitly approved; repeated clean edits cannot bypass it.
- Public approved-only bounded pages and separate all-approved aggregate distribution/average, with allowlisted newest/highest/lowest and optional rating filter. Aggregate query operates on this module's own table via the Medusa-injected native manager; at most five buckets reduced in memory. No Next.js database access or new DB client in application code.
- Published product and publishable-key channel enforcement on store reads/writes. Explicit no-store responses. Public payload excludes customer IDs/contact, moderation reasons/flags/staff identity; authenticated own payload includes only own state/version and rejection reason.
- Both staff roles use the existing verified role guard and scoped product read/update permissions; unknown review mutations stay denied. No new roles, staff assignments or role bootstrap change. Staff list/decision API is ready for the later native Admin queue UI.
- Per-customer5 create/edit attempts per15min through existing cache/locking limiter. Withdrawal remains possible after rate limiting. Infrastructure failure is retryable/unavailable, not unlimited writes or accidental publication.
- Thin Next.js authenticated proxy reuses HttpOnly auth cookie, origin guard, timeout and safe error handling. Explicit EN/AR locale, no-store public client/private calls, typed service contracts. Proxy preserves sessions on outages and clears only actual401.

## Schema / operations
Migration: apps/backend/src/modules/product-review/migrations/Migration20261026070943.ts, generated using installed Medusa2.21.0 CLI. It creates product_review with required identity/content/state fields, nullable last moderation decision, integer screen/version fields and native timestamps/soft-delete field. Checks constrain rating1–5 and positive version. Five indexes: deleted_at, customer/product unique, product/status/created_at, product/status/rating, status/created_at. No extra persistence table except Medusa's normal migration bookkeeping.

No live migration applied. After review/owner release, run the existing backend native db:migrate command from this branch against the intended database; do not use the probe to migrate live data. Rollback deletes review data and needs an explicit owner decision/back-up. The generated snapshot is retained like the other custom modules.

## Native test runner
Use PowerShell from this worktree:

```powershell
$env:VI2_TEST_ENV_FILE = "<absolute path to the existing local backend .env>"
node docs/reviews/probes/product-reviews/run-native.cjs test
```

The fixture reads only DATABASE_URL into memory, derives test credentials, empties Resend/Redis/provider settings, refuses pre-existing test database/template names and never passes the live database to Medusa. Native test-utils create/migrate/start/restore the disposable vi2_reviews_http_20261026 database; cleanup removes that and its template. No real emails or provider calls. The initial fixture lacked required product options (corrected); a final concurrent native-create probe exposed Medusa's normalized uniqueness error (corrected by scoped persisted-row reconciliation). The native index initialization wait matches the existing catalog HTTP suite, avoiding unrelated seed-before-snapshot errors.

## Validation
- Backend source35 suites/280 unit tests pass.
- Final native HTTP3/3 scenarios pass,48.8s; disposable DB/template removed. Includes the final duplicate-reconciliation and staff-rejection safeguards.
- Storefront52 suites/502 tests pass, including8 new cookie/origin/locale/status tests. Pre-production-generated-types check and lint pass.
- Backend production server/Admin build passes at application136a67c (server21.59s, Admin58.15s); final backend types/lint also pass after the persisted-row retry correction.
- git diff --check passes; generated Next type-reference changes restored. No live migration, catalog writes, external sends, push or merge.
- No UI/browser acceptance claimed: mockup approval and UI implementation remain open.

Existing baseline blocker: storefront production webpack build compiles, then fails Next-generated type validation because unchanged apps/storefront/src/app/[locale]/deals/page.tsx exports Bundles. The same export exists in05d78a6; this branch does not touch that page. Storefront typecheck before generated production types and lint passed;52 suites/502 tests pass. After a production attempt, typecheck may reproduce the same generated Deals error. Do not weaken checks or change unrelated Deals implementation in this review.

## Review focus
1. Real native failure/race paths: initial duplicate POSTs create one review; stale edits/moderation return409; competing staff decisions have one winner; rejected review edits stay pending until approved.
2. No purchase requirement, guests denied, customer impersonation/other-customer resources inaccessible; unpublished and wrong-channel products excluded.
3. Public/private field isolation, approved-only aggregates, global ordering/filtering before pagination, bounded input and safe outage errors.
4. Scoped admin/manager guard, current DB roles, no extra staff powers; actual native staff HTTP proof included.
5. CSRF/session/locale behavior of Next proxy; no external text transfer, live migrations or provider sends.
6. Dictionary false positives/false negatives: this is deliberately limited local screening, not a claim of complete Egyptian dialect, Arabizi, spam or fake-review detection. Review terms/policy before production; UI must explain pending status and allow correction.

## Remaining work
- User approval of the two supplied visual proposals.
- Native Admin moderation queue interface; storefront EN/AR section, form, summary anchor, pagination/filter/sort interactions and own-review feedback.
- Full responsive/keyboard/live customer end-to-end checks and Impeccable finish/detector/documentation after UI implementation.
- Real Redis/multi-process deployment exercise not performed; persistence uniqueness/version safeguards are tested natively.
- Physical devices, spoken screen-reader output and native Arabic language review not performed.

## Claude review
Append findings here; do not change application code. Keep the named commit scope and use only a disposable database, with email/provider settings empty.

## Copyable Claude prompt (REV-2 only)
Review codex/product-reviews application commit136a67c only, with baseline05d78a6 and planning/design contract642e3bd as context. Read docs/reviews/product-reviews.md and docs/design/product-reviews/contract.md first. This is the backend/API foundation, not completed storefront/Admin UI. Verify local-only screening, no-purchase customer access, guest/ownership/channel/privacy boundaries, approved-only aggregation/paging, duplicate POST recovery, atomic stale-version/concurrent moderation and inability to bypass staff rejection by repeated edits. Check both existing staff roles and the Next.js cookie/origin/timeout/locale proxy. Rerun the native disposable-DB HTTP scenario using the documented runner with all Resend/provider settings empty; no live migrations or real emails. Append findings under Round1 in docs/reviews/product-reviews.md; review only, do not edit application code. Record the unchanged baseline Deals/Bundles export build error separately.
