# A06/A09 preflight: native search versioning, loyalty and cart

This was a read-only review. I edited nothing, ran no services and changed no data.

**One limit on the evidence:** I couldn't read the installed Medusa 2.21 source. The root `node_modules` is a symlink to `…\OneDrive\Desktop\New folder\e commerce\VI2 FInal\vi2\node_modules`, which is outside this worktree, and the read tools are restricted to the worktree. Anything below about native search behaviour comes from your description plus the stack traces saved in `docs/reviews/audit-hardening-http.log:587-595`. Those traces show these native functions: `seeding.ts` (`executeSeedPlan`, `withIndexLock`, `runSeed`, `streamSeed`, `flushUpserts`), `active-version-cache.ts` (`ActiveIndexVersionCache.get`), `utils/index.ts` (`resolveActiveDefinition`) and `search-module-service.ts` (`search`, `searchMany`, `onApplicationStart_`). Native points marked **(needs source evidence)** need someone who can read that folder to confirm them.

## A06: stop routine rebuilds from taking the catalog offline

**Recommendation:** don't use `reindex` swap for routine rebuilds. Keep rebuilding in place, but only mark the catalog unavailable when the current projection is actually invalid.

1. **The cause.** `catalog-ranking-refresh.ts:77` (`runRefresh`) writes `ready = 0` before every full rebuild. The minute job (`jobs/reconcile-catalog-ranking.ts:11`) starts a full rebuild while the current state is still valid. It only has less than 60 s left on its 5-minute `CATALOG_MAX_AGE` (`catalog-ranking.ts:9`, `catalogValidUntil`).
2. **The smallest safe change.** Inside the lock, check the previous state: `ready === 1`, `valid_until > now`, and `price_version` equal to the current `catalogPriceVersion`. If all three hold, skip the `ready = 0` write and keep the previous state document during the rebuild. Publish the new state at the end, which line 120 already does.
   - **Why this is safe:**
     - Every document in the index is then either one from the previous build, which is still within its stated validity, or one just recomputed.
     - Incremental refreshes already work this way: they keep `ready = 1` and the revision (lines 117-120).
     - The catalog route still refuses to serve when the state has expired or the price version has changed (`api/store/catalog/route.ts:19` and `:31`). So a rebuild that runs past the old `valid_until`, a scheduled price boundary, or a price-list edit during the rebuild still returns an honest 503.
     - A request that spans the final publish sees the revision change and gets one 503 (route `:31`).
   - **When the previous state is invalid,** keep today's `ready = 0` behaviour. That is the honest response.
   - **Effect on versions:** no new physical versions, no cleanup, and no exposure to the cross-process version cache.
3. **Failure path, with an owner decision.** On failure, line 125 writes `ready = 0` for every failure, including an incremental refresh that hits one poison product (S08/A17). One bad product therefore takes search, sorting and Deals offline for everyone until a full rebuild succeeds, and a permanent poison product can make that a lasting outage. The smallest change: if the previous state was valid, leave it in place, log or alert, and let the durable event retry run. The state still expires at its own `valid_until`.
   - The cost is that one product's sort keys or Deal flag can be stale for that time. Prices and stock shown to shoppers still come from native Medusa (`storefront/.../catalog.ts:33-45`). Seif should accept that trade-off explicitly.
4. **The 60 s margin.** The 60 s margin (`reconcile-catalog-ranking.ts:11`, `catalog-ranking-refresh.ts:61`) only prevents 503s if a full rebuild takes less than 60 s. Measure it with the duration log already at line 29. Whether to raise the margin or `CATALOG_MAX_AGE` is a freshness-policy decision for Seif, not a code fix.
5. **Why not swap for routine rebuilds:**
   - **Lost writes (needs source evidence).** After a swap, another process can keep using the old active version for up to its 30 s soft / 10 min hard TTL. Incremental upserts from that process would go to the retired version and be lost until the next full rebuild, while the state document says the catalog is ready. Unless native code writes to both versions during that window, this is a correctness bug, not just extra load.
   - **Cleanup can break readers.** Native cleanup drops older versions. If it drops a version while another process still has it cached, those reads fail. Each swap also adds a physical version. A safe version needs age-based retention (keep anything retired for less than the 10 min hard TTL plus request time, which at a 5-minute cadence means about 3 versions). I can't confirm native cleanup supports that **(needs source evidence)**.
   - **Where swap does belong.** Keep swap or native seeding for schema changes only. That already happens at startup as `schema_changed`, seeding `product_v1` (log lines 587-588).
6. **Tests.** `lib/__tests__/catalog-refresh.unit.spec.ts:67` asserts the old unavailable-first behaviour and needs to change. New cases:
   - a full rebuild with a valid previous state never writes `ready = 0`;
   - an invalid or price-changed previous state still does;
   - a failed rebuild after a valid state keeps that state;
   - publishing after `valid_until` leads to a 503 from the route.
7. **Fewer full rebuilds (needs evidence).** Native link modules emit `<Link>.attached/.detached` events (log line 590, `LinkSalesChannelStockLocation.attached`), and `subscribers/catalog-ranking-refresh.ts:20-23` already listens to some of them. If the product-brand link emits the same events with a product id in the payload, the subscriber can refresh only that product. The 5-minute full rebuild exists to catch link changes that have no event (job comment, line 7). Confirm the link event's name and payload before lengthening that cadence. The cadence itself is Seif's decision.

