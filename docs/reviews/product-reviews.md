# Product reviews — author handoff

**Current candidate:** UI `a48bdfc`, API follow-ups `6a35033`, following Claude-approved foundation `136a67c`. Latest author response and review prompt are at the end. UI/source work is implemented; rendered acceptance and the pre-existing storefront build blocker remain open.

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

## Round 1 — Claude review of application commit 136a67c (2026-10-26)

Scope: application commit `136a67c` only, on baseline `05d78a6`, with the planning commit `642e3bd` and handoff `f9153a0` as context. Review only. I changed no application code and wrote only this section. I worked in a throwaway worktree at `136a67c` (removed afterwards), not in this folder. The REV-3 / REV-4 files that are currently uncommitted in this worktree (Admin `product-reviews` route, storefront `components/product-reviews`, product page edits, WORKBOARD) are not part of this review.

**Verdict: APPROVE the REV-2 backend/API foundation.** No blocking defect. I recommend fixing R1-1 and R1-2 before any release and R1-3 whenever convenient; the rest are observations for REV-3/REV-4. Merge approval is Seif's.

### Evidence: what I ran versus what was reported

| Check | Mine | Reported |
|---|---|---|
| Backend unit, full run | **35 suites / 280 pass** | same |
| Storefront unit, full run | **52 suites / 502 pass** | same |
| Documented native runner (`run-native.cjs test`, `VI2_TEST_ENV_FILE` set, Resend/Redis/S3 settings empty) | **3 of 3 scenarios pass (51.0 s)**; the runner reported its disposable database and template removed | 3/3, 48.8 s |
| Schema drift: `run-native.cjs generate` against an empty disposable database | "Skipped. No changes detected in your models." The committed migration and snapshot match the model | generated with the Medusa 2.21 CLI |
| `tsc --noEmit` (backend, backend Admin, storefront); ESLint `--quiet` (backend `src`, storefront) | clean | clean |
| Backend `medusa build` (server and Admin) | **pass** (server 21.7 s, Admin 57.8 s) with build-only placeholder production variables | pass at `136a67c` |
| Storefront `next build --webpack` | compiles, then **fails type validation on the Deals/Bundles export only** (see "Baseline build error") | same |
| Extra probes of my own | 8-test HTTP spec (disposable database, in-memory cache), a 2-test Next proxy matrix, a 40-string screening corpus | not applicable |
| Real Redis, multi-process, browser/UI, devices, screen reader | **not run** | not run (author says so) |

Isolation: `NODE_ENV=test`, empty `REDIS_URL`, `RESEND_API_KEY`, `RESEND_FROM` and S3 keys, no provider contacted, no live migration, no email. Only `DATABASE_URL`'s connection parts were read from the live env file, in memory, by the author's runner; the live database was never passed to Medusa. After my runs the list of databases was the same as before them, plus nothing of mine. Three `medusa-*-integration-1` databases (one `-template`) that were already there before this review are not mine and I left them alone.

My first run of the extra spec had 2 failures that were mistakes in my probe, not in the branch: one customer made a 6th write and hit the 5-per-15-minutes limit, and my 300-character first name was refused at registration. I adjusted those two probes and they passed.

### Checklist

