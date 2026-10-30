# Security report remediation — 2026-10-30

Owner: GPT. Branch: `codex/security-remediation`. Base: `full-stack` `2d637bd`.
Source audit: `C:/Users/Seif Waleed/security-audit-skill/vi2/run-1/REPORT.md`, audited `d039f3d`.

## Current disposition

All 18 retained records have scoped implementation changes and regression coverage. The stock double-credit path was reproduced against native Medusa with a disposable PostgreSQL database, then blocked by the fix while preserving manager receipt. Native account, authorization, upload, checkout and recovery checks have also passed. Independent Claude review and owner-controlled release checks remain pending. This document does not claim deployment or a completed independent re-audit.

The original audit files and their NEEDS-VALIDATION verdicts are unchanged. Its approximately 115 unverified hardening observations are outside this remediation scope and must not be represented as confirmed vulnerabilities or fixed findings.

## Owner decisions

- Guest links expose receipts only; staff handle guest returns.
- Logout revokes the current device and its refresh chain. Password changes/resets invalidate all sessions using the old credential.
- Registration allows 10 attempts per 15 minutes per visitor, with explicit trusted-proxy configuration in production.
- Managers retain return receipt. Receipt requires units to have been marked shipped, and each shipped unit can consume the return budget only once.
- Seif allowed focused local unit tests with mocks/dummy data, then approved isolated Node 22 test-tool downloads. No additional agents were launched.

## Record-by-record implementation and evidence

| # | Audit record | Change and evidence | Remaining release check |
|---|---|---|---|
| 1 | Login limiter bypass | Guard native actor route; reject unknown actors/escaped paths; share credential budget across customer/staff. Unit variants and native wrong-password/actor/encoding checks pass. | Proxy/raw-request behavior in deployed topology. |
| 2 | Email links survive recovery | Link carries credential snapshot, checked under credential lock. Unit recovery/compensation checks and native reset followed by stale email-link rejection pass. | Delivery configuration; distributed-lock deployment. |
| 3 | Unbounded registration | Shared 10/900-second visitor budget on custom signup/staff registration; native customer registration closed. Native attempt 11 and staff sharing the budget return 429. | Trusted visitor IP, proxy stripping, direct-origin restriction and edge limits. |
| 4 | Preclaimed email retains access after recovery | Device sessions compare their original credential snapshot against current native password state. Native reset invalidates prior tokens and refreshes; a fresh login works. | Real mailbox/recovery delivery. Email verification was not introduced. |
| 5 | Open redirect | Reject protocol-relative path after URL normalization. Focused malicious redirect unit cases pass. | Real browser/proxy navigation smoke test. |
| 6 | Manager path mismatch | Reject fragment/backslash/encoded/control paths and normalize permission route segments. Unit path cases and native manager authorization suite pass. | Proxy URL-normalization variations. |
| 7 | Admin CSRF | Require exact configured/backend Origin for cookie-backed admin mutations; preserve bearer integrations. Native forged cookie mutation returns 403; same-origin mutation succeeds. | Deployed Admin origins/CORS. |
| 8 | Active uploads | Check raster magic bytes, canonical MIME/filename, 1 MB cap; disable presigned bypass. Native HTML and valid presigned input rejected; misnamed PNG stored/served as PNG. | Product-image UI/storage configuration; historical active uploads. Native parser buffers before the size check. |
| 9 | Draft allocation | Reject draft-order lines before reservation workflow; focused draft/allocation and native checkout suites pass. | Deployment smoke test of draft conversion/deletion. |
| 10 | Return/cancel double credit | Native order lock serializes return edits/confirmation. Shipped-minus-received/damaged budget checked before native inventory workflow. Baseline inflation reproduced; repaired receipt, duplicate confirmation, all three cancellation doors and failed-write/retry checks pass. | Independent lifecycle review and production distributed locking. |
| 11 | Parallel customer creation | Close native customer create/customer emailpass register; retain normalized custom signup and native staff invitation flow. Native create doors blocked; signup and staff invite/refresh tests pass. | Deployed invitation email delivery. |
| 12 | Unauthenticated returns | Require authenticated order owner; reject client receipt/shipping-price override; guest returns staff-only. Unit cases and native guest/other-owner/client-receipt rejection pass. | Customer/staff UI smoke test. |
| 13 | Order PII exposure | Fixed workflow fields plus final receipt projection remove contact/address/item metadata even if requested. Native PII field-request probe and account suite pass. | Guest receipt/customer-history browser smoke test. |
| 14 | Session fixation | Regenerate cookie session before native login assignment. Native planted session rotates; old cookie fails and new staff cookie works. | Production session-store configuration. |
| 15 | Tokens survive logout/recovery | Native provider supplies verified credential snapshot; durable device session bound to native token; refresh retains device; every authenticated store/admin request validates binding. Native logout/healthy refresh/password reset/password change tests pass. | Production migration, shared database/lock availability and rollout re-login. |
| 16 | Cart owner bypass | Reject encoded paths, classify collections case-insensitively, use routed ID and repeat owner checks. Unit cart/payment-collection cases and native cart case/encoding checks pass. | Deployed proxy path handling. |
| 17 | Deleted customer retains login | Server-only replay marker; migrate legacy actor metadata under lock before deletion; validate current actor link. Native legacy-marker deletion invalidates old session and allows same-email registration again. | Rollout smoke test; shared staff-link unit coverage remains important. |
| 18 | Redis cardinality/body growth | Admit only query-free canonical catalog paths/finite language variants, normalize publishable keys and cap body at 128 KiB. Focused cache tests pass. | Actual Redis memory/eviction, capacity and load/edge limits. |

