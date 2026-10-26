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

## Round 2 — Claude review of 6a35033 and a48bdfc (2026-10-26)

Scope: application commits `6a35033` (Round 1 follow-ups) and `a48bdfc` (Admin queue and bilingual storefront), on top of the approved `136a67c`. Handoff `555dc14` and the design notes were read first. Review only: no application code was changed in this folder and no live migration was run. I worked in a throwaway worktree at `a48bdfc` (removed afterwards) and a disposable database that I created and dropped (`vi2_claude_rev2_20261026`, empty Resend/Redis/S3 settings, no provider contacted). The uncommitted files that appeared in this worktree after a48bdfc were not reviewed.

**Verdict: REQUEST CHANGES (two Medium items and four smaller ones, all in the UI or the new screen rules).** R1-1 and R1-3 are resolved, the Admin queue works, and EN/AR layouts hold up at every width I measured. R1-2 is resolved for the spam links it was written for, but the fix now holds ordinary sentences as links (R2-1). A signed-in tab can also publish a review under a different account (R2-2). Merge approval is Seif's.

### What I ran versus what was reported

| Check | Mine | Reported |
|---|---|---|
| Backend unit, full run | **37 suites / 299 pass** | 37 / 299 |
| Storefront unit, full run | **57 suites / 525 pass** | 57 / 525 |
| Documented native runner (`run-native.cjs test`) | **3 of 3 pass (51.7 s)**, disposable database and template removed | 3/3, 56.3 s |
| `tsc --noEmit` backend, backend Admin, storefront; ESLint `--quiet` backend and storefront | clean | clean |
| `medusa build` (server and Admin) with build-only placeholder production variables | **pass** (22.6 s / 57.4 s) | 24.0 s / 67.7 s |
| `next build --webpack` | compiles, then fails type validation on the Deals/Bundles export only (see "Baseline items") | same |
| Real browser (the built-in Chromium pane), EN and AR, against a real backend (`medusa develop`), the storefront production build, and the native Admin | **run by me** (details below) | not run; the author's tools had no browser |
| Real Redis, multi-process, physical devices, spoken screen-reader output, native Arabic wording review, 200% text zoom, soft keyboard | **not run** | not run |

Setup notes for anyone repeating this. I seeded 31 approved reviews (English, Arabic, mixed text, a 70-letter unbroken word, HTML in a title) plus 12 pending ones with a scratch seed script, two customers and two staff users (admin and Catalog Manager). I used the storefront production build for most checks. Because the known Deals error blocks `next build`, the scratch copy only had `typescript.ignoreBuildErrors` switched on; no other source differs from `a48bdfc`. I used the Admin through the dev server. I simulated an expired session by restarting the backend with a different signing secret. Two harness effects are not defects: the pane did not run React's streaming "reveal" until something painted it (so "Loading reviews…" stayed for a while until I took a screenshot; the server output was complete and fast), and screenshots under phone emulation are cropped on the right. For phone widths I therefore rely on measured geometry (all numbers below) plus partial captures.

### Round 1 follow-ups

| Item | Result |
|---|---|
| R1-1 NUL in text | **Resolved.** Live: `\u0000` in `content` and in `title` both return 400. |
| R1-2 link screening | **Spam links resolved, but see R2-1.** `bit.ly/abc`, `t.me/deals`, `example . com`, `visit shop dot com`, `offer.online`, `offer.unusual/discount`, `www.example.com` are held; a real submission with `bit.ly/abc` went to `pending` in the running app. Phone/WhatsApp lines and `f u c k` stay unheld, as the author says. |
| R1-3 withdrawal when product is hidden | **Resolved.** Live: I unpublished a reviewed product. Public list gave 404; the owner's `GET /me` gave 200; `POST` gave 404; `DELETE` gave 200 and the status became `withdrawn`; another customer's `GET /me` returned `{"review":null}`. |
| Queue order | **Resolved.** In the Admin, "Pending0" (oldest) is first, then Pending1, Pending2, and so on. |
| Rejection reason label | **Resolved.** The field reads "Decision reason (shown to the customer if rejected)". |

### Admin moderation queue (browser, signed in as the Catalog Manager; admin role checked over the API)

- "Product reviews" is in the sidebar for the manager. The page shows the heading, the explanatory text, the status filter, "13 reviews", product titles from one batched lookup (as links), screening reasons ("External link, Possible abusive language"), and "Page 1 of 2" with Previous/Next.
- Approving with an empty reason shows "Give a reason for the decision." next to the buttons and sends nothing.
- A rejection with a reason succeeded: the count dropped to 12, the next review moved up, and keyboard focus went to the page heading.
- A decision on a review that another staff member had already decided (stale version) showed "This review changed. Reload the queue…" beside the buttons and **kept the typed reason**. Keyboard focus fell to the page body after that failure (same cause as R2-4).
- The admin API list returned the oldest pending first and the manager could list and decide; PUT/DELETE give 404 (from Round 1).

### Findings

#### R2-1 (Medium) — Screening v2 holds ordinary sentences as "external links"
**Where:** `apps/backend/src/modules/product-review/screen.ts:19-22` (`links = normalized.replace(/\s*\.\s*|\s+dot\s+/gu, ".")` followed by the `knownDomain` check).
**Trigger:** the new rule removes the spaces around every full stop, so a normal sentence boundary followed by a word that is also an ending in the list reads as a domain. I ran sentences through `screenReview` at `a48bdfc`; all of these return `["external_link"]` and would be held for staff:
- "Works great. **Me** and my wife both use it daily."
- "Arrived quickly. **Online** ordering was easy…"
- "Good price. **Store** staff were helpful…" / "…**Shop** assistants were polite." / "…**Site** was easy to use…"
- "I like it. **App** tracking worked well." / "…**Info** on the label is clear." / "…**Net** weight matches the label." / "…**Link** between sleep and…" / "…**Org** was easy to deal with."

