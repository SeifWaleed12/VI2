# Architecture audit remediation — 25 October 2026

Branch: `codex/audit-fixes`. Application review targets: `2c5c1a3`, `2dd10dd`, and independent-review correction `7672f70`, based on `full-stack` `56df776` (initial base `7405cc8`). GPT implements; Claude reviews; Seif merges. No push, merge, deployment, live migration or real provider operation performed.

The [original audit](architecture-clean-code-audit-2026-10-25.md) remains a historical report of snapshot `9f8e0c2`. This document records the resulting behavior and remaining limits.

| Finding | Result and evidence |
|---|---|
| A01 late cart results after clear/sign-out | Cart generations invalidate old loads, queued writes and responses. Actual React browser fixture verifies private cart/email/storage remain cleared after delayed results. Old captured action callbacks cannot create a replacement cart. |
| A02 production without Redis | Production startup rejects missing/blank REDIS_URL; test/development memory behavior remains intentional. Config unit tests pass. |
| A03 negative points during lost lease | Native loyalty transaction holds a per-customer PostgreSQL advisory lock around deduplication, balance cap and ledger insert. Real concurrent debit and cancelled-lease tests prove rollback and nonnegative results. Refund snapshots are read before the transaction; stale snapshots trigger retry. |
| A04 requests with no deadline / obsolete search | Public SDK calls have 15-second abort deadlines; search cancels obsolete work. Actual SDK fetch tests verify both deadline and caller cancellation. Timeout does not imply a write failed or introduce automatic write retries. |
| A05 promotions bypass cart queue | Apply/remove and eligibility cleanup share the mutation queue. Browser fixture proves promo waits behind quantity change and final total agrees. Intermediate confirmed cart remains authoritative if cleanup fails. |
| A06 refresh outage/event storm | Duplicate events coalesce; incremental batch size is capped. Routine rebuilds preserve only a still-valid projection with matching native price watermark; failure never extends expiry. Known broad mutations/expired projections remain explicitly unavailable until rebuilt. Unit tests verify 100 product events and 50 broad events coalesce. |
| A07 history/expiry memory | SQL aggregates replace full ledger loads; history is limited to 20, expiry scans customer aggregate pages of 500. Real tests cover 1001 ledger entries and 501 customers. Pending-points computation still scans that customer's order pages; large order histories need production measurement (below). |
| A08 misleading brand counts/identity | Removed counts inferred from first100 products; duplicate names link using distinct native IDs. Brand page regression tests pass. |
| A09 unbounded links/bundle discovery | Brand browsing uses paginated native search projection; legacy adapter rejects more than 1000 links explicitly. Bundle flag uses existing native index; discovery is bounded to existing 100-product contract, with validity/channel checks. Inventory availability requests use chunks of100 variant IDs. Index migration/reseed is a release prerequisite. |
| A10 guessed homepage taxonomy | Removed English keyword category filters inferred from a partial product page. Supplied product cards remain visible, including Arabic data; regression tests pass. |
| A11 concurrent admin edits | Owner chose latest committed save wins for ordinary same-field edits. Independent fields remain intact. Real two-admin HTTP test verifies both. Inventory, order and points invariants remain separately enforced. |
| A12 cold-cache stampedes/cardinality | Equivalent query keys canonicalized, duplicate local fills shared, max 256 in-flight fills and 2-second follower deadline. Unknown query dimensions bypass cache.100 simultaneous cold requests invoke one handler in unit proof. Per-process coordination does not eliminate duplicate fills across server processes; legitimate key cardinality still needs Redis sizing. |
| A13 stalled Redis cache work | Optional cache disables offline queue/replay and bounds command/socket lifetime. Real Redis pause/disconnect test:150 fallbacks, zero offline queued commands; remaining 2 handshake commands after 2500 ms in the follow-up run. This is cache behavior, not a blanket policy for native BullMQ connections. |
| A14 public abuse protection | OPEN DEPLOYMENT GATE: trusted visitor-IP/proxy and Cloudflare rate-limit policy, already deferred by owner. No guessed per-IP policy added. Application queue/cache limits are not a substitute for this gate. |
| A15 unbounded cart backlog | Max 20 waiting mutations; admission occurs before async cart creation/loading. Tests prove bounded backlog; clear cancels queued old-session work. Pending new lines resolve their assigned backend ID when their queued edit runs. |
| A16 duplicate scheduled jobs | Native renewable job-wide locks added to expiry/cart cleanup. Real Redis two-worker exclusion, renewal beyond initial lease and killed-process recovery verified. Job cancellation checked between pages/items. |
| A17 failed event retention | Failed jobs retained up to 7 days / 5000 entries, native 5-attempt exponential retry retained. Deployment still needs failure alerts and Redis memory sizing. |
| A18 category progress/depth | Repeated page IDs/invalid counts rejected, total read deadline 15 seconds, explicit 10000-category render budget. Tree processing is iterative; 20000-depth synthetic traversal passes without stack overflow. |

