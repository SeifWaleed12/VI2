# Project architecture, clean code, scalability and performance audit

Date: 25 October 2026  
Auditor: GPT, Ponytail full  
Snapshot: `9f8e0c2417be3e0ffb563922bfc10bbc1c16c59d` (merged promo-total-fix, PR24)  
Delivery branch: `codex/architecture-audit`

> Historical snapshot. Current fixes, validation and remaining launch gates: [remediation handoff](audit-remediation-2026-10-25.md).

## Verdict

Keep the Medusa modular monolith and Next.js storefront. The main architectural choice is appropriate for the MVP. A rewrite, more services, another database, a generic repository layer, and replacing native search are not justified by this audit.

The original audit recorded **10 actionable findings: 3 P1 and 7 P2**. Owner-requested follow-ups A11–A18 and the launch-scenario evidence are recorded below; their conditional/operational scope is explicit. The first three concern cart privacy, deployment configuration and loyalty correctness. The remaining findings concern request lifetimes, cart synchronization, catalog availability and work that grows with catalog/history size. This is not a claim that production is currently misconfigured or overloaded.

The code is maintainable in its overall structure, but its failure handling is less consistent than its happy paths. It is not yet demonstrated to scale safely across processes or large catalogs. There are no measured throughput, Core Web Vitals or capacity numbers in this audit.

## Scope and evidence

Reviewed both applications, root tooling, app instructions and relevant architecture/security/testing/ownership references. Traced catalog indexing, refresh, search, hydration, product mapping, brand filters, cart load/mutation/clear, checkout completion, auth/session forwarding, staff restrictions, email changes, points earn/refund/expiry, notifications and cleanup. Reviewed representative callers and tests; this is a full-project architectural assessment, not formal verification of every source line.

Versions declared in the audited manifests: Medusa 2.21.0, Next.js 16.3.3, storefront React 19.2.8, backend React 18.3.1, npm 11.6.2. The distinct React versions serve different apps and are not themselves a finding. Installed implementations were checked for SDK request handling, cache invalidation and Redis lock behavior.

Evidence levels:

- **Reproduced:** controlled offline execution of actual source functions, with explicit dependency mocks.
- **Source traced:** implementation and callers establish the behavior; no live reproduction or capacity claim.
- **Operational follow-up:** missing deployment/measurement evidence; not a confirmed production failure.

No application code, dependency, migration, environment file or live commerce data changed. Untracked files in the original checkout were left alone. Report and diagnostic probe are in this isolated worktree.

## Findings

| ID | Priority | Finding | Evidence |
|---|---|---|---|
| A01 | P1 | A late cart response can restore data after sign-out | Reproduced |
| A02 | P1 | Missing Redis configuration silently leaves production on process-local infrastructure | Reproduced configuration branch |
| A03 | P1 | Points writes continue after their lock is lost | Reproduced fault injection |
| A04 | P2 | Public SDK requests have no application deadline | Reproduced SDK boundary |
| A05 | P2 | Promotion operations bypass the cart mutation queue | Reproduced response race |
| A06 | P2 | Routine catalog reconciliation takes search/sorted results offline and repeats full-catalog work | Source traced; downtime duration unmeasured |
| A07 | P2 | Points reads and expiry retain complete histories in memory | Source traced; known shortcut |
| A08 | P2 | Brand product counts are computed from only the first 100 products | Source traced |
| A09 | P2 | Brand filtering and bundle discovery do unbounded work before bounded output | Source traced; bundle shortcut documented |
| A10 | P2 | Homepage category tabs infer taxonomy from English words in a partial catalog | Source traced |

### A01 — Invalidate pending cart work when a session or cart is cleared

Location: [cart-provider.tsx](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/providers/cart-provider.tsx:151>), clear at line 370 and sign-out handler at line 384; shared queue at [cart-queue.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/lib/medusa/cart-queue.ts:1>).

`clearCart` removes current state/storage but leaves pending loads, queued mutations and their callbacks valid. A response begun before sign-out can later call `syncFromMedusaCart`, restoring the old cart ID, items, email and address.

Probe: begin reading a saved cart, call the same `clearCart` used by the sign-out handler, then resolve the old read. The previous cart ID returns to localStorage and the provider again holds the previous email/address. This demonstrates client-side disclosure on a shared browser; it does not demonstrate bypassing backend authorization.

Smallest repair: give cart/session work a generation token. Invalidate it on clear/sign-out and reject late results from earlier generations, including queue results and failed-operation rollback. Scope confirmed queue state to that generation. Abort requests where supported, but do not rely on abort alone.

Acceptance: delayed initial read, delayed mutation and queued add cannot repopulate state/storage after sign-out or successful checkout; a new cart can still load normally.

### A02 — Make shared infrastructure mandatory for production

Location: [redis-config.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/lib/redis-config.ts:7>).

