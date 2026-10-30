# Security report remediation — 2026-10-30

Owner: GPT. Branch: `codex/security-remediation`. Base: `full-stack` `2d637bd`.
Source audit: `C:/Users/Seif Waleed/security-audit-skill/vi2/run-1/REPORT.md`, audited `d039f3d`.

## Current disposition

Seventeen records have scoped implementation changes and relevant unit coverage. Record 10 remains under investigation. This is a remediation handoff, not a replacement audit: original records remain NEEDS-VALIDATION, and no original audit files or verdicts were changed. Not merge-ready: native HTTP/database/migration verification and independent review remain outstanding.

## Owner decisions

- Private guest order links expose receipt data only; staff handle guest returns.
- Logout revokes the current device, including its refresh chain. Password changes/resets invalidate all sessions issued against the old credential.
- Registration limit: 10 attempts per 15 minutes per visitor, provided the proxy supplies a trusted client IP.
- Preserve manager return receipt; investigate the native stock lifecycle instead of making receipt admin-only.
- Seif explicitly allowed focused normal local unit tests using mocks/dummy data as an exception to the audit skill's OS-isolation requirement. Native database and production checks remain pending. No additional agents were authorized or launched.

## Record-by-record implementation

| # | Audit record | Implementation | Remaining verification |
|---|---|---|---|
| 1 | Login limiter bypass | Guard native parameter route, reject unsupported actors/escaped paths, share one emailpass guess budget across customer/staff actors | Native router ordering and GET/POST/encoded HTTP requests |
| 2 | Email links survive recovery | Signed links carry the credential snapshot; confirmation checks it under the same credential lock as native reset/custom password change | Native concurrent recovery/confirmation and compensation |
| 3 | Unbounded registration | Shared visitor budget on custom signup and native staff registration; native customer registration is closed | Production trusted-IP boundary and edge behavior |
| 4 | Preclaimed email retains access after recovery | Durable sessions compare their original credential snapshot against current native password state; recovery invalidates prior sessions and refresh | Real preclaim/recovery sequence; mailbox verification was not added |
| 5 | Open redirect | Reject protocol-relative path after URL normalization | Native browser navigation |
| 6 | Manager path mismatch | Reject fragment/backslash/encoded/control paths; normalize route segments for permission comparisons while preserving resource IDs | Raw HTTP/proxy variations |
| 7 | Admin CSRF | Require exact configured/backend Origin on cookie-backed admin mutations; preserve token-only integrations | Deployed origins/CORS and native Admin writes |
| 8 | Active uploads | Validate native multipart upload bytes with existing raster allowlist, canonical MIME/filename, 1 MB cap; disable presigned bypass | Native parser/override ordering and product image UI; parser still buffers before size check |
| 9 | Draft allocation | Reject draft order lines before reservation workflow | Native reservation/deletion/conversion |
| 10 | Return/cancel double credit | Investigation only; no manager permissions removed | Disposable native database reproduction and invariant fix |
| 11 | Parallel customer creation | Close native customer create/customer emailpass register; retain normalized custom signup and native staff invite registration | Native signup/invite/refresh sequence |
| 12 | Unauthenticated returns | Require authenticated order owner; reject client receipt and shipping-price overrides; staff handle guest returns | Native workflow with owner/other/guest principals |
| 13 | Order PII exposure | Native order detail workflow uses fixed fields; final response projection independently strips contact/address/metadata fields | Native order totals/serialization and customer history |
| 14 | Session fixation | Regenerate cookie session before native login assignment | Native session store and browser login |
| 15 | Tokens survive logout/recovery | Native password provider supplies exact credential snapshot; native-issued tokens bind a persistent device session; refresh retains device ID; logout revokes it; every authenticated store/admin access checks it | Native auth middleware/overrides, actual persistence, concurrent refresh/logout |
| 16 | Cart owner bypass | Reject encoded paths, classify collection case-insensitively, use routed ID and repeat owner checks | Native cart/payment-collection HTTP paths |
| 17 | Deleted customer retains login | Replay marker moves to server-only provider metadata; legacy marker migrated under credential lock before native deletion; actor-link validation rejects deleted customer sessions while preserving shared staff identity | Native deletion/re-registration and compensation |
| 18 | Redis cardinality/body growth | Cache only query-free canonical catalog paths with finite locale/language variants; normalize publishable-key permutations; cap cached body at 128 KiB | Actual Redis memory/eviction and deployment limits |

## Authentication design and rollout requirements

Medusa continues to own credential hashing, verification and token generation. The custom provider subclasses the public module's native provider, decorates its identity-service reads/writes to capture the exact hash it verified/wrote, and attaches only an HMAC fingerprint to the sanitized result. It does not persist that fingerprint in actor metadata. The adapter then binds the native token to an `account-security` device-session record. Refresh preserves the device ID and original credential snapshot. This avoids reading a newly reset password after an older login/registration has already succeeded.

The `security_session` table is a justified extension for durable device revocation; it stores no bearer token, password or password hash. Its migration is drafted and typechecked, not applied or schema-verified. Expired records are removed in batches of up to 1,000 hourly.