## Validation

- Backend unit suite:36 source suites / 287 tests passed after review corrections; backend typecheck and lint passed.
- Storefront after rebase:53 suites /503 tests passed. Post-rebase storefront typecheck and lint passed. Final backend/server and Admin production builds passed after fixture type corrections. Storefront production build passed at correction `2dd10dd`; 7 focused deadline/cart/Deals tests and lint also passed after those corrections.
- Disposable PostgreSQL HTTP suite:4 suites /29 tests passed (account, checkout, catalog sorting, audit hardening). Earlier native catalog visibility suite also passed separately.
- Load scenario: one200-variant product, 40 concurrent cold HTTP reads, all 200, 1769 ms total. This is a local diagnostic, not a production capacity rating. [Result](audit-load-results.json).
- Real Redis: 150 stalled-cache fallbacks; zero offline queue; two-worker critical-section maximum 1; 1-second lease renewed through 2600 ms; child-process crash lock reacquired after 1103 ms. [Result](audit-redis-results.json), [reproduction](audit-redis-regression.cjs).
- Actual React19 browser fixture with controlled service promises: late load after clear, new session load, promo/quantity serialization, pending line edit, clear during mutation. [Result](audit-cart-browser-results.json), [screenshot](audit-cart-cleared.png). Backend integration was tested separately; fixture services were controlled.
- Some native integration teardown logs report asynchronous local-event/DB cleanup and open-handle warnings after passing assertions; this is not a clean production soak or worker shutdown certification.

## Release gates and limits

Do not treat this branch as proof that every possible launch failure is prevented. Before rollout, approve/run the normal native search migration/reseed for the added bundle field. Do not serve the new bundle route against an old index schema. No live database was migrated here.

Set and verify trusted proxy/client-IP and edge abuse policy; database pool/replica budgets; Redis memory/eviction/failed-job alerts; and representative larger-catalog and long-running worker/traffic tests. Customer pending-points still requires work proportional to that customer's order history (paged rather than full in-memory loading). Finite cache keys can still grow across many legitimate query combinations. Catalog refresh cost and broad-mutation downtime depend on actual catalog size. These remain measurement/deployment work, not claims of application defects reproduced under this test load.

Cart ownership is rechecked inside its native lock and cancellation is checked before/after writes. Email confirmation also checks cancellation around the native workflow. These checks do not create cross-module database fencing or make an interrupted external write certainly absent. Existing native compensation and retry semantics remain relevant.

No provider contracts were invented for Odoo, Paymob or Bosta. No dependencies, Medusa core, node_modules contents, shared manifests, AGENTS rules or decision records changed.

## Claude review

Claude requested changes on `2c5c1a3`: mixed routine/mutation batches could force an unnecessary full outage; browser cancellation depended on newer AbortSignal helpers; cache followers misreported validation errors as 503; bundle errors all mapped to503. These are corrected at `2dd10dd` with regression tests. The Deals component also moved out of the Next route file to fix a production build rejection without changing behavior.

[Round1](claude-audit-final.md), [Round2 approval](claude-audit-round2.md). Claude approved application commit `2dd10dd` through read-only source review; it did not independently execute tests. The low-severity follow-up test synchronization note was addressed using a macrotask barrier and an assertion that the follower is still waiting before the leader responds. Existing fake-timer test already covers the 2-second 503 timeout path. Two fixture-only type corrections at `3d465c1` follow application approval (initialized sales-channel guard and static route import).

The suggestion to silently swallow failed promo cleanup was intentionally not adopted: the confirmed intermediate cart stays authoritative and the customer sees a failure. Claude accepted this disposition. Ordinary competing admin saves retain Seif's latest-committed-save decision.

Earlier closure before independent review: both app typechecks/lints and both production builds pass; final focused backend regressions32/32 and storefront regressions7/7 pass. Source-only backend full run287/287 and post-rebase storefront full run503/503 pass. HTTP29/29 was run before the review-only corrections; PostgreSQL/Redis resources were then stopped. Final application approval remains scoped to2dd10dd; subsequent3d465c1 changes tests only. Raw logs archived locally outside Git; concise JSON/browser evidence is retained beside this handoff. No push/merge/deployment.

## Independent review follow-up

The owner's independent Claude review of `2c685a0` requested changes: [full report](claude-audit-independent-review.md). It superseded the earlier source-only approval. GPT claimed the fixes and implemented application correction `7672f70`; [Claude recheck](claude-audit-independent-followup.md) records the follow-up verdict.