`redisModules({ NODE_ENV: "production" })` returns an empty list. This allows the Redis configuration helper to succeed while Medusa uses local defaults. Under the intended separate server/worker deployment, locks, attempt budgets and events/workflows cannot be assumed to coordinate across processes or survive restarts.

The probe verifies the missing configuration guard, not a full backend boot. Other guards may independently refuse startup, and actual deployed Redis settings were not inspected.

Smallest repair: reject missing/blank Redis configuration in production, as the storage helper already does for missing production bucket settings. Retain local defaults in development/tests. Add production configuration tests and a two-process coordination smoke test.

Medusa recommends Redis cache, event, workflow and locking infrastructure for production: [official deployment guide](https://docs.medusajs.com/learn/deployment/general). No additional infrastructure product is needed.

### A03 — Protect the points invariant when lock ownership is lost

Location: [points.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/lib/points.ts:111>).

`recordPoints` ignores the abort signal supplied by native Redis `execute`. It reads a balance, caps a removal and later inserts an entry. Losing the lease during that interval allows another holder to make its own decision against the same earlier balance. The unique source index stops duplicate events; it cannot stop two distinct refunds.

Fault-injection probe: start with 100 points; pause the first refund after its balance snapshot; signal lease loss; let a second 80-point refund commit; resume the first 80-point refund. Persisted sum becomes **−60**. The old lock holder throws after its write, which cannot undo that write.

This is a source-level concurrency witness using a mocked lock/database boundary, not a real Redis/PostgreSQL failover test. Native 2.21 lock behavior was checked locally and against the [versioned implementation](https://raw.githubusercontent.com/medusajs/medusa/v2.21.0/packages/modules/providers/locking-redis/src/services/redis-lock.ts).

Repair: consume lock cancellation before further work, and enforce the read/cap/write invariant atomically within the loyalty persistence boundary. A signal check alone cannot fence a database write already in progress. Use Medusa-supported transactions/locking in the existing module; retain the unique source index and append-only history.

Acceptance: two distinct removals during lease loss never make the balance negative; duplicate/refund-before-delivery/expiry rules remain correct. Audit the same signal-ignoring pattern in email-change and cart-owner critical sections when repairing this.

### A04 — Give catalog/cart SDK requests bounded lifetimes

Location: [client.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/lib/medusa/client.ts:15>), [catalog.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/lib/medusa/services/catalog.ts:16>), [products.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/lib/medusa/services/products.ts:194>), [cart.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/lib/medusa/services/cart.ts:110>).

Most public product, region, brand, cart, shipping and payment calls do not pass a deadline signal. The configured SDK does not add one. A controlled SDK request reached fetch with `signal === undefined`. A stalled response can therefore outlive a useful UI deadline; the cart queue also waits for that request before processing later work. Account calls and category-tree fetches already demonstrate bounded alternatives.

Smallest repair: one consistent request policy in the established SDK/service boundary, with per-request cancellation where needed. Wire search effect cleanup through to network cancellation. Keep checkout mutation timeouts indeterminate and reconcile against the same cart; do not automatically retry non-idempotent writes.

Acceptance: stalled browse/cart/shipping calls reach a recoverable state within the chosen deadline, later queue work is handled deliberately, and an expired completion request never falsely reports payment/order failure. SDK request configuration is documented in the [official SDK guide](https://docs.medusajs.com/resources/js-sdk).

### A05 — Serialize promotion writes with item writes

Location: [cart-provider.tsx](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/providers/cart-provider.tsx:336>) and queue use at line 194.

Item changes use `queue.run`, but applying/removing promotions directly writes provider state and calls `queue.confirm`. An older item response can subsequently overwrite the newer promotion response.

Probe: delay a quantity response with total 200, apply a promotion whose newer response has total 180, then deliver the older quantity response. The provider returns to 200 and removes the displayed promotion even though its more recent response had confirmed it.

Smallest repair: serialize all cart writes through the same queue, including promotion cleanup, and coordinate explicit refreshes with pending work. Do not introduce a second state store.

Acceptance: both response orders preserve the newest confirmed cart, promotion removal failures are visible, and failed final mutations preserve the latest successful totals.

### A06 — Routine reconciliation must not become a recurring availability window

Location: [reconcile-catalog-ranking.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/jobs/reconcile-catalog-ranking.ts:8>), [catalog-ranking-refresh.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/lib/catalog-ranking-refresh.ts:23>), [catalog route](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/api/store/catalog/route.ts:19>).

Projection health lasts at most five minutes. The minute job initiates a full refresh when less than a minute remains, so an otherwise idle catalog is rebuilt roughly every four to five minutes. Full refresh first sets `ready = 0`, then re-reads/projects/upserts the catalog and scans index documents for deletions. The catalog route returns 503 throughout that window. Some broad/deletion events also fall back to a full refresh. Header search now shares this catalog route.

Batch size 100 bounds each product page, but does not bound total refresh time, variants per page or global-lock occupancy. Longer builds increase search/sort/Deals downtime and delay incremental updates. A build that outlasts its precomputed five-minute validity is already expired on publication.

The existing full-refresh unit test explicitly verifies the unavailable-first transition. No production downtime rate or catalog-size threshold was measured.

Repair order: instrument refresh duration, queue age, scanned products/variants and catalog 503s; test realistic catalog sizes. Then reduce/coalesce broad refresh work and investigate a native way to publish a consistent refreshed projection without disabling every read during routine reconciliation. Preserve freshness/price-boundary guarantees and honest unavailable recovery. Do not silently return expired rankings or add another search system without evidence.

### A07 — Bound points aggregation memory and read work

Location: [expire-points.ts](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/jobs/expire-points.ts:14>), [points route](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/api/store/customers/me/points/route.ts:13>), [customerPoints](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/lib/points.ts:61>).

The expiry job paginates database reads but retains every ledger row in a global Map until scanning finishes. It also repeatedly spreads each customer's growing array, adding copying cost. Account points requests load complete points histories and full order/item graphs before returning only 20 history entries. Refund caps repeatedly sum history under the customer lock.

This is an existing documented MVP shortcut, not evidence of a current memory outage. Cost grows with historical rows, not just current customer count.

Smallest repair before sustained growth: aggregate balance/activity in the existing loyalty persistence layer, fetch the latest visible history separately, process expiry candidates in bounded pages and filter pending orders before loading expensive details. Preserve one authoritative ledger; a second mutable balance needs an explicit consistency contract.

Acceptance: correct totals after histories exceed a page, bounded job memory, and expiry/earning/refund races still pass.

### A08 — Remove incomplete brand counts or obtain authoritative counts

Location: [brands page](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/app/[locale]/brands/page.tsx:55>); [getProducts cap](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/lib/medusa/services/products.ts:233>).

The brand directory fetches at most 100 products, groups them by display name and renders each result as a brand's product count. A brand represented only after that page shows “0 products”; larger brands are undercounted. Brand names are also used as identity during grouping.

Smallest repair: remove the count unless it is required. If required, return backend counts keyed by brand ID with native published/sales-channel visibility. Do not fetch the full catalog or issue one count request per brand.

Acceptance: fixtures with more than 100 products, a brand only on a later page, and repeated display names.

### A09 — Bound backend discovery work, not only response size

Location: [brand filter](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/api/catalog-filters.ts:26>) and [bundle discovery](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/backend/src/lib/deals.ts:28>).

Default brand-filtered browsing first materializes every matching product-brand link as a product ID list, then asks the native product endpoint for one page. Bundle discovery loads every variant/inventory link and groups in memory before slicing output to 100 products. Many variants in one product can be expensive even when the product count looks small.

Response caching reduces frequency; broad admin invalidation and cache misses bring the full cost back. The bundle implementation already documents this shortcut.

Repair: retain native visibility/count authority while pushing eligibility/filtering into bounded native queries or the existing derived catalog contract where appropriate. Define bundle pagination if it must grow beyond 100; do not silently raise the cap or preload more data into the browser.

Acceptance: high variant/link counts, cold-cache concurrency and brand-filtered later pages, with query count, payload and latency recorded.

### A10 — Use category identity rather than English text heuristics

Location: [HomeBestSellers.tsx](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/components/HomeBestSellers.tsx:54>) and [homepage source](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/apps/storefront/src/app/[locale]/page.tsx:15>).

The homepage “Shop products” tabs classify the first 100 products by searching English words in category/name/description. A product can match “iron” in unrelated description text; an Arabic-only vitamin can fail the English checks. Products outside that first page are never considered, yet the empty message says the category has no products.

Smallest repair: use existing category IDs/descendants and a bounded Medusa query per selected category, with bilingual presentation labels. A cheaper valid option is removing the tabs until those authoritative subsets are available. Do not maintain a second keyword taxonomy.

Acceptance: Arabic-only content, misleading description keywords, an item past product 100 and a truly empty category.

### A11 — Investigate conflicting edits by two admins; repair confirmed lost updates

Status: **owner-requested investigation and repair backlog; unverified**. Added on 25 October 2026 after the original audit. Priority remains to be assigned from evidence and affected data. The original totals remain **10 established findings (3 P1, 7 P2), plus this investigation item**.

Example to verify: two admins open a product priced at 500 EGP. Admin A saves 600 EGP. Admin B changes the name using a form opened before A's save. If B's request also sends the old 500 EGP price and the backend accepts it, A's price change is silently lost. If only the name is sent, both edits may survive. If both change price, determine whether the later save silently wins or a stale edit is rejected. These are illustrative scenarios, not reproduced application defects.

Investigation scope:
- Trace the actual installed Medusa 2.21 Admin forms, request payloads, native update workflows and persistence behavior before proposing custom protection. Include custom admin routes and manager-accessible edits where applicable.
- Check same-field and different-field edits for products, variants, prices, inventory and custom brand/merchandising data. Prioritize sensitive order/points mutations if their staff flows are present; do not invent unsupported editing capabilities.
- Establish whether each path sends changed fields or stale whole-form values, and whether version checks, conditional updates, transactions or locks already protect it. Separate independent field changes from replacement of arrays or linked records.
- Reproduce with two authenticated staff sessions: staggered saves from stale forms, overlapping requests in both completion orders, and retry after an uncertain response. Use isolated fixtures, never live commerce data.

Repair confirmed problems using the smallest native-compatible change. For stale same-field edits or destructive collection replacements, define an explicit conflict policy; where needed reject the stale save and let the admin refresh/review rather than silently overwrite. Preserve independent field updates when appropriate. Stock adjustments, order transitions and points must preserve their backend invariants atomically; a UI warning or process-local lock is insufficient. Do not modify Medusa core or installed dependencies, and do not introduce a general locking framework without evidence.

Acceptance: record actual before/after persisted values and request payloads; demonstrate same-field and different-field behavior; show stale saves cannot silently erase a newer value on repaired paths; verify concurrent stock/points operations preserve their rules and conflict retries cannot duplicate adjustments. Retain admin/manager authorization. Add meaningful endpoint/database concurrency tests for each changed behavior and report any unresolved policy decision.

## Launch edge-case tests — follow-up requested by Seif, 25 October 2026

Scope: test the twelve launch scenarios discussed after the original audit, record failures and important limitations, then wait for Seif. No application fixes. All source tests use the same 9f8e0c2 snapshot. The original ten findings and A11 remain open; the original priority totals describe the original audit only. A12–A18 below are additional repair/investigation items with their own evidence labels. Existing findings are extended rather than counted twice where the new tests expose the same cause.

### Coverage and observed results

A diagnostic assertion succeeding means the claimed behavior was observed, including undesirable behavior. It is not a claim that the application is fixed or that all launch checks pass. FAIL in the raw probe results means a reproduced limit requiring attention, not a broken test harness. PASS_WITH_LIMIT means only the specified bounded test passed.

| Scenario | Test performed | Observation and disposition |
|---|---|---|
| S01 Cold cache / duplicate work | Actual cache middleware with 100 simultaneous identical reads; real Medusa HTTP burst against disposable PostgreSQL | Controlled test: 100 downstream executions, then zero additional downstream work for a warm read. Real small-fixture burst: 40/40 HTTP 200; process-wide SQL activity measured separately below. Raw URL variations produce distinct cache keys. Add A12. |
| S02 Redis outage / recovery | Actual installed cache provider and ioredis; pause only the disposable Redis container | 150 requests fell through after about 279 ms in the saved run, but 150 Redis commands were still pending. Commands drained after unpause. Add A13; this is stalled-socket behavior, not a long disconnected-client soak or memory-capacity test. |
| S03 Import / event backlog | Actual refresh function with controlled persistence and a serial lock; real native creation of a 200-variant product | Controlled 250-event batch queued 250 callbacks and dispatched 50 full refreshes for broad translation events despite maximum active refresh count 1. Real mixed run produced product-read timeout and many refresh lock errors. Extend A06/A09; production Redis import behavior is still unmeasured. |
| S04 Abuse / rotating identities | Actual limiter with controlled storage; real public HTTP creation bursts | Same identity allowed 5/20 attempts; different identities allowed 100/100. Native HTTP accepted 30/30 cart creations (200) and 12/12 distinct account registrations (201); no 429 within these bursts. Add A14. This does not establish that deployed edge controls are absent. |
| S05 Cart backlog | Actual cart queue with 1,000 submitted mutations and a blocked first task | 999 waited; after release all 1,000 ran. No queue cap/coalescing at this boundary. Add A15 and coordinate with A01/A04/A05. This is not a browser-click-rate measurement. |
| S06 DB connection pressure | Real disposable PostgreSQL with max_connections=30; a separate pg pool with max=2 | 30 held superuser connections exhausted the database; the next failed with SQLSTATE 53300. A pool acquisition deadline worked. Record a deployment gate: budget aggregate Medusa pools/workers/processes and exercise saturation. This generic witness is not evidence that the deployed Medusa pool is currently misconfigured. |
| S07 Long scheduled jobs | Real BullMQ repeat scheduling; then two actual Medusa Redis scheduler instances with a controlled orchestrator handler | One worker did not overlap itself. Two workers reached 2 simultaneous invocations of the same scheduled workflow with a 100 ms interval and 350 ms handler. Add A16. These are two worker instances in one diagnostic process, not an OS failover test; downstream workflows/locks may still protect mutations. |
| S08 Poison record / retries | Actual refresh fault injection; actual Medusa Redis event worker and queue | Permanent projection failure failed on each of 3 independent refresh attempts. A real queued poison event invoked its subscriber exactly 5 times and stopped; 1 failed job remained without a configured removeOnFail cap. Add A17. Backoff was reduced to 20 ms only in the native-queue diagnostic; app configuration remains 10,000 ms exponential. No infinite event retry demonstrated. |
| S09 Pagination / category recursion | Actual category fetch/tree functions against a repeated-page fixture; cycle and 20,000-deep tree fixtures | Repeated pages continued through 30 responses until the harness stopped them on call 31. A cycle was rejected. A 20,000-deep chain threw RangeError. Add conditional investigation A18; native write reachability remains unverified. The directory loader catches errors, so this is not proof of a whole-server crash. |
| S10 Input / relation expansion | Actual schemas/projector; real Medusa public HTTP | Catalog limit 25, offset 10001, q length 101 rejected with 400; the schema also rejected 51 brand IDs. A ~1.1 MB cart body returned 413. A native single-product response included all 200 variants and was 364,406 bytes with the tested fields. Projector also accepted 10,000 synthetic variants for one product. Extend A09; product-page limits do not bound relation work. |
| S11 Frontend repeated requests | Actual GlobalSearch effects in deterministic hook/timer harness | Three rapid term changes became one request; 20 stable renders added none; cleanup left zero timers. Already-started requests receive no cancellation signal. No fetch loop reproduced in this scope. Extend A04; browser navigation, DOM observers and long-lived memory still require browser checks. |
| S12 Cleanup / historical work | Actual abandoned-cart cleanup with 450 synthetic carts, deletion, protected accounts and busy locks | Terminated in 3 list pages, deleted 282 eligible carts, retained 168 protected/busy carts, with 423 per-cart reads and 27 lock warnings. Pagination progressed correctly under deletion. Keep linear work/payment-collection retention noted under growth/runbook follow-up; no disk-full or long-duration live cleanup test performed. |

### Real HTTP workload details and limits

The final one-variant baseline served 40/40 listing requests in approximately 3.324 s for the whole burst. Instrumenting pg.Client recorded 839 SQL submissions during that window and 13 during a subsequent warm request window. These counters include application background work and are not attributable only to those HTTP requests; do not divide by 40 and call the result a fixed per-request query count. A prior baseline recorded 807/6 over 2.589 s, illustrating the background variation. Cache-hit authorization and other work can still query the database.

The first mixed run created one product with 200 variants and immediately sent 40 listing requests. At least one request exceeded the diagnostic's 15,000 ms deadline. Because the initial diagnostic used Promise.all, it did not capture the full response-status distribution or a complete SQL count. Preserve that limitation. The archived run contained 178 lock-timeout log lines before it was stopped; these are log entries, not a deduplicated count of lost business events.

The final diagnostic separated the small baseline from the large-variant creation/read and waited for initial native index readiness. Its HTTP assertions passed, including a 200-variant response. Background refresh subscribers nevertheless logged lock timeouts and the runner emitted an open-handle warning before eventually exiting naturally. The final summary file records the exact log-line count. A passing HTTP assertion suite does not erase those background failures. Real HTTP uses the application's test-mode local event/lock providers; real Redis providers were exercised separately above. Do not infer production Redis throughput or failure rate from local-provider timing.

### A12 — P2: Control duplicate cold reads and cache key cardinality

Reproduced at the middleware boundary and corroborated by the real cold-read workload. Simultaneous misses independently execute downstream work; successful unrelated admin writes also evict the whole public namespace. Raw originalUrl and language headers participate in the key, so many URL/header variations can create distinct keys; native HTTP acceptance of arbitrary URL variations was not established by the key-only probe. TTL limits age, not the number of keys created within that age.

Repair/investigation: measure which public reads dominate SQL, use the smallest safe coalescing/targeted invalidation policy, and verify cache key dimensions after validation before normalization. Preserve sales-channel, locale, region and price context. Test cold concurrency and high-cardinality inputs; do not cache cart/payment authority or introduce a new cache system.

### A13 — P2: Bound cache commands that outlive caller deadlines

Reproduced with the installed cache provider/ioredis and real paused Redis. The 250 ms Promise.race is a response fallback, not cancellation: 150 cache GET commands remained queued/in flight after callers continued. Concurrent PostgreSQL fallthrough compounds the outage workload. This does not establish an RSS leak or unbounded ten-minute growth; it establishes outstanding work after caller timeout.

Repair/investigation: inspect provider-supported command/offline queue limits, cancellation and retry policy; bound optional cache work and test disconnection as well as stalled sockets and reconnection. Do not globally disable shared lock/event behavior or pretend cache fallback makes all Redis responsibilities optional. Acceptance must include stable memory/pending-command counts and no reconnect burst that harms live traffic under a sustained test.

### A14 — P2 launch gate: Verify aggregate public-endpoint abuse limits

Source and HTTP bursts establish that per-account login budgets do not impose an aggregate visitor budget, and the tested cart/account creation bursts were accepted. These small bursts are not proof of an exploit or a missing deployed WAF. Public search, cart creation, registration and email endpoints need explicit deployed protection and capacity checks; changing email addresses must not yield unlimited aggregate expensive work.

Repair/investigation: decide trusted proxy/client IP handling and endpoint-specific budgets, then verify direct-origin access cannot bypass the intended controls. Confirm ordinary shoppers do not share one proxy-IP quota. Keep account-scoped credential protection; add only the missing aggregate controls justified by the deployment. Test changing identities, two app processes, 429 recovery and provider/DB cost.

### A15 — P2: Define a bounded cart mutation backlog

Reproduced at the actual shared queue boundary: 1,000 tasks accepted, 999 blocked behind one unsettled task, then all executed. A queue protects ordering but does not limit total work. Visible controls and browser interaction still need rendered verification before claiming a particular click rate is reachable.

Repair/investigation: combine absolute quantity targets where correct, prevent excessive pending controls, define an explicit overload response and invalidate work on cart/session changes. Preserve distinct add/remove actions and unknown-outcome reconciliation; do not drop a write merely because the UI stopped waiting. Repair together with A01/A04/A05 rather than creating a second queue/store.

### A16 — P2 operational follow-up: Verify same-job exclusion across workers

Two actual installed Medusa Redis scheduler instances invoked the same scheduled workflow concurrently. The scheduler itself must not be treated as a global per-job mutex. The probe replaces orchestrator.run with a timed handler, so it does not demonstrate duplicate persisted workflow side effects. Existing catalog global locks and per-cart/per-customer locks remain relevant protections.

Repair/investigation: exercise the intended worker topology, slow handlers beyond their interval, terminate/restart an owned worker and check job-specific exclusion, idempotency and bounded scan work. Loyalty/cleanup duplicate scans can still waste resources even where individual writes are protected. Reuse native coordination where required; do not add redundant locks without testing actual workflow guarantees.

### A17 — P2 growth follow-up: Bound failed event retention and recovery work

The actual Redis event queue stopped the poison subscriber after 5 calls, then retained the failed job. App event job options configure bounded retries/backoff but no failed-job retention cap. New permanently failing events can therefore accumulate retained failures unless operations removes them. This is event-queue retention; the installed scheduled-workflow queue already has its own bounded retention options.

Repair/investigation: set an intentional bounded retention/recovery policy with diagnostics, alert on failure count/age, and provide a safe replay path. Distinguish bad data/configuration from temporary outages. Preserve idempotency and investigate a poison product's effect on full reconciliation under A06. Do not endlessly retry new equivalent jobs or silently omit products needed for exact catalog counts. No current disk or memory exhaustion was measured.

### A18 — Conditional robustness investigation: Bound category progress and depth

The source fetch loop has an 8-second per-page deadline but no total deadline or repeated-page detection. A malformed repeated full page with a large count induced more requests until the harness stopped it. This is not proof of a normal native endpoint returning repeated pages or an actual infinite loop; a finite fixed count eventually terminates. A synthetic depth of 20,000 overflows recursive tree ordering. Native Admin/category-write constraints and realistic depth have not been established.

Smallest follow-up: establish reachable limits, test normal large directories, then add progress/deadline/depth protections only where justified. loadCategoryDirectory already catches failures and exposes an error state; do not describe the RangeError as an uncaught process crash. Preserve category visibility rules and avoid silently publishing partial directories as complete.

### Existing findings strengthened; additional deployment notes

- A04: search debounce/cleanup avoids a request loop in the tested effect lifecycle, but started network work remains uncancelled. A15 adds queue admission/backlog requirements beyond request deadlines.
- A06/A09: bulk events plus variant-rich products are now a measured local failure case. Prioritize refresh coalescing, lock-wait/error instrumentation, availability and bounded relation work; capture a production-like Redis import/read test before accepting a fix.
- A07: cleanup/history work remains data-growth-dependent. The cleanup probe establishes pagination progress, not realistic production memory/query bounds.
- Database release gate: determine aggregate pool connections across server/worker replicas, enforce acquisition/query/lock time budgets where supported, and test overload/recovery on the intended topology. The 53300 witness used an intentionally small test database, not the app's deployed settings. PostgreSQL max_connections was raised only for subsequent disposable Medusa boot tests.
- Operations release gate: verify failed-job/log/file retention, disk alerts, graceful resource exhaustion and restart recovery in a disposable deployment. Disk exhaustion was not induced on the user's host. This is explicitly pending, not a passed launch check.
- A11 concurrent Admin edits remains an unverified investigation item. This follow-up does not claim that native stale-form conflicts or stock-edit concurrency have been tested.

### Reproduction artifacts and remaining coverage

Saved alongside this report:
- launch-scenario-probes.cjs and launch-scenario-results.json: 12 controlled scenario probes; actual source with mocked boundaries except the explicitly real services.
- launch-infrastructure-probes.cjs and launch-infrastructure-results.json: actual installed Medusa scheduler/event providers with real disposable Redis; handler stubs and accelerated event backoff are documented in the output.
- launch-http.spec.ts, launch-jest.config.json, launch-http-results.json, launch-http-run.log and launch-http-run-summary.json: real Medusa HTTP/native workflows/SQL against disposable PostgreSQL; no provider emails or live commerce data.
- launch-http-mixed-results.json / launch-http-mixed-run.log: the original mixed-load failure. launch-http-first-baseline-results.json / launch-http-first-baseline-run.log retain the earlier baseline and its startup/teardown limitations.
- architecture-audit-probe-rerun.json: the original five diagnostic findings reproduced again, without fixing them.

Run CJS probes with the source checkout and a dependency checkout as documented by each script's arguments. They require the explicitly named localhost disposable containers; the base scenario pool test assumes PostgreSQL max_connections=30. The HTTP test runs from apps/backend with DB_HOST=localhost, DB_PORT=55439 and a throwaway database user/password configured for that disposable container. Set RESEND_API_KEY/RESEND_FROM/REDIS_URL empty and NODE_ENV=test; never point this diagnostic at a live DB. The Jest config records this machine's dependency location. A diagnostic module-resolution error was repaired in test configuration only; no installed dependency was changed. Initial failed harness runs are not counted as application failures.

Coverage is deliberately qualified: all twelve scenarios have executable checks, but long outage/load soaks, real multi-process kill/failover, deployed proxy/rate limits, application pool settings, physical browser/observer leak tests, production-sized cleanup and safe disk-full recovery remain unverified. No measured orders/day or launch certification. No fixes, commit, push, merge or deployment; await Seif's next instruction.

## Clean code and maintainability assessment

**Keep:** native commerce workflows and module links; small brand/EDA/loyalty modules; server-owned authentication cookie; allowlisted account forwarding; server-side role and resource checks; shared product/cart services; exact variant selection; native cart totals; explicit order-ID confirmation and unknown-outcome recovery. The disconnect-sensitive allocation path now uses workflow-owned lock steps rather than response lifecycle listeners. These are good boundaries to preserve.

**Concentrated frontend state is the main maintenance risk.** Production TypeScript/TSX line counts include checkout 1,352, Navbar 1,060, LanguageContext 1,071 and cart provider 451. Length alone is not a defect: LanguageContext includes copy, and much checkout length is rendering. The concrete problem is lifecycle/state transitions coupled to fetching and presentation, as A01/A05 illustrate.

Refactor only with related fixes: keep checkout submission/recovery in a focused interaction hook, organize independent desktop/mobile navigation pieces, and make the cart lifecycle contract explicit. Do not split files merely to meet a line target or create hooks that only forward dozens of parameters.

**Localization has two representations.** Keyed/server-localized content coexists with screen-scoped DOM translation and mutation observation. The active legacy wrapper traverses the screen after mutations; the older document-wide component exists but was not found mounted in the reviewed layout. Do not report it as an active global observer. Convert touched screens incrementally to keyed rendering, then remove unused translation paths after checking callers.

**Backend organization is mostly pragmatic, with partial conceptual layer separation.** Query orchestration, pure rules and infrastructure live together in some lib files. Prefer separating a pure policy from its query/mutation adapter when editing that behavior; do not add interfaces or parallel service hierarchies without an isolation/testing benefit.

**Documentation has drifted.** ARCHITECTURE and DATA-OWNERSHIP still diagram Meilisearch, while this snapshot uses native PostgreSQL Search. The workboard's original search deployment row still mentions the removed nightly rebuild; the current minute reconciliation is materially different. Update the authoritative architecture/deployment reference and keep historical review notes as history.

## Performance and scalability judgment

| Area | Assessment |
|---|---|
| Ordinary shop browsing | Native filtered pagination is a good base. Brand-filter ID materialization remains a growth constraint. |
| Search/sorting/Deals | Bounded result pages and fresh native hydration preserve authority; full reconciliation and exact-count query cost need measurement. |
| Homepage | Fetches 100 detailed products; the ticker renders repeated groups while the card section selects eight. Reduce payload/DOM only after deciding the bounded content contract. |
| Category navigation | Request-level React deduplication exists, but root layout awaits the directory. Serial 50-category fetches each have an 8-second deadline; total time scales with page count. Backend caching helps, but dynamic render work remains. |
| Shared state | Redis modules are configured when supplied, but missing-production-config and real multi-process behavior need A02 validation. |
| Loyalty | Ledger uniqueness is good; atomicity under lost locks and unbounded historical work need A03/A07. |
| Cache | Anonymous/context separation and 250 ms read fallback are good. Wildcard invalidation scans and cold-cache stampedes deserve measurement. |

The installed legacy Redis cache provider implements wildcard invalidation using SCAN/UNLINK. Every successful non-GET admin request invalidates the entire public-store namespace, and catalog refreshes also invalidate it. This creates repeated whole-cache eviction rather than targeted invalidation. The known in-flight-read/write race can also repopulate stale values until TTL. These are recorded performance/consistency limits, not a new claim that checkout trusts cached commerce data.

Measure p50/p95/p99 for native and ranked listings, refresh duration/queue age, Redis timeout rate, DB query counts and rows, cold-cache concurrency, peak worker memory, homepage transferred bytes and real browser LCP/INP/CLS. Use representative product, variant, price-list and historical-order sizes. Do not invent an orders/day capacity from unit tests.

## Test and release engineering assessment

Fresh verification on the original checkout's unchanged tracked source:
- Storefront: **50 suites / 487 tests passed**, using `npm run test --workspace=@dtc/storefront -- --no-cache --silent`.
- Backend: **34 suites / 266 tests passed**, using the corresponding backend command.
- Both app typechecks passed with direct workspace commands, bypassing Turbo cache.
- Storefront lint passed directly. Backend lint passed directly after allowing its CLI to access its local configuration.
- Five offline probes passed by asserting the undesirable behaviors described in A01–A05. Probe assertions establish findings; they are not regression tests claiming those findings are fixed.

The first root check and no-cache retries encountered temporary transform-cache permission errors before tests could execute. Successful reruns used normal host access. Root type/lint also replayed cached results, so direct workspace checks were run separately. No assertions were weakened.

Probe: [architecture-audit-probes.cjs](<C:/Users/Seif Waleed/.codex/worktrees/architecture-audit/vi2/docs/reviews/architecture-audit-probes.cjs:1>). Run `node docs/reviews/architecture-audit-probes.cjs <checkout-with-installed-dependencies>` from this report checkout. It reads this worktree's source, uses the supplied checkout's installed compiler/runtime dependencies, mocks network/persistence boundaries and makes no provider calls or database writes. Cart probes use a deterministic hook harness rather than a browser; promote them to rendered interaction tests when fixing the application.

The root `check` runs units, types and lint. Backend HTTP/database tests exist but are separate; no committed browser E2E runner or .github workflow was found. External CI may exist and was not inspected. Add a release gate for the existing isolated HTTP suite and rendered session/cart races before treating a green unit check as deployment proof. Do not add tests that only assert source strings for these stateful behaviors.

**Not run in the original audit (see launch follow-up for later tests):** production builds, browser profiling/a11y review, load tests, real Redis multi-process/failover checks, PostgreSQL HTTP suites, production inspection, dependency vulnerability/license scan or external provider calls. No services or disposable databases were started. No launch-readiness certification is implied.

## Recommended sequence

1. Fix A01 and A05 together through the existing cart provider/queue contract; add late-response and sign-out interaction tests.
2. Add the production Redis guard (A02) and verify two processes use the same locks/events/attempt budgets.
3. Fix loyalty persistence atomicity (A03), then run real concurrency/failover and existing account HTTP tests.
4. Add consistent service deadlines/cancellation (A04), preserving indeterminate mutation recovery.
5. Remove inaccurate brand counts and homepage taxonomy heuristics (A08/A10), or wire native bounded queries if those features are required.
6. Instrument and benchmark catalog refresh, then address A06. Size the workload using variants/price lists as well as products.
7. Replace the documented historical/link scans when measurements or catalog import size justify A07/A09.
8. Investigate concurrent admin edits (A11), prioritize any confirmed stock/order/points invariant failures with the correctness repairs above, and fix demonstrated lost updates with an explicit conflict policy.
9. Refresh architecture/runbook docs and wire the release gates. Keep larger component cleanup within the related functional work.

Production checkout remains deliberately disabled until released Paymob/Bosta/Odoo work is implemented and verified. Those integrations, real catalog data, approved bilingual policy content and operational deployment checks are existing launch dependencies, not findings to “solve” with guessed implementations.

## Changes made by the original audit, before the launch follow-up

Only this report, its offline diagnostic probe and the isolated workboard claim/closure. No application fixes, shared manifest/lockfile changes, commit, push, merge, deployment or live-data changes.

Follow-up cleanup verified: both labeled disposable containers were stopped and automatically removed; the HTTP runner's database/template were absent before container shutdown. No launch diagnostic Node processes remained. Only documentation/diagnostic artifacts changed. Seif review is pending; implementation has not started.