The branch's own tests only cover "Great.Thanks…" and "…a week. Still disappointed", neither of which hits the ending list, so they pass.
**Impact:** clean reviews go to "awaiting staff approval" for no reason; customers see a status they did not expect and the moderation queue fills with false positives. This is a regression from the R1-2 fix, not a safety problem (nothing is rejected).
**Smallest fix:** only join a dot that has spaces on both sides (`\s+\.\s+`) or the word "dot", and leave "word. Word" alone. Add the sentences above as negative cases next to the existing ones.

#### R2-2 (Medium) — A tab that is still showing account A can publish A's review under account B
**Where:** `apps/storefront/src/app/api/reviews/[productId]/route.ts` (the proxy trusts the cookie only) together with `ProductReviews.tsx` (the UI trusts its own signed-in state).
**Trigger (reproduced):** signed in as Sara in tab 1, form open with an unsaved draft. In tab 2 of the same browser, sign in as Omar (the HttpOnly cookie is shared). Back in tab 1, which still says "Sara", press Submit. The review was saved and published as **Omar**: tab 1 said "Your review is published", the list showed "Omar" with Sara's text, and Omar's own `GET /me` returned it.
**Impact:** wrong-account publication with another person's name on it; nothing warns either user. It needs a shared browser profile and two sign-ins, so it is uncommon, but a shared family or shop computer is a realistic case and the result is a public post under a real person's name.
**Smallest fix:** the client already knows the customer id it is showing. Send it as an assertion header on write calls; in the proxy, read `actor_id` from the cookie's own JWT payload (no verification needed, it is the user's own cookie) and answer 401 on a mismatch so the existing "session expired, sign in again" path runs. Add one proxy unit test.

#### R2-3 (Low–Medium) — A failed save shows its message far from the Save button, and the "draft restored" banner appears after any failure
**Where:** `ReviewWriter.tsx:22-30` (alert rendered above the form in the "own" panel), `:41` (`recovered` banner shown whenever `open && draft`).
**Trigger and numbers (reproduced with a stale version and with the backend stopped):**
- Desktop 1024 wide: after pressing "Save changes" the alert was not in the viewport (the form top was 254 px above the visible area) — the button gives no visible feedback.
- Phone 390 wide: alert at y=2023, Save button at y=2849, scroll position 2465 — the message was off screen above the button.
- After a failed save (seen with a stale version) the banner "Your unsaved draft was restored for this account. Check the saved review before submitting…" appears, although nothing was restored. On a phone it sits at y=1318 (right under the heading, because it has `order: 0` in the stacked layout), about 900 px above the form at y=2206 and above the summary at 1436.
**Impact:** a shopper who presses Save and sees nothing may press it again (a rate-limit use) or leave. The restore banner is misleading and detached from the form.
**Smallest fix:** render the error and the banner inside the form, directly above the action buttons, and show "restored" only when the draft came from the sign-in recovery path (a flag set by `readReviewDraft`, cleared on the next edit).

#### R2-4 (Low–Medium) — Keyboard focus is dropped to the page body after save, withdraw, and failures
**Where:** `ProductReviews.tsx:35-36` (`close()` calls `writeButton.current?.focus()` while that button is still disabled by `own.busy`), `ReviewWriter.tsx:32-35` (the Withdraw button is replaced by a confirm pair), `ReviewForm.tsx:45` (Save is disabled while busy).
**Observed on the production build (`document.activeElement`):** after a successful save in English and in Arabic → `BODY`; after clicking "Withdraw review" (the confirmation appears) → `BODY`; after confirming withdrawal → `BODY`; after a failed save with a stale version → `BODY` (with the backend stopped it stayed on a button). English was measured on the dev build and Arabic on the production build. The Admin page does the same after a failed decision. Cancel and a successful Admin decision are fine (focus goes to the button/heading).
**Impact:** keyboard and screen-reader users lose their place and must tab from the top of the page after every action in the section.
**Smallest fix:** move focus after the busy state has cleared (an effect keyed on `busy`), focus the confirm button when the confirmation appears, and focus the error message (or the first invalid field) on failure.

#### R2-5 (Low) — Fractional stars are drawn wrongly on Arabic pages
**Where:** `Reviews.module.css:76` (`.starFill { inset: 0 auto 0 0 }`, a physical left anchor).
**Trigger (reproduced):** open any Arabic product with a non-integer average (the test product shows ٣٫٨ من ٥). In the right-to-left row the filled part is anchored on the left of each star while the star shape inside it is aligned to the right, so the fill shows the wrong half of the glyph. At 50% (zoomed 4× in the pane) every star showed a black block on the left instead of a clean half star. Whole-number ratings (individual reviews) are unaffected.
**Impact:** the summary stars and the stars next to the product title look broken for most real averages in Arabic.
**Smallest fix:** use logical anchoring (`inset-inline-start: 0; inset-inline-end: auto`) so the fill starts from the reading side in both directions.

#### R2-6 (Low) — Browser validation hides the written EN/AR error message
**Where:** `ReviewForm.tsx:23` (the form has no `noValidate`, and `required`/`minLength` are set on the controls).
**Trigger (reproduced):** with 9 characters typed, pressing Submit does not reach the component's `copy.invalid` message. The browser's own bubble appears (in the browser's language, not the page's), `aria-invalid` stays unset and the custom message is never shown. The custom message is only reachable with padded whitespace or a title over 120 characters.
**Impact:** Arabic pages can show an English validation message depending on the browser; the carefully written bilingual copy is dead in the common case.
**Smallest fix:** add `noValidate` to the form and keep the existing JavaScript check, setting `aria-invalid` on the failing control.

### Observations (not defects)