## Authentication rollout

Medusa still hashes/verifies passwords and generates tokens. The public native emailpass provider is extended to capture the exact credential it verified/wrote and attach an HMAC fingerprint to its sanitized result. No raw password hash is added to actor metadata or the new session table. Token adapters bind native tokens to a durable device record; refresh preserves the original device and credential snapshot.

The new `account-security` module's `security_session` migration was applied successfully by native Medusa in the disposable PostgreSQL fixture; real login, refresh, revocation and deletion queries passed. It has not been applied to any development/shared/production database. Expired rows are cleaned hourly in bounded batches of 1,000.

Deployment requires running the migration before serving the new code. Existing bearer/cookie sessions without a device record require sign-in again; old email-change links without the credential claim require reissue. Native staff invitation/actorless registration-token refresh passed the sign-in HTTP suite. A successful storefront password change expires its old auth cookie and updates account state, matching backend revocation; a failed change retains the cookie. Password reset does not indiscriminately clear another currently signed-in account's cookie.

`TRUSTED_PROXY_CLIENT_IP_HEADER` accepts only `cf-connecting-ip` or `x-real-ip`. Production signup fails closed without explicit configuration. Configure it only after the proxy strips incoming copies and the origin accepts traffic exclusively through that proxy. Development uses the socket address and ignores forged forwarded headers.

Query/filter/pagination and unsupported-language catalog requests now bypass the application cache. This closes arbitrary cache-key amplification and may increase database reads. Redis capacity and deliberate edge limits remain owner deployment checks. Historical HTML/SVG uploads are not deleted automatically; the storage owner must review existing active-content files.

## Stock lifecycle result

The regression fixture uses real native checkout/fulfillment/returns with a dummy manager, one stock location and 10 units. On checkpoint `c26cf15`, an unshipped fulfillment could be received as a return, then cancelled, creating an extra unit:

```json
{"receipt_status":200,"before":10,"fulfilled":9,"after_receipt":10,"after_cancel":11}
```

The same native sequence with the fix rejects receipt before shipment; discarding that pending receipt and cancelling the unshipped fulfillment restores exactly the original quantity:

```json
{"receipt_status":400,"before":10,"fulfilled":9,"after_receipt":9,"after_cancel":10}
```

`src/api/return-receipt-access.ts` wraps every mutation to a return's pending actions, including confirmation, under one native distributed order lock. Confirmation checks all normal/damaged receipt actions against shipped minus already received/damaged quantities. Only then does it await the native inventory workflow. Managers retain normal shipped returns.

The native stock suite also checks concurrent duplicate confirmation, cancellation through `/admin/orders/:id/fulfillments/:id/cancel`, `/admin/fulfillments/:id/cancel` and `/admin/orders/:id/cancel`, and injected inventory-write failure followed by rollback and one successful retry. A mixed shipped/unshipped same-line regression is included. The earlier arithmetic-only probe remains historical supporting evidence; the result above comes from actual HTTP/database/inventory effects.

## Validation

- Backend: 16 focused unit suites / 166 tests pass.
- Storefront: 4 focused auth/session suites / 90 tests pass.
- Native Medusa HTTP/PostgreSQL: 66 unique tests across 6 suites pass, run in bounded batches; the final stock suite passes all 4 cases, including mixed shipped/unshipped quantities.
- Backend and storefront TypeScript checks pass. Changed application-source lint passes for both applications; backend unit tests are excluded by the existing lint configuration.
- The original audit files remain untouched. No shared/live database migration, provider call, push, merge or deployment occurred.

Native test files: existing `admin-access.spec.ts`, `account.spec.ts`, `checkout.spec.ts`, `sign-in.spec.ts`; new `security-boundaries.spec.ts` and `security-stock.spec.ts` under `apps/backend/integration-tests/http/`. The sign-in fixture now clears the new registration counter between tests, alongside its existing login/reset counter cleanup.

Reproduce focused backend unit checks from `apps/backend`:

```powershell
node ../../node_modules/jest/bin/jest.js --runInBand --cacheDirectory .cache/security-jest --runTestsByPath src/api/__tests__/auth-session-access.unit.spec.ts src/api/__tests__/security-remediation.unit.spec.ts src/api/__tests__/admin-access.unit.spec.ts src/api/__tests__/critical-locks.unit.spec.ts src/api/__tests__/sign-in.unit.spec.ts src/api/__tests__/registration-rate-limit.unit.spec.ts src/lib/__tests__/login-attempts.unit.spec.ts src/lib/__tests__/order-allocation.unit.spec.ts src/lib/__tests__/security-session.unit.spec.ts src/lib/__tests__/email-change-marker.unit.spec.ts src/lib/__tests__/store-cache.unit.spec.ts src/lib/__tests__/email-change.unit.spec.ts src/lib/__tests__/change-password.unit.spec.ts src/lib/__tests__/manager-access.unit.spec.ts src/modules/secure-emailpass/__tests__/service.unit.spec.ts src/api/__tests__/return-receipt-access.unit.spec.ts
```