Before deploying, run and verify the new module migration. Existing bearer/cookie sessions without a device record will require sign-in again. Previously issued email-change links without the credential claim will require reissue. Native staff invitation must remain functional through its actorless registration-token refresh transition. These native contracts are not proven by mocked tests.

`TRUSTED_PROXY_CLIENT_IP_HEADER` accepts `cf-connecting-ip` or `x-real-ip`. Production signup refuses to proceed without explicit trust configuration. Configure it only after the proxy strips incoming copies and the origin accepts traffic exclusively through that proxy. Development uses the socket address and ignores forged forwarded headers.

The cache now bypasses search/filter/pagination requests and unsupported language variations, serving them through native handlers. This deliberately removes arbitrary cache-key amplification and may increase database reads. Size Redis and apply deliberate edge limits before launch. Existing public active-content files are not removed automatically; the storage owner should review any historical HTML/SVG uploads.

## Validation evidence

- Backend: 15 focused suites / 162 tests pass, covering access guards, shared limiter budgets, registration IP trust, draft allocation, redirects/account glue, cache admission/size, replay migration, credential recovery, device revocation, refresh lineage, native provider snapshots and failure-before-send.
- Storefront: 2 focused auth/session suites / 65 tests pass.
- Backend and storefront TypeScript checks pass.
- Backend changed-source lint and storefront changed-source lint pass. An internal provider import warning was removed by using the public Medusa module export; the two native-provider tests were rerun after that import change.
- Source patch whitespace check is required before checkpoint.
- No builds, native HTTP/database suites, migration application, production requests or provider calls were run. No secrets or real identities were used.

Focused backend command (from `apps/backend`):

```powershell
node ../../node_modules/jest/bin/jest.js --runInBand --cacheDirectory .cache/security-jest --runTestsByPath src/api/__tests__/auth-session-access.unit.spec.ts src/api/__tests__/security-remediation.unit.spec.ts src/api/__tests__/admin-access.unit.spec.ts src/api/__tests__/critical-locks.unit.spec.ts src/api/__tests__/sign-in.unit.spec.ts src/api/__tests__/registration-rate-limit.unit.spec.ts src/lib/__tests__/login-attempts.unit.spec.ts src/lib/__tests__/order-allocation.unit.spec.ts src/lib/__tests__/security-session.unit.spec.ts src/lib/__tests__/email-change-marker.unit.spec.ts src/lib/__tests__/store-cache.unit.spec.ts src/lib/__tests__/email-change.unit.spec.ts src/lib/__tests__/change-password.unit.spec.ts src/lib/__tests__/manager-access.unit.spec.ts src/modules/secure-emailpass/__tests__/service.unit.spec.ts
```

Storefront command (from `apps/storefront`; the explicit testMatch avoids Windows' hidden-directory path expansion issue):

```powershell
node ../../node_modules/jest/bin/jest.js --config ./jest.config.cjs --testMatch '**/__tests__/**/*.test.ts' --runInBand --cacheDirectory .cache/security-jest --runTestsByPath src/lib/__tests__/auth-routes.test.ts src/app/api/__tests__/session.test.ts
```

## Open stock lifecycle investigation (record 10)

`node docs/reviews/security-stock-lifecycle-probe.cjs` runs native installed Medusa order arithmetic against dummy objects, without a server/database. It accepts RETURN_ITEM, RECEIVE_RETURN_ITEM and CANCEL_ITEM_FULFILLMENT for an initially fulfilled-but-unshipped unit, ending with:

```json
{"fulfilled_quantity":0,"shipped_quantity":0,"return_received_quantity":1}
```

This proves an inconsistent native arithmetic transition in that fixture, not an unauthorized persisted inventory write. The original stock-inflation candidate remains NEEDS-VALIDATION with no severity. Source tracing also identifies three cancellation doors: `/admin/orders/:id/fulfillments/:fulfillment_id/cancel`, `/admin/orders/:id/cancel`, and `/admin/fulfillments/:id/cancel`. A fix must cover every reachable native door, preserve manager receipt, and address concurrent return requests/receipt and cancellation at the persistence boundary. An unlocked precheck or a permission reduction would not satisfy Seif's decision.

Next safe validation: use a disposable database, dummy admin/manager/customer, one inventory item/location and two units. Record stocked/reserved/available quantities before and after canonical fulfillment, return request, receipt and cancellation. Include the three cancellation doors, a normal shipped return, a separate unshipped fulfillment on the same line, duplicate/concurrent confirmations and a failed transaction. Stop at the minimum quantity difference. Verify database/container cleanup. No production or shared database may be used.

The normal-local exception covers focused unit tests only. The Security Audit skill still requires OS-enforced isolation for native database/workflow execution; the Docker engine was not running and no suitable isolated runner has been established. Do not execute native database tests under the unit-only exception.

## Independent review handoff

Review the complete branch diff from `2d637bd`, with particular attention to native router/override precedence, staff invitation, registration race snapshots, session lineage/expiry/actor binding, revoked-session failure behavior, reset-token middleware, email workflow compensation, customer deletion semantics, guest receipt projection, return ownership, upload routes and cache read amplification. Keep the original audit artifacts unchanged. Record 10 and the native/migration/deployment gates remain open. Seif controls merge and deployment. No extra agents, push or merge has occurred.