| Independent finding | Disposition |
|---|---|
| 1: existing merchandising HTTP failure / missing-index404 | Wait for real native seed before fixtures, then poll for asynchronous bundle discovery without weakening expected IDs. Missing index version maps to retryable503. Full HTTP suite passed: 14 specs / 109 tests, including merchandising. |
| 2: default brand outage regression | Restore bounded native default-brand fallback on network/404/5xx only, preserving filters/page and explicit native1,000-link limit. Search, Deals and requested sort still require the derived index. |
| 3: invalidation lost during brief Redis stall | Up to3 attempts,500/1000ms backoff, shared in-flight retry per cache; new local write during scan forces another bounded pass. Persistent outages still rely onTTL. |
| 4: cache key deleted on short latency spike | Keep middleware250ms wait; increase native command/socket deadlines to1500/2000ms. Real500ms pause preserves the entry;1800ms interruption followed by retry removes stale data. |
| 5: two-second follower503 | Retain explicit backpressure with Retry-After: 1. Coalescing holds for at most 2 seconds per key; after expiry another miss can start a new origin request while the earlier leader is still running. The 256-fill cap bounds coordination records, not total origin concurrency. Tune only after representative measurements. |
| 6: tracked test output / overclaimed coalescing | HTTP burst now logs diagnostics and its name claims successful completion/backpressure only. It no longer writes tracked evidence. Existing controlled unit test proves100 cold requests share one handler. |
| 7: cron contention reports failure | Only exact native acquisition timeout before callback entry is skipped. Errors from the job body, lease loss and Redis failures still propagate. |

Follow-up validation so far:37 backend source suites/292 tests;53 storefront suites/507 tests; additional focused backend29 tests (including2 added after the full run) pass. Both app types/lints and both production builds pass. Real Redis follow-up confirms key preservation, invalidation recovery,150 stalled-cache fallbacks, zero offline queue, two-worker exclusion, renewal and killed-process recovery. Full 14-spec HTTP run passed: 109 tests, including merchandising and quick-variant, without reruns. Original audit-load-results.json remains historical evidence; it is no longer rewritten by tests.
Claude's follow-up approves `7672f70` on source review with no blocking defects, conditional on all14 HTTP specs and builds passing. The builds passed after that prompt was dispatched; real Redis results were already produced locally and are in audit-redis-results.json (Claude did not execute them). Post-review changes add negative fallback-guard tests and comments only, without runtime behavior changes.

Accepted low-severity limits: context409 remains fail-closed to avoid silently replacing a changed region/channel contract; invalidation failures and concurrent writes share the same three-pass budget, after whichTTL bounds staleness; native cache reads that fail beyond1500ms can still evict their key; exact lock-timeout wording is tied to installed Medusa2.21 and safely reverts to visible alert noise if changed. These are documented limits, not claims of unlimited availability.
Independent review closure: application7672f70 approved on source recheck; test/comment-only follow-up599ec7e adds guard coverage and explains remaining bounds. Full HTTP14/14 specs,109/109 tests pass in759.778s, including previously failing merchandising; both production builds, types/lints, full backend292 and storefront507 unit runs, final focused backend29 and storefront12 regressions pass. Two extra backend tests and three extra storefront tests were added after their full runs and exercised in those final focused runs. Real Redis diagnostic passed with1500/2000ms options,500ms key-preservation and1800ms invalidation recovery. Claude did not rerun these checks; results are author-executed. No push, merge, deployment, live migration or real provider call.

## Final independent recheck — 26 October 2026

[Claude's final report](claude-audit-final-recheck.md) approves `2c34193`, including application `7672f70` and test/comment follow-up `599ec7e`, with no merge-blocking defects. Claude independently reports 37 backend suites / 294 unit tests, 53 storefront suites / 510 unit tests, and all 14 HTTP specs / 109 tests passing without reruns. It also ran its own real Redis probes and job-contention checks. Its full unit runs include the tests added after GPT's earlier full runs. Claude did not rerun the production builds, the original browser fixture or the original renewal/crash script; those remain GPT's earlier evidence.

L1's documentation overclaim is corrected above: a slow origin fill can be started again after the two-second slot expires. Redis outstanding work is bounded by time rather than a fixed command count; Claude observed a peak of 5,824 commands in its 3,000-request single-process probe, draining to three within 3.2 seconds. That is diagnostic evidence, not a production capacity guarantee. L2–L6 remain nonblocking limits/observations as detailed in the report; no application behavior changed for this documentation closure.

The report mentions three databases on Claude's test host whose ownership it could not establish. GPT has not inspected or removed them; they must be attributed before any cleanup. The earlier task-owned disposable containers were stopped and their test databases were checked separately.

Cloudflare/trusted visitor-IP limits, production capacity and soak checks, and the native bundle-index migration/reseed/deployment health check remain launch gates. Owner acceptance and merge remain Seif's. No push, merge or deployment performed.