Storefront command from `apps/storefront`:

```powershell
node ../../node_modules/jest/bin/jest.js --config ./jest.config.cjs --testMatch '**/__tests__/**/*.test.ts' --runInBand --cacheDirectory .cache/security-jest --runTestsByPath src/lib/__tests__/auth-routes.test.ts src/app/api/__tests__/session.test.ts src/lib/__tests__/password-routes.test.ts src/lib/__tests__/customer-session.test.ts
```

### Native isolation and reproduction

User-approved preparation downloaded Node 22 and Linux copies of dependencies from the existing unchanged lockfile using `npm ci --ignore-scripts --no-audit --no-fund` in a manifest-only image build. Target source and scripts were absent from the networked preparation. Application manifests/lockfile and host `node_modules` were not changed. The read-only toolchain adds empty migration directories where native Medusa otherwise tries to create them. No installed library implementation was changed.

Toolchain image: `vi2-security-toolchain:ready`, manifest digest `sha256:c4f01f76eb7ba3f2548d64701348ef3087e487013218801c34efc573c351709e` (Node 22, installed Medusa 2.21). Target source was copied explicitly from package/config files, backend `src` and integration tests; no `.env`, host home or host dependencies were included.

Disposable PostgreSQL 16.15 runs with no network/ports, read-only root, postgres user, no capabilities, no-new-privileges, 1 CPU, 768 MiB memory, 256 processes, and 1 GiB tmpfs data plus bounded socket/tmp filesystems. The Node container shares only this isolated loopback namespace, with read-only target/toolchain/root, user 1000, no capabilities, no-new-privileges, 2 CPUs, 3 GiB memory, 256 processes, 4,096 open files, 256 MiB file limit, 1 GiB scratch tmpfs and a 900-second timeout. Target source is copied to scratch before execution. There are no external connections, host ports, Docker socket, shared databases or real provider credentials. Container logs are capped at 10 MiB.

The target process starts with `env -i` and only these variables: `PATH=/usr/local/bin:/usr/bin:/bin`, scratch-local `HOME`, `TMPDIR`, `XDG_CACHE_HOME`; `NODE_ENV=test`, `CI=true`, disabled Medusa/Next telemetry; `NODE_OPTIONS=--experimental-vm-modules`; `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USERNAME=postgres`, `DB_PASSWORD=security_dummy_only`, matching local `DATABASE_URL`; dummy `JWT_SECRET=security-fixture-jwt-secret-00000001` and `COOKIE_SECRET=security-fixture-cookie-secret-00001`; store/admin/auth/backend URLs `http://127.0.0.1` and storefront `http://127.0.0.1:3000`.

Inside this runner, from the scratch backend directory:

```sh
node /opt/toolchain/node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --cacheDirectory /scratch/cache/jest --runTestsByPath integration-tests/http/admin-access.spec.ts integration-tests/http/account.spec.ts integration-tests/http/checkout.spec.ts integration-tests/http/sign-in.spec.ts integration-tests/http/security-boundaries.spec.ts integration-tests/http/security-stock.spec.ts
```

Suites were run in bounded batches against the same isolated PostgreSQL container; native test utilities recreate disposable databases between cases. Baseline stock reproduction intentionally fails the new regression assertion; repaired suites must pass. Initial sign-in fixture interference and malformed probe input were corrected before the final passing runs. Expected injected-failure logs and unrelated unseeded native product-search-index subscriber logs are present; neither is presented as a production check. No full application build, browser, real Redis multi-instance/lease-failure test, live provider or deployed endpoint test was performed.

Cleanup: all task Node containers exited and were removed automatically. The disposable PostgreSQL container was stopped and removed; its tmpfs databases were discarded. An exact-name container check returned no remaining security-test containers. Sanitized temporary source copies, runner files and local test caches were removed after the evidence above was recorded. Approved toolchain images remain cached to avoid repeat downloads. Shared services and application dependency files are unchanged.

## Independent review and release handoff

Review the complete branch diff from `2d637bd`, including checkpoint `c26cf15` and the final follow-up. Prioritize native router/override precedence, staff invitation, registration credential races, session lineage/expiry/actor binding, distributed-lock failure behavior, recovery/compensation, customer deletion, guest receipt projection, return mutation serialization/shipment budget, upload routes and cache read amplification. Native tests establish the stated fixture behavior; they do not prove arbitrary lock/network failures or every production lifecycle.

Before release: obtain independent Claude review; apply/verify the session migration; configure trusted proxy/origin/Admin controls; confirm shared locking/session/cache capacity; smoke-test account, guest receipt, product upload and returns in the deployment environment. Seif controls merge and deployment. No additional agents, push, merge or deployment occurred.