## A09: bound brand filtering and bundle discovery with what already exists

**Brand filter.** Today `api/catalog-filters.ts:26-34` (`filterProductsByBrand`) turns up to 50 brands into an unbounded `id` list and passes it to native `/store/products`. The storefront takes that path only for default sort with no search and no Deals (`storefront/.../services/catalog.ts:12`). The derived product index already has a filterable `brand_id`, keeps only published products, and filters by sales channel (`search/product.ts:20`, `lib/product-search.ts:44-58,74`).

- **Smallest change:** send brand-filtered browsing through `/store/catalog`. Its pages come back as ids that are then loaded from native `/store/catalog-products`, so Medusa still decides what is visible and the price shown. This means another condition in `catalog.ts:12`.
- In the middleware, read at most a limit + 1 product ids from the brand link (`take` with a count). Over the limit, reject with a 400 or send the caller to the catalog route; never build the full list.
- **Owner decision:** brand-only browsing would then go down whenever the projection is unavailable. After the A06 change that should be rare, but it is still an availability trade-off. The page count would also come from the projection, as it already does for every other sort.
- No new index and no `query.index` are needed.

**Bundles.** Today `lib/deals.ts:28-34` (`bundleProductIds`) reads every variant-to-stock-item link, groups them in memory, then cuts to 100. `catalogDocuments` already loads `variants.inventory_items.inventory_item_id` (`catalog-ranking.ts:75,104`).

- Add a filterable `bundle` field: 1 when any variant has 2 or more distinct stock items, which is the `kitProductIds` rule.
- Serve bundles from `/store/catalog` with a `bundle=1` filter and limit/offset, then load the products natively as Deals already does.
- Notes:
  - Changing the index schema triggers native reseeding on startup into a new physical version. It's a one-time deploy step and Seif should approve it.
  - The projection only holds published products. Today's route also returns draft ids, which the native load then drops.
  - Paging bundles beyond 100 (`MAX_BUNDLE_PRODUCTS`) is a product decision. Don't just raise the cap.

## Loyalty and points

No P1 found. The ledger has the unique `(kind, source_id)` index (`models/points-entry.ts:12`), and `withCustomerTransaction` (`service.ts:11-19`) holds a per-customer Postgres advisory lock for the whole transaction. Together those fence duplicate and racing writes.

- **P2, possible connection-pool deadlock (depends on sizing; needs pool and concurrency numbers).**
  - **Where:** `recordPoints` (`lib/points.ts:109-124`) holds one pooled connection for its transaction while the delivery calculation calls `takeEarlierRefunds` → `orderRefunds` (`points.ts:73-77,86`, called from `subscribers/points-on-delivery.ts:18-19`). That `query.graph` needs a second connection from the same pool.
  - **Failure mode:** enough deliveries at the same time can each hold one connection and wait for another (the S06 pool budget). They then time out at 15 s and retry.
  - **Fix:** read the refunds before entering the transaction. Inside it, compare the order's refund entries in the ledger with that list, and abort and retry if the ledger has a refund the list doesn't. This avoids over-earning when a refund lands mid-delivery.
- **P2, nightly expiry may never reach some customers (needs source evidence).** `jobs/expire-points.ts:37` uses `expire: 300` and aborts through the signal. If the native lock is not renewed while the job runs and the job takes more than 5 minutes, the job stops every night at about the same point in customer-id order. Customers after that point would never expire. Confirm whether the lock renews, or let the job resume from where it stopped.
- **P3, repeated heavy reads on the points page.** `api/store/customers/me/points/route.ts:21-32` loads the full order graph on every request for every delivered order that has no earn entry, for example orders placed as a guest.

## Cart provider and queue

No P1 or P2 found. `cart-queue.ts` caps the queue at 20, `reset` handles sign-out, and promotion apply and remove now go through the same queue (`cart-provider.tsx:364,389`).

- **P3, a change to an unconfirmed line is lost silently.** Removing or changing quantity on a line that was just added and has no id yet (`cart-provider.tsx:298-305,346-353`) updates the screen but sends nothing. When the queued add finishes, the line comes back with no error.
- **P3, brief flicker on a rejected change.** When the queue rejects a change, the rollback (`:209,247-250`) restores that click's own snapshot. That can briefly remove other changes still waiting in the queue, until the queue empties and the confirmed cart is shown again.

## Waiting on Seif or more evidence
- **Seif to decide:**
  - keep the previous valid state when a refresh fails (A06 point 3);
  - the freshness margin and `CATALOG_MAX_AGE`;
  - brand-only browsing depending on the projection;
  - paging bundles beyond 100;
  - the reseed deploy step for the new `bundle` field.
- **Needs evidence:**
  - native swap: whether it writes to both versions, plus cleanup retention and cache behaviour (needs `node_modules` access);
  - the product-brand link event's name and payload;
  - whether native locks renew;
  - the deployed pool size compared with how many subscribers run at once;
  - measured full-refresh duration at realistic catalog size.
