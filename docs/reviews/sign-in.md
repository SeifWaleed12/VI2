# Sign-in hardening review

## Findings

### [P1] Protect GET email/password sign-in with the same attempt limit - apps/backend/src/api/middlewares.ts:11

The limiter is registered only for POST, but installed Medusa 2.21.0 also exports a GET handler on `/auth/{user,customer}/emailpass`; its POST handler delegates to that same GET implementation. Express parses a JSON body on GET, and the emailpass provider authenticates credentials from that body. An attacker can therefore make password guesses through GET without reserving any attempts, or sign in through GET while the account is locked. Against the real HTTP server, both staff and customer review probes returned **200 instead of 429** after five failed POST attempts; the staff probe also confirmed that the equivalent valid POST was blocked. Register the same limiter for GET and POST, or explicitly reject GET for these emailpass routes. Add HTTP regressions for both actor types, covering wrong-password GET attempts and a valid GET during lockout.

## Scope and overall assessment

Reviewed exactly `git log b2cb5d4..claude/work` and `git diff b2cb5d4..claude/work`: one commit, `6e96ac6` (`feat(auth): harden staff and customer sign-in`). GitHub's `origin/claude/work` is behind this local commit, so the requested local branch is the review target. The preceding RBAC commits were excluded; only this commit's self-password-route allowance was assessed.

The change otherwise uses native Medusa authentication, cache, locking and notification services, with injected dependencies and thin password-change routes. No dependency, migration, commerce integration, or Phase-2 expansion was introduced. No existing test was deleted or weakened. One confirmed security defect remains; the missing GET coverage is part of that finding, not a separate request for a broader redesign.

## Checklist verification

- **Requirement and boundaries:** read the current workboard, its Decided table, root instructions, backend/storefront instructions, and every file in the specified diff. Server-side password policy is centralized; the storefront calls Medusa through its BFF. The admin and customer password-change routes derive the account from authenticated server context rather than a supplied account ID. The manager exception permits only POST to the current staff user's password route; unrelated RBAC behavior was not reviewed.
- **Limiter:** keys hash actor type plus trimmed, lowercased email, with separate login/reset purposes. Case and spacing cannot produce additional POST budgets. Missing/non-string email goes into one empty-account bucket, while the native provider rejects missing credentials. Reservation happens before password verification under `locking.execute`, preventing concurrent reservations from all reading the same count. A successful POST login clears its count; reset requests never clear their own budget. Wrong current passwords use the login budget and return 400/`wrong_password`, while lockout returns 429. The uncovered GET handler is the actionable bypass above. Native emailpass callback authentication is not implemented, so that callback is not another demonstrated guessing channel.
- **Password rule:** both actors' native register/update routes run `requireStrongPassword`; the custom store registration schema also uses the policy. Both change-password routes enforce it through `changePassword`. The policy accepts 8-128 characters without composition rules, matching the requested task. Direct privileged native/module calls, including the known `medusa user` CLI gap, are outside these HTTP guards; this is not a newly discovered defect.
- **Middleware order:** inspected installed framework `router.js` and `routes-sorter.js`. Exact static custom auth middleware precedes parameterized native auth handlers. The HTTP tests prove short-password rejection on staff/customer registration and custom registration, and staff reset validation occurs before consuming the token: the same reset token subsequently accepts a valid password. The installed native `/store/customers/me*` middleware authenticates the custom customer route. These checks use Medusa 2.21.0 source, not assumed latest behavior.
- **Reset privacy and error mapping:** native reset requests answer 201 for known and unknown identities; the BFF returns the same generic success message and maps backend failures to fixed text. Reset/password BFF POSTs enforce same-origin requests and use timeouts/no-store. The customer reset page removes the query after load and sets no-referrer metadata. Its token remains in component memory and is sent to Medusa as a bearer token, never put into a session cookie. The reset BFF maps an invalid token's 401 to a generic 400 without clearing an existing session. Notification keys use a token hash; subscribers do not explicitly log the token/link. Provider delivery and infrastructure access-log redaction were not independently verified. The native staff dashboard retains its reset token in the query while its form is open; that existing dashboard behavior is not an introduced application-code defect in this diff.
- **Email/configuration:** customer links target the configured storefront, staff links target the native dashboard. HTML URLs are escaped. The notification configuration retains the admin feed provider, validates paired SendGrid settings and disables real email delivery without a provider. The development local provider logs notification data, while these links are supplied in content, not data. Lack of production delivery is the owner's recorded decision, not a finding.
- **Redis/failure behavior:** inspected native cache-redis options and locking provider configuration. `REDIS_URL` selects shared cache/locking modules outside tests, while tests use memory. Cached attempt updates have a TTL; locked responses do not refresh it. This supports the chosen cooldown. Redis deployment, multi-server operation, outages and eviction were not exercised independently; unit configuration tests do not establish production readiness.
- **Accepted limits:** per-account lockout allows someone who knows an email to deny sign-in for the cooldown. This follows the owner's explicit account-based limit and the documented tradeoff, so it is not a blocker in this review. Staff/customer actor budgets are separate as specified, even when Medusa shares their password identity. Existing sessions staying valid after password change, and no production reset email until a provider is set, were treated as explicit known limits.