1. **Empty state still offers filters.** With no reviews the page shows the rating and sort selects above an empty message. They do nothing useful there.
2. **761–~900 px is tight.** At 761 px the list column is 369 px wide (280 px summary + 48 px gap); there is no overflow and nothing is below 44 px, but the two selects wrap. Consider stacking from about 900 px.
3. **RTL pages align English text to the right.** English reviews in an Arabic page are right-aligned (ragged on the left) because the global right-to-left alignment is physical. The `dir="auto"` text direction is correct. Cosmetic.
4. **Re-editing a withdrawn review** pre-fills the old rating and text. That seems intended; mention it in the UI copy if not.
5. **Sign-out is a full page load**, which clears the in-tab draft memory (verified: a marker I set on `window` was gone). A session that merely expires keeps the draft for the same account only, as designed.
6. **Arabic sign-in page strings** ("Your password", "Show password", "Forgot password?", placeholders) are still English. This is outside this change.
7. **Dev-mode only:** with `next dev`, a direct `#customer-reviews` URL stayed on "Loading reviews…" in my first session; the production build did not (see the harness note above). I did not chase it further.

### Verified working (browser, real backend)

- **Layouts.** English at 1440, 1280, 981, 761 (two columns), 760, 390 and 320 (stacked); Arabic at 1024 (the pane's own width) and 320, mirrored. No horizontal overflow at any width (document and section scroll widths equal client width). No interactive target under 44 px; rating radios are 48×48. The stacked order at 760 and below is heading → summary → write button → own panel/form → list in both languages. The 70-letter unbroken word, a long hyphenated name and HTML in a title all wrap inside the 288 px column at 320 px; the HTML is shown as text (no `<b>` or `<script>` element was created).
- **Right-to-left.** `dir="rtl"`; summary column on the right, list on the left, write button on the far side; Arabic digits and labels; rating radios start on the right with 1 star and the arrow keys follow the visual direction (Left moves to a higher star).
- **Keyboard and radios.** Opening the form focuses the first rating; arrows pick 1–5 (and wrap); Tab order rating → title → text → Submit → Cancel; the focus ring is visible on the active star.
- **Mobile cart bar.** The fixed "Add to cart" bar is 73 px high at the bottom of a 844 px viewport (top at 771). Focusing the form's Submit button leaves it at 704 (67 px clear); the text area and first star are well above the bar (the `scroll-margin` works). Form width 358 px at 390.
- **Failed submission and drafts.** Short text (native bubble, R2-6); a link in the text → `pending` with the summary count unchanged; stale version 409 → "Your review changed in another session… Your draft is kept", the form stays mounted with typed text, "Reload latest review" keeps the draft, and the next save succeeds with version 3; backend down → "Your changes could not be saved. Your draft is kept"; list outage on a filter change → "Reviews could not be loaded. You can still shop this product." with a working "Try again", and the open form's draft untouched.
- **Session expiry and recovery.** With the backend signing secret changed, Save gave the expired-session message (EN and AR) and the form closed. **Same account:** signing back in returned to the product by client-side navigation (a `window` marker survived), the form re-opened with the exact draft, the title and the focus on the first rating, and the recovery banner. **Different account:** signing in as the other customer showed no form, no draft text anywhere on the page, and only that customer's own review state; opening the form showed that customer's own saved text. Storage check: only the cart id is in `localStorage`, and `sessionStorage` is empty; no review data is persisted.
- **Withdrawal.** Confirm text appears; after confirming the status reads "withdrawn", the button returns to "Write a review", the review leaves the public list and the count drops by one.
- **Privacy/ownership** (from Round 1) still hold with the new routes: another customer reads `{"review":null}`; the public payload keys are unchanged.

### Baseline items kept separate from this review

1. **Deals/Bundles build error.** `next build --webpack` compiles the storefront and then fails with only `.next/types/app/[locale]/deals/page.ts(14,13): error TS2344 … Property 'Bundles' is incompatible with index signature`, the same error as in Round 1. `deals/page.tsx` is unchanged by these commits. The audit-fixes branch already moves the component out of the route file.
2. **Fresh database bootstrap.** On a brand-new database, `medusa db:migrate` ran the schema migrations and then stopped in the existing `initial-data-seed` script with "No store exists; run the database migrations first." (`apps/backend/src/migration-scripts/initial-data-seed.ts`, not touched by these commits). I worked around it with `db:migrate --skip-scripts` followed by the seed. This does not affect your current databases, but a first deploy to a new environment may hit it; it is worth a separate look.

### Not verified / remaining

Physical phones and touch, spoken screen-reader output, text-only zoom at 200%, a soft keyboard covering the form, contrast ratios (only inspected visually), real Redis and several backend instances, native Arabic wording review, and the Admin interface at a phone width. The Admin was driven as the Catalog Manager in the browser; the admin role was checked over the API only.

Suggested order of fixes: R2-1 and R2-2 first (user-visible correctness), then R2-3/R2-4/R2-6 together in the form component, then R2-5. A short re-review after those would cover the rest.


## Author response to Round2 —2026-10-26

Application/tests: **92b1528** on codex/product-reviews. Claude's Round2 report above is preserved unchanged. All six findings are addressed; approval of these changes is pending Claude's recheck.

- **R2-1:** screen version3 only joins dots with whitespace on both sides, or the word dot. All ten reported ordinary sentence endings now stay clean, while the shortened/spaced spam regression cases still remain pending. Original text and existing published rows are unchanged; no rescreen/backfill.
- **R2-2:** every private review request (including GET, preventing a stale tab from reading B's private review as A) sends x-review-customer-id from the displayed customer. The proxy compares that assertion with actor_id/actor_type in the cookie's JWT payload and refuses mismatches before Medusa requests. This decoded comparison is not authentication: matching requests still go to Medusa for token verification/ownership. A mismatch keeps B's valid cookie and triggers the existing401 refresh/recovery path; malformed or backend-expired tokens still clear the cookie. Review bodies never receive customer identity. All callers and the archived HTTP probe were updated; there is no new auth system, session storage or extra backend fetch.
- **R2-3:** mutation errors, Reload latest review and recovery status now appear inside the form, directly before actions. Restored status initializes only from a recovered draft on writer mount, and clears on edit. An ordinary failed attempt on the already-mounted writer cannot turn it on. New-review failure mounting and stale-version draft retention remain covered.
- **R2-4:** successful close defers focus to the write/edit action until busy/auth loading clears. Withdrawal confirmation receives focus, cancel restores the withdrawal action, and save/withdraw failures focus the appropriate alert after busy clears. Native Admin failed decisions focus their alert; success retains the existing heading-focus path. Focus tests use the existing direct hook/element harness, not a browser DOM.
- **R2-5:** fractional clipping is anchored with logical inset-inline-start/inset-inline-end, mirroring correctly with RTL. This requires Claude's updated pixel check.
- **R2-6:** noValidate allows keyed EN/AR messages to run for normal short/missing input. The actual invalid rating/title/content gets aria-invalid/describedby and the first invalid field receives focus; backend validation and input length constraints remain in place. Busy submission is explicitly ignored.

### Validation of92b1528

| Check | Result |
|---|---|
| Backend full unit run |37 suites /309 tests pass, including ten new sentence-boundary cases |
| Storefront full run |58 suites /540 tests pass |
| Additional final request-caller tests |2 new service tests pass alongside3 interaction tests;542 storefront cases covered in aggregate, not claimed as one full542-test run |
| Focused review run before the final caller tests |7 suites /45 tests pass |
| Native Medusa/Postgres HTTP |3/3 pass,67.158s; owned DB/template removed; all provider settings empty |
| Backend/Admin types and lint |pass |
| Storefront lint |pass,0 errors/warnings after removing one test-only unused expression |
| Storefront types/production build |same unchanged baseline Deals/Bundles export error only; webpack compiles13.5s. No ignoreBuildErrors or test weakening |
| Backend/Admin production build |pass: server25.62s /Admin69.52s |
| Browser |no provider in current CUA inventory; no new rendered approval claimed. Claude's actual Round2 browser evidence applies toa48bdfc |

The additional tests use the installed React/test harness and fetch mocks, not a new dependency or DOM emulator. No live migration/schema change, catalog write, provider send, push, merge or preview server. The build-generated next-env.d.ts path rewrite was restored and excluded. Remaining baseline Deals/build/bootstrap, privacy-retention decision, physical/zoom/screen-reader/Redis checks stay separate as described above.

### Claude Round3 prompt

Review **92b1528** on codex/product-reviews against555dc14, focusing on your Round2 findings R2-1 through R2-6. Read this response first and preserve earlier reports. Recheck sentence-boundary negatives plus shortened/spaced links; same-browser accountA/B mismatch for GET/POST/DELETE and refusal before writes, validB cookie preservation, genuine expired-cookie clearing and same-account draft recovery. In the running browser check EN/AR short-input validation, errors/recovery near save controls, ordinary-failure versus actual-restored wording, success/failure/withdraw/cancel/Admin focus, and fractional RTL stars. Reuse your passing layout matrix for regression checks; do not redesign. Run relevant tests/native probe with disposable DB and empty provider settings. Keep the unchanged Deals build and initial-seed issues separate; no ignoreBuildErrors in the feature source, live migrations or application edits. Append Round3 here. Seif merges.

## Round 3 — Claude review of 92b1528 (2026-10-26)

Scope: application commit `92b1528` against `555dc14`, rechecking my Round 2 findings R2-1 to R2-6. The later commit `7a26e39` only changes documentation (WORKBOARD, the design contract, the finish note and this file), so it does not affect the code I tested. The Round 2 text above is unchanged. Review only: I changed no application code here and ran no live migration. I worked in a throwaway worktree at `92b1528` (removed) and a disposable database (`vi2_claude_rev3_20261026`, created and dropped by me, empty Resend/Redis/S3 settings, no provider contacted). The Deals and initial-seed items stay separate (see the end).

**Verdict: APPROVE. All six Round 2 findings are resolved; I found no blocking issue.** Three small new items (R3-1 to R3-3) are worth fixing before visual acceptance, mainly R3-1. Merge approval is Seif's.

### What I ran versus what was reported

| Check | Mine | Reported |
|---|---|---|
| Backend unit, full run | **37 suites / 309 pass** | 37 / 309 |
| Storefront unit, full run | **59 suites / 542 pass** (one full run) | 58 / 540, plus 2 later tests |
| Documented native runner | **3 of 3 pass (58.6 s)**, disposable database and template removed | 3/3, 67.2 s |
| `tsc --noEmit` backend, backend Admin, storefront; ESLint `--quiet` backend and storefront | clean | clean |
| `medusa build` (server and Admin), build-only placeholder production variables | **pass** (21.9 s / 57.5 s) | 25.6 s / 69.5 s |
| `next build --webpack` (feature source as committed; `next.config.ts` has no `ignoreBuildErrors`) | compiles, then fails only on the Deals/Bundles export | same |
| Real browser, EN and AR, real backend, storefront production build, native Admin | **run by me** (below) | not run |
| Same-browser account A/B probes through the Next.js proxy with `curl` | **run by me** (below) | unit tests only |
| Physical devices, spoken screen-reader output, 200% text zoom, real Redis, native Arabic wording review | not run | not run |

For the browser checks I built the storefront for production from the same source, with `typescript.ignoreBuildErrors` switched on **in my scratch copy only** to get past the known Deals error; that setting is not in the feature source and the build check above ran without it. Harness notes from Round 2 still apply (the pane paints lazily, so a screenshot can show a previous frame; I trust the measured DOM values). Layout regression: English at 1440, 761, 760, 390 and 320 behaves as in Round 2 (two columns above 760, stacked below with the same order heading → summary → write button → own panel/form → list, no horizontal overflow, no target under 44 px). Arabic was spot-checked at the pane's own width for the form, validation and stars.

### Round 2 findings

| Finding | Result |
|---|---|
| **R2-1** sentence-boundary links | **Resolved.** I ran the 19 ordinary sentences from my Round 2 corpus ("Works great. Me and my wife…", "…Online ordering…", "…Store staff…", "…Shop assistants…", "…Site…", "…App…", "…Info…", "…Net…", "…Link…", "…Org…", "Great. Thanks", and so on) through `screenReview` at `92b1528`: all return no flags. The spam cases are still held: `bit.ly/abc`, `t.me/deals`, `example . com`, `visit shop dot com`, `shop dot COM`, `www . example . com`, `offer.online`, `offer.unusual/discount`. One trade-off follows from the rule (observation 4): spacing on only one side is no longer joined, so `example. com`, `bit. ly/abc` and `shop .com` are **not** held. |
| **R2-2** account switch | **Resolved.** Browser: Sara's tab had a new-review draft open; the other account signed in from a second tab (shared cookie); pressing Submit published nothing under either account (the other account's own review stayed `null`, the list showed 0 reviews). The tab then showed the other account's name, because the existing refresh path ran. Proxy probes with `curl` (cookie of account B, header of account A): `GET` with no header → 401; `GET` with the right id → 200; `GET`, `POST` and `DELETE` with the wrong id → 401, no cookie cleared, nothing written; a request with a missing Origin → 403; a malformed cookie → 401 and the cookie cleared; a cookie with bad base64 → 401 and cleared. Real tokens work (the own-review `GET` returned 200 after a normal sign-in). Genuine expiry (backend signing secret changed): Save gave "Your session expired…", the form closed, the header went to the signed-out state, and signing back in as the **same account** returned by client-side navigation with the exact draft and the recovery banner. |
| **R2-3** feedback placement and wording | **Resolved.** With a stale version (409) the alert sat inside the form 89 px above Save, in the viewport, with "Reload latest review" beside it, the draft kept, and no "restored" banner. With the backend stopped the alert was inside the form, in the viewport and focused. The "unsaved draft was restored" status appeared only after the sign-in recovery and disappeared as soon as I edited. |
| **R2-4** keyboard focus | **Resolved.** After a successful save: focus on "Edit your review" (English) and "تعديل تقييمك" (Arabic). "Withdraw review" moves focus to the confirm button; Cancel returns focus to "Withdraw review"; confirming returns focus to "Write a review". After a failed save (409 and outage) focus lands on the error message. In the Admin, a failed decision (stale version) focuses the alert and keeps the typed reason. |
| **R2-5** Arabic stars | **Resolved.** On an Arabic page the computed fill anchors on the right (`right: 0`, left offset 2.8 px for an 84% star) and the summary at 4× zoom with 50% fills shows a clean right half in every star. Four-star review rows show the empty star on the left, correct for right-to-left. |
| **R2-6** validation | **Resolved, with a placement caveat (R3-1).** English and Arabic messages now appear for short or missing input; `aria-invalid` is set on the text field (and on the rating group when no stars are chosen); focus goes to the first invalid control; the form has `novalidate`, so the browser's own bubbles no longer replace the written text. |

### New findings

#### R3-1 (Low–Medium) — A missing star rating shows its message out of sight
**Where:** `ReviewForm.tsx` (the validation alert is rendered below the text field, next to the actions; `submit` moves focus to the first invalid control) and `Reviews.module.css` (no styling for `[aria-invalid]` or for the alerts).
**Trigger (reproduced):** open the form, press Submit with nothing filled in. Focus moves to the first star at the top of the form and the page scrolls there; the message "Choose 1–5 stars and write 20–3,000 characters…" is at the bottom of the form and is not in the viewport (desktop: `alertInViewport: false`). On a 390 px phone it is at y 835–912 while the viewport is 844 high and the cart bar starts at y 771, so it is below the fold and partly under the bar. There is also no visible error styling anywhere (no border, colour or inline text at the star row), so a sighted user sees the page jump and nothing else. Short text works: the text field has focus and the message sits right above Save, in view.
**Impact:** the most likely first-time mistake (forgetting the stars) gives no visible explanation, only a screen-reader announcement.
**Smallest fix:** show the message next to the first invalid field (above the star row for a missing rating), and add a visible `[aria-invalid="true"]` border style; keep the focus move.

#### R3-2 (Low) — An account switch is safe but silent
**Where:** `ProductReviews.tsx` / `use-own-review.ts` (the 401 path calls `refreshCustomer`, which swaps the tab to the other account).
**Trigger (reproduced):** the same two-tab account swap as above. After the refused submit, the header changes from "Sara" to "Omar", the form stays open but empty, and Sara's typed text is gone from view. No message says what happened. The text is held in the tab's memory for Sara only (per the design); I did not exercise Sara signing back in.
**Impact:** the person at the keyboard sees their page turn into someone else's with no explanation, which is confusing but harmless.
**Smallest fix:** show one status line when the displayed customer changes, for example "Your account changed. You are now signed in as Omar. Your draft was not sent."

#### R3-3 (Low) — A validation message stays after the field is fixed
**Where:** `ReviewForm.tsx` (`invalid` is only cleared by a successful submit; `onEdit` does not reset it).
**Trigger (reproduced):** submit short text, then type a valid text. `aria-invalid` is removed from the field, but the message is still on screen until the next Submit.
**Impact:** a stale message next to a now-valid field.
**Smallest fix:** clear `invalid` in the same edit handlers that already call `onEdit`.

### Smaller observations

4. **One-sided spacing (R2-1 trade-off).** `example. com`, `bit. ly/abc` and `shop .com` pass the screen after the fix. That is the cost of not joining sentence boundaries; note it in the screen's comment so it is a known limit rather than a surprise.
5. **`aria-invalid` on a `fieldset`.** The fieldset's role (group) does not list that attribute; a `role="radiogroup"` wrapper, or the attribute on the radios, would be better supported. I only checked the source, not a screen reader.

### Not covered / remaining

Physical phones and touch, spoken screen-reader output, 200% text zoom, a soft keyboard, real Redis and several backend instances, native Arabic wording, the Admin driven in the browser as the `admin` role (I used the Catalog Manager; the admin role was exercised over the API in Rounds 1 and 2), and the different-account draft scoping after a real expiry (unchanged since Round 2; the account-swap test above found no exposure).

### Baseline items kept separate

1. **Deals/Bundles build error.** `next build --webpack` still fails only with `.next/types/app/[locale]/deals/page.ts(14,13): error TS2344 … Property 'Bundles' is incompatible with index signature`; the file is untouched by these commits.
2. **Fresh-database bootstrap.** Unchanged: a brand-new database needed `db:migrate --skip-scripts` then the seed, because `initial-data-seed` stops with "No store exists" (see Round 2).


## Author response to Round3 —2026-10-26

Claude **APPROVE of92b1528** and all six Round2 resolutions are preserved above unchanged. Small follow-up application/tests: **272b07b** on codex/product-reviews. These follow-ups await his narrow recheck; the approval is not extended to unreviewed code.

- **R3-1 addressed:** missing-rating feedback uses a short keyed EN/AR message directly above the star row, beside the control that receives focus. Title/content validation stays beside the relevant first invalid field. Invalid controls receive a visible Ink outline/border without palette or layout changes. Only one validation alert renders. The rating group now has role=radiogroup, a labelled legend and supported aria-invalid/describedby; the native disabled fieldset and radio interaction remain. Other invalid fields do not point to a rating-only explanation. This also addresses observation5.
- **R3-2 addressed:** a direct signed-in A→B change shows a keyed status line: "Your account changed. Check the signed-in account before submitting a review." It appears before the writer (after the write action in the mobile order), includes no previous account identity/draft text, and makes no claim that an unrelated earlier submission failed. Initial sign-in and genuine expired-session→same-account recovery do not trigger it. Existing cookie assertion, auth refresh, account-keyed writer and draft scoping are unchanged.
- **R3-3 addressed:** rating/title/text edits clear the validation state and stale message while retaining the existing recovered-draft dismissal callback. The next attempted submission validates again; backend validation is unchanged.
- **Observation4 recorded:** an explicit shortcut comment documents the accepted one-sided-dot spacing limit and when to revisit it using reviewed spam examples. No screening behavior, schema, API or business-rule change.

### Verification

- Storefront full run: **59 suites /548 tests pass**, including six new cases for EN/AR missing-rating placement/semantics, validation clearing, account-swap notices and normal sign-in/re-authentication. Final focused form/interaction rerun after the last description/type correction: **2 suites /15 tests pass**.
- Storefront ESLint: **0 errors/warnings**. A test-only Props.role annotation error from the initial typecheck was corrected. Final production build compiles in10.5s and fails type validation **only on the unchanged Deals/Bundles route export**, with no new type errors. No ignoreBuildErrors, generated-file delivery or baseline change.
- No backend/native test rerun: the only backend edit is a comment; runtime/API/persistence are unchanged. Claude's Round3 independent309 backend tests/native3/3/server+Admin builds are recorded above, not claimed as rerun by GPT here.
- No browser recapture in this follow-up. Claude's Round3 actual browser focus/RTL/layout evidence approves92b1528;272b07b's new inline feedback and notice need his quick EN/AR desktop/mobile check. No additional detector/polish loop, dependencies, live migration, provider calls, preview process, push or merge.

### Claude follow-up prompt

Review **272b07b** against **7a26e39** on codex/product-reviews. Your Round3 approved92b1528; recheck only R3-1/2/3 and observations4/5 using the author response above. In EN/AR desktop/mobile320/390, submit with no stars and verify the short message/visible outline beside the focused radios and no cart-bar obstruction; fix text/rating and verify stale validation clears. Reproduce same-browserA/B account switching: no wrong-account publication/private-draft exposure and the status explains the change; normal sign-in and same-account expiry recovery should not show an account-swap message. Check radio semantics and relevant tests. The backend diff is a comment only: do not repeat a full backend/DB audit without a new concern. Keep the unchanged Deals build/bootstrap issues separate. Append your short recheck below; review only, no application edits/live migrations. Seif merges.

## Round 4 — Claude recheck of 272b07b (2026-10-26)

Scope: commit `272b07b` against `7a26e39`, rechecking R3-1, R3-2, R3-3 and observations 4 and 5, as asked. The later commit `e0d2395` only changes documentation. Review only: I changed no application code here and ran no live migration. I worked in a throwaway worktree at `272b07b` (removed) and a disposable database (`vi2_claude_rev4_20261026`, created and dropped by me, empty provider settings). The backend diff is one comment, so I did not repeat the backend or native audit.

**Verdict: APPROVE. R3-1, R3-2 and R3-3 are resolved and observations 4 and 5 are closed.** I found two small display issues (R4-1, R4-2), neither blocking. Merge approval is Seif's.

### What I ran versus what was reported

| Check | Mine | Reported |
|---|---|---|
| Storefront unit, full run | **59 suites / 548 pass** | 59 / 548 |
| Backend, the review module's tests only (the diff is a comment) | **34 pass** | not rerun |
| `tsc --noEmit` backend and storefront; ESLint `--quiet` both | clean | clean |
| `next build --webpack` (source as committed, no `ignoreBuildErrors`) | compiles, then fails only on the Deals/Bundles export | same |
| Real browser, English and Arabic, desktop and phone widths, real backend, storefront production build | **run by me** (below) | not run |
| Physical phones, screen-reader speech, 200% zoom, real Redis | not run | not run |

As before, the browser build used `typescript.ignoreBuildErrors` in my scratch copy only, to get past the known Deals error.

### Results

| Item | Result |
|---|---|
| **R3-1** missing-star message | **Resolved.** Submitting an empty form puts the short message "Choose 1–5 stars." (Arabic: "اختر من نجمة إلى خمس نجوم.") directly above the star row, 12 px above it, inside the viewport; focus is on the first star; the star group has a visible outline. On a 390 px phone the message is at y 392–417 with the stars ending at 478 and the cart bar starting at 771, so nothing is hidden. On a 320 px Arabic phone the message is at y 290–318 (one line, no overflow) with the bar at 565. A short text field gets the longer message right under the text area and the focused field, in view at 1024 and 390 px; at 320×640 see R4-1. Only one alert renders at a time. |
| **R3-3** stale message | **Resolved.** After the empty-form error, choosing a star removes the message and the outlines; after a short-text error, typing in the field removes the message and `aria-invalid`. The next Submit validates again. |
| **R3-2** account switch | **Resolved.** With a second account signed in from another tab and the first tab still showing the first account, pressing Submit publishes nothing (the second account's own review stays `null`; the list is empty), the header changes to the second account, the first account's typed text is nowhere on the page, and a status line appears: "Your account changed. Check the signed-in account before submitting a review." It names no account and includes no draft text. On a phone it sits after the write button in the stacked order (y 1502 between the button at 1430 and the list at 1578), in view. It does **not** appear after a normal sign-in, and it does not appear after a genuine expiry followed by signing back in as the same account: the expired message showed first, the notice did not, and the draft was restored with the recovery banner (client-side navigation, so the in-tab memory was kept). |
| Obs. 4 shortcut comment | **Resolved.** The one-line `shortcut:` comment about one-sided dot spacing is in `screen.ts`. |
| Obs. 5 radio semantics | **Resolved.** The star group is `role="radiogroup"`, labelled by its legend ("Your rating" / "تقييمك بالنجوم"), with `aria-invalid` and `aria-describedby` set only when the rating is missing; the text field's `aria-describedby` no longer points at a rating-only message. |

### New small findings

#### R4-1 (Low) — On a 320×640 phone the focused text field can end up under the sticky header
**Where:** `Reviews.module.css:41` (`scroll-margin-block`) and the focus step in `ReviewForm.tsx` `submit`.
**Trigger (reproduced in English and Arabic):** at 320×640, open the form, pick a star, type "short", press Submit. The message is in view (y 282–359) but the focused text area sits at y 11–165 while the sticky header ends at y 75, so its first lines are hidden. The same steps at 390×844 are fine (text area at y 139–293, header at 75).
**Impact:** on the smallest phones the user cannot see the start of the text they must lengthen.
**Smallest fix:** after focusing, scroll the field into view below the header (for example `scrollIntoView({ block: "center" })` or a larger `scroll-margin-top` for this field).

#### R4-2 (Low) — On desktop the account-change status can be above the visible area
**Where:** `ProductReviews.tsx` (the notice is rendered between the section heading and the form).
**Trigger (reproduced):** with the form open and the page scrolled to the Submit button, the swap happens: the header changes to the other account and a blank form remains, but the notice is at y −112 to −86 (above the viewport) and nothing scrolls it into view. Screen readers announce it (it is `role="status"`); sighted users may only notice the changed name. On a phone the notice was in view.
**Smallest fix:** show the notice at the top of the form instead, or scroll or move focus to it when it first appears.

### Remaining / not covered

Physical phones and touch, spoken screen-reader output, 200% text zoom, real Redis, native Arabic wording, the Admin as the `admin` role in the browser (unchanged in this commit). Two earlier observations still stand as notes rather than defects: the one-sided spacing limit of the link screen, and the dev-mode streaming stall I saw in Round 2.

### Baseline items kept separate

Unchanged: the Deals/Bundles build error (`next build --webpack` fails only on `Property 'Bundles' is incompatible with index signature`) and the fresh-database bootstrap stop in `initial-data-seed` ("No store exists", worked around with `db:migrate --skip-scripts`).


## Author response to Round4 —2026-10-26

Claude's **APPROVE of272b07b** is preserved above unchanged; R3-1/2/3 and observations4/5 are closed. The two nonblocking visibility follow-ups are addressed in **c638ff9** on codex/product-reviews; this new candidate needs only a targeted browser recheck.

- **R4-1:** focus the first invalid control with preventScroll, then explicitly scroll it to the viewport center using instant behavior. Existing logical scroll margins remain active. This avoids browser-default focus scrolling that placed the textarea under the sticky header on320x640, without introducing animated motion or changing form validation/labels/draft behavior.
- **R4-2:** the account-change status is focusable and explicitly centered when the replacement account's own-review state finishes loading. The parent effect runs after the replacement form's mount/focus, preventing its initial radio focus from leaving the notice above the desktop viewport. This happens on account transition/readiness changes, not ordinary typing or validation. Copy, privacy, cookie assertion and account-scoped drafts are unchanged.
- Focus/scroll tests cover short feedback in EN/AR and account-notice visibility ordering before/after replacement readiness. They assert platform calls, not actual browser geometry.

Verification: **59 storefront suites /549 tests pass** in one full run; focused form/interaction **2 suites /16 tests pass**; ESLint clean. Production webpack compiles10.5s, then type validation reports only the unchanged baseline Deals/Bundles export error. No ignoreBuildErrors or generated next-env rewrite delivered. Backend/runtime/schema/source are untouched in this follow-up; no DB/native/backend rebuild, browser recapture, detector loop, preview server, live migration, provider call, dependency, push or merge.

### Claude targeted recheck prompt

Recheck **c638ff9** against **e0d2395** on codex/product-reviews. Your Round4 approved272b07b; only R4-1/R4-2 need confirmation. In EN/AR320x640, short-text Submit should center the focused textarea clear of sticky header/cart while its error stays reachable. On desktop, repeat same-browser accountA/B switching while scrolled to Submit: refusal/private-draft protection stays intact, and after the replacement writer loads the account-change status receives focus and becomes visible. Check that normal typing/validation does not repeatedly steal focus. Append a short result here; review only, no application edits, full backend re-audit or live migration. Keep known Deals/build/bootstrap limits separate. Seif merges.

## Round 5 — Claude targeted recheck of c638ff9 (2026-10-26)

Scope: R4-1 and R4-2 only, on `c638ff9` against `e0d2395`. The later commit `2a86603` is documentation only. Review only: no application edits, no live migration. I worked in a throwaway worktree (removed) and a disposable database (`vi2_claude_rev5_20261026`, created and dropped by me, empty provider settings), with the storefront production build; as before, `typescript.ignoreBuildErrors` was switched on in my scratch copy only to get past the known Deals error.

**Verdict: APPROVE. R4-1 and R4-2 are resolved.** I found one cosmetic edge (R5-1) at the smallest phone size, not blocking. Merge approval is Seif's.

### What I ran

| Check | Result |
|---|---|
| Storefront unit, full run | **59 suites / 549 pass** (reported 59 / 549) |
| `tsc --noEmit` and ESLint `--quiet`, storefront | clean |
| `next build --webpack` (source as committed) | compiles, then fails only on the Deals/Bundles export (unchanged baseline) |
| Real browser: 320×640 English and Arabic; desktop account A/B switch | **run by me** (below) |

### R4-1 — text field at 320×640: resolved

Same steps as Round 4 (open the form, choose a star, type a too-short text, press Submit), in a real browser:

| | Header bottom | Cart bar top | Text area (top–bottom) | Message |
|---|---|---|---|---|
| English before (`272b07b`) | 75 | 567 | 11–165 (first lines under the header) | in view |
| **English now** | 75 | 567 | **229–383** (clear of both) | 499–576 |
| **Arabic now** | 75 | 565 | **223–389** (clear of both) | 484–570 |

The text area is centered and fully visible in both languages, focus stays in it, and the page has no horizontal overflow. The missing-star case still works at 320×640 (message at y 290–315, stars at 327–375, both clear of the header and the bar, focus on the first star). At 390×844 (checked in Round 4) the layout was already fine.

#### R5-1 (Low, cosmetic) — the last line of the short-text message touches the cart bar at 320×640
**Trigger (reproduced):** the same short-text steps at 320×640. The three-line message ends 6 px (English, last line 554–573 against a bar starting at 567) and 5 px (Arabic, last line 540–570 against 565) below the top of the opaque cart bar, so the bottom of the last line is clipped. The words are still readable and the Submit button is reachable by scrolling. It follows from centering the text area on a very short screen.
**Smallest fix (optional):** center the whole message-plus-field group, or add a few pixels of bottom scroll margin on the alert.

### R4-2 — account-change notice on desktop: resolved

Same-browser switch with the form open and the page scrolled to Submit: the first account's tab had a draft typed, a second tab signed in as the other account (shared cookie), then Submit was pressed in the first tab.

- Nothing was written under either account: the second account's own review state stayed empty, the list stayed empty, the header changed to the second account, and the first account's text appears nowhere on the page (the replacement form is blank).
- The notice "Your account changed. Check the signed-in account before submitting a review." now sits at y 358–383 in a 768 px viewport, below the sticky header (ending at 73), directly above the new blank form, and it holds keyboard focus.
- No focus theft: I then clicked into the title field and typed; focus stayed in the title field, the notice was not re-focused, and the text was kept. Validation and typing behaved as in Round 4 (the focus step only runs on the account change).

The unchanged privacy checks from Round 4 still hold (no account name in the notice, the cookie assertion refuses the write before Medusa is called).

### Not re-run / unchanged

Not repeated here: the same-account expiry recovery and the phone-width notice order (unchanged code paths, covered in Round 4), the full backend and native audits (no backend change), physical phones, screen-reader speech, 200% zoom, real Redis.

### Baseline items kept separate

Unchanged: the Deals/Bundles build error and the fresh-database bootstrap stop in `initial-data-seed` ("No store exists", worked around with `db:migrate --skip-scripts`).


## Author closure after Round5 —2026-10-26

Claude's **APPROVE ofc638ff9** above is preserved unchanged. Both requested geometry checks R4-1/R4-2 pass in his running browser; no blocking findings remain. The reviewed application has not changed. This turn only imports the final report and updates the workboard/finish status; no unnecessary test/build reruns or additional polish.

**R5-1 is retained as an optional cosmetic follow-up:** at320x640 the last line of the short-text validation message overlaps the cart bar by5–6px. The textarea is fully visible, the feedback remains readable and Submit is reachable by scrolling per Claude's evidence. No fix or owner acceptance of that edge is claimed; it does not overturn his approval.

Feature review is closed for candidatec638ff9. Publication/merge/live migration remain Seif-controlled and have not happened. The separate Deals/Bundles build failure and fresh-database initial-seed issue remain unchanged; do not describe the branch as having a passing production storefront build. Previous privacy-retention, real Redis/multiple-instance and physical/accessibility/manual limits remain recorded. No further reviewer prompt is required for this documentation-only closure.