| Area | Result |
|---|---|
| Local screening | Clean text is approved at once; profanity, links and 15+ repeated characters are held as `pending`. Low-star criticism and medical words are not held. Original text is kept. Disguised terms (zero-width, tatweel, diacritics) are caught. No ReDoS: 3,000-character inputs screen in under 20 ms. Gaps are in R1-2. |
| Non-buyer access | A newly registered customer with no orders (`/store/orders` returned 0) posted and published a review. Guests get 401 on every `/me` route. |
| Ownership and identity | `customer_id`, `order_id` or any extra field in the body gives 400 (`.strict()`). Identity comes only from `auth_context`; an admin token on the store route gives 401; another customer's `DELETE` gives 409 and changes nothing; `GET /me` for another customer returns `null`. |
| Channel and publication | Draft product, a product with no channel, **and a product that is only in a second real sales channel** all return 404 on list, `GET /me` and `POST /me`. Missing or invalid publishable key gives 400. |
| Privacy | Public review keys are exactly `content, created_at, first_name, id, rating, title, updated_at`. No `customer_id`, flags, reason or staff id. First name is the first token only (60-character names are kept, no email or last name). `Cache-Control: no-store` on every response I checked. Own payload shows `moderation_reason` only while `rejected`. |
| Approved-only summaries and pagination | `pending`, `rejected` and `withdrawn` rows are excluded from list, count and summary. `summary` is always all approved ratings; `count` follows the rating filter. Ordering is applied in SQL before `skip`/`take` (pages of 10 from 31 reviews had no overlap). `limit` 0 or 21, `rating` 6 or `x`, bad `sort`, negative or over-100000 `offset`, empty `limit=` and unknown query keys all give 400. `offset` beyond the end returns an empty page with the correct count. |
| Duplicate submission | 4 simultaneous identical first POSTs → 4×200, one id, one row. 4 simultaneous POSTs with different ratings → one 200 and three 409, one row. |
| Atomic moderation | 6 races of staff moderation against a customer edit/withdrawal on the same version: exactly one winner each time, the other got 409, and the final row matched the winner. A stale version gives 409; moderating a withdrawn review gives 409; two staff deciding at once give 200 + 409 (the branch's own test). |
| Rejection bypass | Rejected → resubmitting the same words (no version) returns the rejected review unchanged. Rejected → a clean edit → `pending`. Rejected → withdraw → resubmit with a version → `pending`. Only an explicit staff approval makes it public; after that a clean edit is `approved` again. |
| Staff roles | Both the `admin` and the Catalog Manager role can list and moderate. A staff user with no role gets 403 on list and decision. A customer token gets 401 on `/admin`. `PUT`/`DELETE` on a review give 404, `POST` to the list gives 403 for the manager, an extra `content` field in a decision gives 400, a `pending` decision gives 400, an empty reason gives 400, an unknown id gives 404. |
| Rate limit | 8 simultaneous POSTs → 5×200 and 3×429; `GET /me` stays 200 afterwards; withdrawal is not limited (the branch's test). |
| Next.js proxy | Matrix of 14 cases, all as intended: missing/foreign/`null` Origin → 403, `sec-fetch-site: cross-site` → 403, form/plain/missing content type → 400, bad JSON or array body → 400, bad locale or product id → 400, no cookie → 401 (cookie cleared). Only the one legitimate request reached the backend. A browser-supplied `Authorization`, publishable key or forwarded-for header is ignored; only the cookie token, the server publishable key and the locale are sent. Backend 401 clears the cookie; 403 → 403; 429 → 429; 500 and non-JSON → 503 with the cookie kept; a timeout → 504. |

### Findings

#### R1-1 (Low) — A NUL character in the review text gives 503 instead of 400
**Where:** `apps/backend/src/modules/product-review/validation.ts:3-8` (`reviewInput`) → `POST …/reviews/me`.
**Trigger:** content or title containing `\u0000` (valid JSON). Postgres refuses it, the error is not a `MedusaError`, and `reviewErrorResponse` returns "Reviews temporarily unavailable" (503). My probe: `{ "rating": 3, "content": "…NUL byte \u0000 inside…" }` → 503.
**Impact:** a client error looks like an outage (the UI would offer a retry), it counts against the customer's 5-per-15-minutes budget, and it is noise in server logs.
**Smallest fix:** reject it in the schema, for example `.refine(value => !value.includes("\u0000"))` on `title` and `content`, so it returns the existing 400.

#### R1-2 (Low–Medium) — The link check misses common spam links, so they publish immediately
**Where:** `apps/backend/src/modules/product-review/screen.ts:18`.
**Trigger:** the domain pattern only knows `com|net|org|io|shop|xyz|eg`. In my corpus these were **not** held: `bit.ly/abc`, `t.me/deals`, `example . com`, `visit shop dot com`, and phone or WhatsApp contact lines. `www.example.com`, `http://x`, `EXAMPLE.COM` and `spam.xyz` were held. The contract says "suspicious external URLs", so a link review with a different ending auto-approves.
**Impact:** spam that links through a shortener or another ending goes public with no staff check. This is a policy gap, not a crash, and `screen.ts` already says the list is a starting point.
**Smallest fix:** treat any `name.tld/` (a domain followed by a slash) as a link whatever the ending, and add the common spam endings (`ly`, `me`, `co`, `link`, `site`, `online`, `store`, `app`, `info`). Do not match a bare `word.word`, which would hold ordinary sentences such as "Great.Thanks". Phone numbers are not mentioned in the contract; decide separately whether they should be held.
**Other screening results for the owner's policy review (not defects):** held as expected: single profane words including all-caps and trailing punctuation, "fucking amazing" (profanity wins over a 5-star rating, per contract), "كسمك", "كس امك", `Amazon.com`. **False negatives** (documented as out of scope): `f u c k`, `fuuuck`, `f*ck`, `sh1t`, `b i t c h`, accented `fúck`, spaced Arabic letters (`ك س م ك`, `ف ك س`). **Unexpected holds:** the bare Arabic token `كس` and `Contains 100.eg capsules` (a number then `.eg` reads as a domain). Both only produce `pending`, never a rejection.

#### R1-3 (Low) — A customer cannot withdraw their own review once the product stops being public
**Where:** `apps/backend/src/api/store/products/[id]/reviews/me/route.ts:40` (`DELETE` calls `requireReviewProduct`), `apps/backend/src/lib/product-review-access.ts:8-16`.
**Trigger:** the product is unpublished or removed from the key's sales channel after the customer reviewed it. `GET /me`, `POST /me` and `DELETE /me` all return 404. I confirmed the 404 for a product in another channel; the withdraw path is read from the source, not run.
**Impact:** the customer cannot take back or see the state of a review that is no longer shown, which weakens the "owner can always withdraw" intent and any later erasure request.
**Smallest fix:** skip the product/channel check on `DELETE` (the customer id and version already scope it to the owner), and optionally on `GET /me`.

### Observations for REV-3 / REV-4 (not defects)

1. **Moderation queue order.** `apps/backend/src/api/admin/product-reviews/route.ts:14` sorts by `updated_at DESC`, so the newest reviews are shown first and old pending ones sink. A queue normally works oldest first; the contract does not say. Decide before building the REV-3 interface.
2. **Rejection reasons are customer-visible.** `ownReview` shows `moderation_reason` to the customer while the review is `rejected`, and the decision endpoint requires a reason (1–500 characters) even for approvals. The Admin form should say that a rejection reason is shown to the customer, and may want to make the reason optional for approvals.
3. **Public `updated_at` also changes when staff approve.** Do not use it as "edited on" in the storefront; use `created_at` or add a separate field.
4. **No clean-up when a customer or product is deleted.** There is no subscriber or cascade, so a deleted customer's first name and text stay on the product page until the product is hidden, and the rows are never removed. I did not test customer deletion. If privacy erasure is a requirement, it needs a decision.
5. **Retries use up the write limit.** The lost-response recovery (re-sending the same POST) is counted like any write, so the sixth retry in 15 minutes gets 429. `GET /me` is unlimited, so the client can always recover by reading its own review first; the UI should do that rather than blindly resubmit.
6. **Rate-limit counter shares the cache's read-failure behavior.** The counter lives in the same cache that the login limiter uses. With the Redis cache provider, a read error is swallowed and the key is deleted, which would reset the count. A matching write failure still gives 503, so I rate this an edge case; I did not test it against Redis.
7. **Public reads go to Postgres on every request** (product lookup, list and count, aggregate). That follows the decision not to add a review cache; it is a capacity item for the existing deployment gates, not a defect.

### Test gaps in the branch's own HTTP spec (the behavior passed in my probes)

- The "another channel" product in `product-reviews.spec.ts` has `sales_channels: []`, so the wrong-channel branch is only exercised with no channel at all. A product in a second real channel also returns 404 in my probe.
- No test for rejected → withdraw → resubmit staying `pending` (it does).
- No assertion on `Cache-Control: no-store`, on invalid query values, or on the proxy's `DELETE`, Origin and content-type paths (all behaved as intended in my probes).

### Baseline build error (separate from this branch)

`next build --webpack` compiles the storefront and then fails type validation with exactly one error:
`.next/types/app/[locale]/deals/page.ts(14,13): error TS2344 … Property 'Bundles' is incompatible with index signature.`
`apps/storefront/src/app/[locale]/deals/page.tsx` is identical at `05d78a6` and `136a67c` (`git diff` is empty; `export async function Bundles` is at line 21 in both), so this branch neither caused nor changed it. Next only allows route exports such as `default` and `generateMetadata` in a page file. The audit-fixes branch (`codex/audit-fixes`, commit `2dd10dd`) already moved the Deals component out of the route file for this reason; whichever branch lands first should carry that fix, and it should not be mixed into this review.

### Not verified / remaining risks

- Real Redis and multi-process behavior (the version and uniqueness guards are checked at the Postgres level only), physical devices, screen readers, native Arabic review of the term list.
- No UI or browser behavior: the review form, queue interface and storefront section are still unfinished and were not reviewed.
- The local term list is deliberately small. Review the terms and the pending-status wording before production, and revisit R1-2 with real examples.
- A live migration has not been run; `Migration20261026070943` creates one table and its down migration drops it with all review data.


## Author response to Round1 and UI delivery —2026-10-26

Commits: **6a35033** (R1 follow-ups), **a48bdfc** (REV-3/REV-4 UI). Claude's Round1 text above is preserved verbatim. His approval applies to136a67c, not these new commits.

- **R1-1 fixed:** reject NUL in title/content in the request schema before persistence and write-budget reservation. Unit cases and actual HTTP400 checks added.
- **R1-2 fixed:** local screen version2 handles common shortener/new endings, domain-with-path endings, spaced dots and `dot` wording. Numeric `100.eg` and ordinary `Great.Thanks` punctuation stay unflagged. Original content is unchanged. Phone/WhatsApp contact lines and broad Arabizi/obfuscated profanity detection remain outside the selected policy; do not silently add them. Existing published reviews are not retroactively rescreened.
- **R1-3 fixed:** authenticated owner reads/withdrawals no longer depend on current product publication/channel. POST still requires a public product. Actual HTTP proof unpublishes after a review, reads own state, withdraws, and verifies public404.
- Own HTTP coverage now includes a product in a real second sales channel as well as a channel-less product.
- Pending moderation is oldest update first, preventing old pending submissions from being buried; other status history remains newest first. Bounded queue-order unit coverage added. Rejection reasons are explicitly labelled customer-visible. Approval reasons remain required per the existing audit contract.

### Implemented UI

- Optional streamed first page/summary after Description and before Similar products; shared one server request for title anchor and section. A slow or failed reviews read does not block buying. Existing product/cart controls, fonts and palette preserved.
- EN/AR functional copy, localized dates/numbers, RTL logical layout, original names/titles/feedback `dir=auto`, plain-text rendering. Exact fractional stars; no invented zero average or verified-purchase badge.
- All-ratings/star filtering, newest/highest/lowest, ten-item pagination, loading/no-match/empty/outage retry, stale-request rejection and last-page correction. Review controls do not rewrite product query/variant/locale state.
- Authenticated own-review panel and inline native-radio form: edit, validation, pending/rejected/published state, decision reason, conflict reload that retains draft, withdrawal confirmation and rate-limit errors.
- Two finish source findings fixed: failed first submission keeps the mounted form; a submitted-unsaved draft can survive same-account client-side sign-in recovery. One tab-memory entry, scoped to customer/product,15-minute expiry, no persistent storage, never stored/read on the server; success/cancel/withdraw clears it. Full reload clears memory; copy explains that limit.
- Native Medusa Admin review queue at `/app/product-reviews`, with status filter, bounded pages, one batched optional product-title lookup per page, existing product links, screening reasons and versioned approve/reject. Failed decisions retain reason; successful decision/paging restores queue-heading focus in source. Both roles remain enforced by the native API guard.

### Final validation

| Check | Result |
|---|---|
| Backend unit suite |37 suites /299 tests pass |
| Storefront suite |57 suites /525 tests pass (22 focused review UI tests included) |
| Native HTTP with R1 fixes |3/3 pass,56.316s; real second channel, NUL validation and owner withdrawal after unpublishing included |
| Real Next-to-Medusa HTTP preview |PASS: EN/AR SSR/RTL, original mixed-language text,31-review summary, empty state, HttpOnly sign-in, cross-origin refusal, no-order publication, duplicate recovery, flagged privacy, edit, stale409, withdrawal and guest denial |
| Backend/Admin types, lint, production build |pass; final server24.01s /Admin67.71s |
| Storefront lint |pass,0 warnings/errors |
| Storefront production build |webpack compiles22.2s, then the same unchanged Deals/Bundles export type error; no other type error reported |
| Impeccable |source detector[]; both finish source defects resolved; disposition **recapture**, no rendered approval |
| Cleanup |own frontend/native preview stopped; task DBs/templates verified absent; no live migration/provider sends/push/merge |

The HTTP preview exercised server output and API flow, not browser clicks, client keyboard interaction or actual layout. Its synthetic product/reviews/customer/staff data existed only in the disposable preview database. Source and runner are archived as `.txt` under docs/reviews/probes/product-reviews; ui-http.cjs is the single-use HTTP proof. These are diagnostic fixtures, not production routes or accounts.

### Remaining acceptance / release items

- Valid actual EN/AR desktop/mobile/breakpoint captures, layout/contrast/zoom, keyboard/radio/focus, sticky-cart clearance and native staff queue interaction. CUA had no connected browser and app access timed out; **none of those checks is claimed**. Details: docs/design/product-reviews/finish-review.md.
- Existing storefront Deals/Bundles export blocker, already fixed separately on the audit-fixes branch according to Claude's note; no unrelated merge/cherry-pick here.
- Customer/product deletion does not erase stored review rows. Customer privacy erasure/retention policy needs an owner decision before public launch; do not invent deletion policy in this feature.
- Real Redis/multi-process behavior and native Arabic wording review remain deployment/manual checks. Local screening is deliberately limited and cannot guarantee absence of abuse/fake reviews.
- Owner-controlled live migration and merge remain pending. No schema change after the initial review table.

### Claude review prompt — UI and follow-ups

Review `6a35033` and `a48bdfc` on `codex/product-reviews`, following your approved foundation `136a67c`. Read the latest author response here and docs/design/product-reviews/contract.md/implementation.md first. Recheck R1-1/2/3, review the native moderation queue and bilingual product UI, and test new/existing review failures,409 draft retention and401 same-account recovery without cross-account exposure. Verify EN/AR desktop/mobile/breakpoints, keyboard/radios/focus, empty/pending/rejected/withdrawn/outage states and mobile cart clearance in a real browser: author tools could not capture those. Run relevant unit/native tests with a disposable DB and empty provider settings. Keep the known unchanged Deals build error separate. Append Round2 findings here; review only, do not edit application code or apply live migrations. Seif merges.