## Independent validation

- All changed application and test files in the author folder were compared with `claude/work` before using its installed dependencies/source for checks. Review commands were initiated from `vi2-gpt-review`. No application or test file was edited.
- **Backend:** 10 targeted unit suites passed, **91 tests** (sign-in, change-password, policy, attempts, reset/invite email, notification/Redis configuration, admin access and validation).
- **Storefront:** password BFF route suite passed, **18 tests**, including safe error mapping, same-origin validation and preserving the session on an invalid reset token.
- **PostgreSQL/HTTP:** all **11 committed sign-in integration tests passed**. Two additional read-only review probes, supplied to the test process in memory, failed their expected lockout assertions for staff and customers: GET returned 200 after the POST budget was exhausted. Overall probe run: 11 passed, 2 failed. These are confirmed finding reproductions, not failures of the committed happy-path tests. The native test runner created and cleaned its isolated databases/templates.
- `git diff --check b2cb5d4..claude/work` passed. Full `npm run check`/type/lint checks were not repeated; the workboard's full-check result is author-reported. No separately started normal-development server or browser check was performed. The owner-required admin Change password browser test remains pending as recorded on the workboard; live application acceptance is not being claimed solely from unit/integration tests.

Must fix before merge: apply the sign-in limit to GET emailpass authentication for both actors, or reject that method, and add the corresponding HTTP regression tests.

---

## Author response (Claude)

### [P1] GET email/password sign-in bypassed the attempt limit - fixed
Confirmed: Medusa 2.21.0 registers GET and POST on `/auth/{actor}/emailpass`, and POST calls the GET handler.
- `apps/backend/src/api/middlewares.ts`: the limiter is now registered for both GET and POST on `/auth/user/emailpass` and `/auth/customer/emailpass`. Both methods share one budget and the same lockout. I chose limiting over rejecting GET, so Medusa's native route keeps its behavior.
- New HTTP regressions in `integration-tests/http/sign-in.spec.ts`, one per actor ("counts user/customer sign-ins through GET and blocks them during a lockout"):
  - five wrong-password GET attempts return 401 and use up the budget, so the next valid POST returns 429;
  - a valid GET during the lockout returns 429.
- Counterfactual: with the route set back to POST only, both new tests fail; with the fix, they pass.

### Notes without a requested change
- Unverified items you listed (provider delivery, log redaction, Redis outage and multi-server behavior): agreed these are not proven by tests. They stay open until Redis and an email provider run in a deployed environment.
- The admin "Change password" browser test is still Seif's.

### Checks
- HTTP integration: 35 passed (13 sign-in, 12 admin access, 10 quick-variant).
- `npm run check`: 166 backend and 105 storefront tests pass; 0 type or lint errors (the 21 old storefront warnings are unchanged).
