# Claude independent review: security remediation (codex/security-remediation)

Reviewer: Claude. Date: 2026-10-31. Review only. I did not change application code, merge, push or deploy. My checkout is a separate worktree (`vi2-claude-security`, branch `claude/security-remediation-review`) cut from the application commit. The author's checkout was not touched.

**Reviewed application commit: `3a45e58` (range `2d637bd..3a45e58`; `0113426` only edits the workboard).**

## Verdict: REQUEST CHANGES

Most of the 18 records are genuinely fixed and my own native checks confirmed them. Three things must be fixed before merge: revoked tokens still work on the native MFA and verification routes (record 15 is only partly fixed), the MFA login path now produces unusable tokens, and every admin image upload is now capped at 1 MB. One existing unit suite also no longer loads. Each fix is small.

## Code blockers (fix before merge)

### B1. Revoked or stale tokens still work on native `/auth/mfa/*` and `/auth/verification/*` (High if MFA is enabled, otherwise Medium)
- **Where:** `apps/backend/src/api/middlewares.ts:61-65` lists the routes that get `activeSecuritySession` (`/store/*`, `/auth/token/refresh`, `/auth/logout`, `/auth/session`, and `/admin/*` further down). Native `/auth/mfa/factors`, `/auth/mfa/factors/:id/verify`, `/auth/mfa/recovery-codes` and `/auth/verification/request` authenticate with `authenticate("*", ["session","bearer"], { allowUnregistered: true })` and are not covered.
- **Scenario:** an attacker holds a stolen token. The owner logs out or resets the password to evict them. The attacker's token is rejected on store and admin routes, but can still call the MFA routes.
- **Evidence (disposable fixtures, dummy `AUTH_MFA_ENCRYPTION_KEY`, the owner's `.env` carries a key of that name):** after `/auth/logout`, `/store/customers/me` returned 401, but `POST /auth/mfa/factors {provider:"totp"}` returned 200 with a secret, I computed the TOTP code and `POST /auth/mfa/factors/:id/verify` returned 200 (factor `enabled`). The real owner's next password login then returned `mfa_required`, and the owner's token was refused by the store (401): the owner is locked out. Without the key, MFA enrollment answers 400 ("MFA encryption key is required"), so the exposure depends on that setting. A revoked token also got 201 from `POST /auth/verification/request` for arbitrary `entity_id` values, and 200 from `GET /auth/mfa/factors`, after logout, lineage logout and password reset.
- **Impact:** the remediation's claim that every authenticated request validates the session binding is not true for these routes, so record 15 ("tokens survive logout/recovery") is only partly closed. It gives a logged-out attacker persistence and a way to lock the owner out.
- **Smallest fix:** add the same pair used elsewhere, `authenticate("*", ["session","bearer"], { allowUnregistered: true, requireMfa: false })` plus `activeSecuritySession`, for `/auth/mfa/*` and `/auth/verification/*` (two route entries), with a native test that a logged-out token gets 401 on `GET /auth/mfa/factors`. If the owner does not intend to use MFA, blocking those two prefixes is smaller still. See B2 before choosing.

### B2. MFA login completes with an unusable token (Medium; regression for any account that uses MFA)
- **Where:** native `POST /auth/mfa/challenges/:id/verify` (not overridden) builds a fresh token with `generateJwtTokenForAuthIdentity`; it carries no `vi2_session_id` or credential claim.
- **Evidence:** a customer with an enabled factor logged in (`mfa_required`), verified the challenge (200, token returned), and `/store/customers/me` with that token returned 401.
- **Impact:** with the new binding, an MFA-enabled account (staff included) can no longer finish signing in. If nobody uses MFA today, this is dormant; it breaks as soon as someone enables it.
- **Smallest fix:** override that route like the others with `sessionBoundResponse`, passing the first-factor token's credential claim as the expected credential, or disable MFA explicitly and say so in the handoff.

### B3. Every admin image upload is now limited to 1 MB (Medium; functional regression)
- **Where:** `apps/backend/src/api/admin/uploads/route.ts:12` reuses `logoImage`, whose cap is the brand-logo limit `MAX_LOGO_BYTES = 1 MiB` (`apps/backend/src/lib/brand-logo.ts:8`).
- **Evidence:** in a native run, a PNG-header file of 1.5 MB returned 400 "Upload PNG, JPEG or WebP images up to 1 MB." (a 0.9 MB JPEG returned 200). `/admin/uploads` is the dashboard's product and category image path.
- **Impact:** staff cannot upload ordinary phone or camera product photos (typically 2 to 8 MB), and the error message talks about logos.
- **Smallest fix:** keep the magic-byte check but give the generic upload route its own larger cap (for example 10 MB) and message; leave 1 MB for brand logos.

### B4. An existing unit suite no longer loads (Low-Medium; test breakage)
- **Where:** `apps/backend/src/api/store/auth/register/__tests__/registration.unit.spec.ts` (mock at line 1) against the route's new import chain (`register/route.ts:2` to `lib/security-session` to `modules/account-security/models/security-session.ts:3`).
- **Evidence:** the full backend unit run gives 47 of 48 suites passing (373 tests); this suite fails to run with `TypeError: Cannot read properties of undefined (reading 'define')`. It is not in the author's 16-suite focused list, so the reported 166 tests miss it.
- **Impact:** `npm test` is red, and the changed registration route (the new `bindSecuritySession` call) has no working unit test.
- **Smallest fix:** extend the partial `@medusajs/framework/utils` mock in that spec (or mock `lib/security-session`) so the module loads, and assert the returned token is the bound one.

## Lower-priority findings (not blockers)

- **L1 (Low): sign-out fails closed during a backend outage.** `apps/storefront/src/app/api/auth/logout/route.ts` returns 503 and keeps the cookie if `/auth/logout` fails with anything except 401. The shopper sees an error, but on a shared computer they stay signed in. Acceptable as designed; consider clearing the cookie and reporting the revoke failure.
- **L2 (Low): expired-session cleanup falls behind at high login volume.** `apps/backend/src/jobs/remove-expired-security-sessions.ts:7` deletes at most 1,000 rows per hour; above roughly 24,000 logins a day the table grows. Fine at expected volume; raise the batch or loop until empty.
- **L3 (Low, deployment): registration limit counts one IPv6 address, not a /64** (`apps/backend/src/api/registration-rate-limit.ts:17-18`). A visitor with an IPv6 range can rotate addresses past 10 per 15 minutes. The edge (Cloudflare) limit should cover this.
- **L4 (Info): polyglot upload.** A file with PNG magic bytes followed by HTML is accepted, stored as `.png` and served as `image/png` without `X-Content-Type-Options: nosniff`. Browsers will not treat it as HTML; adding nosniff at the static-file edge is cheap hardening.

## Disposition of the 18 records (original verdicts preserved: all stay "needs validation" in the audit; these are my remediation dispositions)

| # | Record | Disposition | Basis |
|---|---|---|---|
| 1 | Login limiter bypass | Fixed | Guard on the native actor route; unknown and encoded actors return 400; one budget shared across actors. Native suite and my probes (provider and actor spellings) confirm. |
| 2 | Email links survive recovery | Fixed | Credential snapshot in the link, checked under the credential lock; native reset then stale-link test passes. |
| 3 | Unbounded registration | Fixed in code; deployment gate | 10 per 15 min per visitor on custom and staff routes (429 on attempt 11, shared). Needs the trusted-IP header (see L3). |
| 4 | Preclaimed email keeps access after recovery | Mostly fixed; reopened by B1 | Store and admin tokens die on reset. The MFA enrollment route (B1) lets an old token persist. |
| 5 | Open redirect | Fixed | Protocol-relative result rejected; storefront tests pass. Not tested in a browser. |
| 6 | Manager path mismatch | Fixed | `requestPath` rejects `#`, `%`, backslash and control characters; manager paths lower-cased. Admin-access suite passes. |
| 7 | Admin CSRF | Fixed; deployment check | Cookie-backed admin writes need a trusted Origin (403 for a foreign origin, success for same origin in my run of the author's suite). |
| 8 | Active uploads | Fixed, with regression B3 | HTML and presigned bypass rejected; raster only, served as PNG. Historical files untouched. |
| 9 | Draft allocation | Fixed | Draft lines rejected before reservation; checkout suite passes. |
| 10 | Return then cancel double credit | Fixed | My probes: normal plus damaged units over the shipped count rejected (stock unchanged); damaged units use the budget without restocking; a confirmed receipt cannot be cancelled or re-confirmed. Author's native tests (duplicate confirmation, three cancellation doors, injected inventory failure and retry, mixed shipped/unshipped) pass in my isolated run. |
| 11 | Parallel customer creation | Fixed | Native `POST /store/customers` and customer emailpass register blocked; staff invitation flow still passes. |
| 12 | Unauthenticated returns | Fixed | Guest 401, other owner 403, `receive_now` and client shipping price 403. |
| 13 | Order PII exposure | Fixed | Receipt projection only, even with `fields=email,*shipping_address,*items`. |
| 14 | Session fixation | Fixed | Planted cookie rotates; old cookie 401, new cookie works. |
| 15 | Tokens survive logout/recovery | **Partly fixed** | Store, admin, refresh and session routes revoke correctly (logout, refresh lineage, reset, password change all verified). Open on `/auth/mfa/*` and `/auth/verification/*` (B1); MFA login breaks (B2). |
| 16 | Cart owner bypass | Fixed | Case and encoded variants refused; routed id used. |
| 17 | Deleted customer keeps login | Fixed | Legacy marker migrated under lock; old session 401; same email can register again. |
| 18 | Redis key and body growth | Fixed for the store cache | Only query-free catalog paths and finite language variants are cached; 128 KiB body cap. Redis memory sizing remains a deployment item. |

## Checks I performed

Host (no network or database, mocks only, as allowed): full backend unit suite 47 of 48 suites, 373 tests (B4); full storefront suite 63 suites, 585 tests pass; backend and storefront `tsc --noEmit` clean; eslint clean on all changed source files in both apps.

Native HTTP in the documented isolation (toolchain image `vi2-security-toolchain:ready`, digest `c4f01f76eb7b` matching the handoff; Postgres 16.15 container with no network or ports, read-only root, memory and CPU limits; Node container on the same isolated namespace; `env -i` with dummy secrets; Resend settings absent; no provider contacted):
- The author's six suites: `security-boundaries` and `security-stock` (11 tests) plus `admin-access`, `account`, `checkout`, `sign-in` (55 tests): 66 of 66 pass, reproducing the reported count.
- Seven further existing suites pass (catalog-sorting, product-reviews, audit-hardening's index-dependent tests, egypt-store, catalog, product-eda, product-search).
- My own throwaway probe specs (kept only in the temporary copy, not on the branch): token lifecycle across logout, refresh lineage and reset on every native auth surface; MFA enrollment and login with a revoked token; upload size and polyglot; damaged, mixed and repeat-return budgets; return cancel after receipt.
- Source reading of every changed non-test file and the native Medusa routes they sit beside.

## Not performed / uncertain

- Four existing suites did not finish in my sweep (abandoned-carts, merchandising, quick-variant, store-cache): the shared Node process ran out of memory on my harness, so they are unverified, not failing. Run them separately.
- No real Redis, multi-process lock-loss test, browser or proxy test, no production build, no deployed endpoint, no real email or provider calls.
- Concurrent receipts for two different returns cannot be created natively (Medusa allows one active order change per order), so I could not test two-return concurrency beyond the serialization the author's test shows.
- Whether the target environment sets `AUTH_MFA_ENCRYPTION_KEY` decides whether B1 is High or Medium; I only know the owner's local `.env` has a key of that name (value not read).
- The roughly 115 hardening observations were not reviewed, as instructed.

## Deployment requirements (not code blockers)

1. Run the `security_session` migration before serving this code; expect every user to sign in again and old email-change links to be reissued.
2. Set `TRUSTED_PROXY_CLIENT_IP_HEADER` (`cf-connecting-ip` or `x-real-ip`) only behind a proxy that strips visitor copies and an origin reachable only through it. Without it, production registration, including staff invitation registration, is refused.
3. Admin CSRF: set `ADMIN_CORS` and `MEDUSA_BACKEND_URL` to the real https origins (behind a TLS-terminating proxy the same-origin fallback uses the request protocol).
4. Production session store for the admin cookie (session regeneration), shared Redis locking, and Redis memory and eviction sizing.
5. Review historical HTML or SVG files already in storage; add an edge rate limit including IPv6 ranges (L3).
6. Decide whether MFA is in use (B1/B2) and set or unset its encryption key accordingly.

## Cleanup

Task containers were removed and the disposable Postgres container is stopped and removed after the final run. My temporary source copy, runner files and logs are deleted. The author's files are unchanged.
