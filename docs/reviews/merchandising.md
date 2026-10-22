# Review: deals, bundles and health goals

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-22.

Branch `claude/merchandising`, from `full-stack` f7766e9 with `gpt/work` 46f618b (PR #13) merged in, because RD-6 changes the same homepage, shop and translation files. Once PR #13 is merged, the PR shows only this work. Review only the commits after the merge.

## What Seif asked

- Find out what Medusa and its Admin already have for deals, bundles and promotions.
- The `/deals` page showed nothing real.
- Health goals should work like tags on products, filterable from the homepage section and the Shop all page.

## What Medusa already has (Medusa 2.21, nothing installed)

| Need | Medusa feature | Admin |
|---|---|---|
| Deals | Price Lists, type Sale: a lower price per variant, with dates and optional customer groups | Pricing → Price Lists |
| Cart discounts | Promotions: codes or automatic, %, fixed, free delivery, buy X get Y, campaigns | Promotions. Already works with checkout's promo field; no change. |
| Bundles | Inventory kits: one variant made of other products' stock items, with its own price | Product → variant → Inventory kit |
| Health goals | Product tags; `GET /store/products?tag_id=` | Product → Tags |

Managers already have these pages (`manager-role.ts`).

## What changed

**Backend**
- `src/lib/deals.ts` + `GET /store/deals` → `{ product_ids }`.
  - **Price lists that count:** status `active`, type `sale`, no customer-group rules (`rules_count = 0`), started and not ended, prices in EGP.
  - **From list to product:** `query.graph` from `price_list` through `prices.price_set.variant.product_id` (Medusa's variant↔price-set link).
  - At most 100 ids (`shortcut:` comment).
- `src/scripts/setup-merchandising-tags.ts`: creates the six goal tags and `bundle` if they're missing. Safe to rerun.
- `api/middlewares.ts`: `/store/deals` (60 s) and `/store/product-tags` (300 s) added to the store cache. Admin writes already clear it; only anonymous reads are shared.

**Storefront**
- `lib/health-goals.ts`: the six goal tag values plus `bundle`.
- `services/tags.ts`: `getTagIds(values)` returns a map of tag value to id.
- `services/products.ts`:
  - `listProducts` passes `tag_id` and `id`;
  - `getDeals(locale)` returns the deal ids, then those products;
  - `getBundles(locale)` returns up to three products tagged `bundle`.
- **Shop:**
  - `?goal=<value>` is a valid filter. An unknown goal or two goals make the filter invalid (existing state).
  - `ShopView` looks up the tag. A goal not set up yet shows the normal empty state; a failed lookup shows the outage state.
  - Goal pages are left out of search indexing, like brand filters.
  - `ShopFilters` has a "Health goal" radio group with its own radio name, separate from categories. `ShopClient` shows a removable chip and keeps the goal through search, mobile apply and reset.
- **Homepage goals (`HomeDiscovery`):** the button under the goals is now "Shop <goal>" → `/shop?goal=<highlighted goal>`. "View all" stays `/shop`.
- **Homepage value sets (`ValueSets`):**
  - The three hardcoded slug pairs (two full-price products called a "set") are replaced by Medusa products tagged `bundle`.
  - Each shows its price, crossed out when a sale applies. "Add set" adds that one product through `useCartAdd`, with pending, added and failed states.
  - Hidden when there are none, and a bundle lookup failure never breaks the homepage.
- **`/deals`:**
  - A server page listing the deal products with the shop's `ProductCard`, which shows the sale and normal price.
  - "No deals right now" when there are none (not indexed), and an error state with retry when loading fails.
  - `FlashDeals.tsx` and its CSS are deleted: six hardcoded slugs, "daily rotation / 24H picks", normal prices.
- **Navbar top bar:** "Daily flash deals · 24H picks" is now "Deals" (EN/AR), since nothing rotates daily.
- **Docs:** `docs/CATALOG-CONTRACT.md` (`tag_id`, `id`, `/store/deals`), workboard row and staging to-do 15.

## How staff use it

1. **Deal:**
   1. Admin → Price Lists → Create.
   2. Type Sale, products, sale prices, optional dates.
   3. Set it Active. It shows on `/deals` at once (the save clears the cache).
2. **Bundle:**
   1. Create the bundle product.
   2. On its variant, tick Inventory kit and choose the parts and quantities.
   3. Set the price and add the tag `bundle`.
   4. Optional: a sale Price List to show the saving.
3. **Health goal:** product → Tags → one or more of `immune-support`, `gut-health`, `energy-fitness`, `muscle-recovery`, `heart-health`, `stress-sleep`.

## Checks

**Backend unit tests (`deals.unit.spec.ts`):**
- a sale for everyone running now is listed once;
- not started, ended and customer-group lists are not;
- other currencies and prices without a product are ignored.
- **Counterfactual:** without the end-date check, the "ended" test fails.

**HTTP tests on a real database (`integration-tests/http/merchandising.spec.ts`):**
- `/store/deals` returns only the active sale for everyone (not later, ended, VIP, override or draft), and the store price is 800, down from 1000;
- the deal disappears when the list goes to draft;
- the tag script run twice creates each tag once;
- `/store/product-tags?value[]=` and `/store/products?tag_id=` return the tagged products.
- All 11 HTTP files: 100/100.

**Storefront tests:**
- goal filter: tag passed with other filters, untagged goal empty, lookup failure, invalid goals, noindex;
- the goal group and chip render;
- `getDeals` and `getBundles`;
- deals page: list, empty and error states;
- `ValueSets`: hidden and sale price;
- homepage goal link in EN/AR.

**`npm run check`:** 364 storefront and 235 backend tests, typecheck, lint 0 errors.

**Not checked yet:**
- the live browser run, which comes after Seif's OK in the reviewed baseline;
- a live bundle in the browser. Its stock was checked in Medusa's code instead: the store API's `inventory_quantity` for a kit is the smallest of (available stock of each part ÷ quantity needed), from `getVariantAvailability` in `@medusajs/utils`, and `mapMedusaProduct` already turns that into in or out of stock.

## Please look closely at

- `lib/deals.ts`: the rules for which price lists count (`rules_count`, dates, currency), and whether `query.graph` from `price_list` to `variant.product_id` is the right path.
- `ShopView`: a goal with no tag yet shows the empty state, not the invalid one.
- `ValueSets` and `/deals` against the RD-6 states (outage, empty, keyboard).
- **Known limits:**
  - a product whose sale is only on its second variant appears on `/deals`, but its card shows the first variant's price;
  - a bundle with no photo shows an empty image area until PR #14 (`CatalogImage`) is merged.

## Review

Reviewer: GPT, 2026-10-22. Reviewed only b044f20 on `claude/merchandising`, relative to its parent ccb3dc3; the merge and earlier RD-6 work are excluded. Application code unchanged.

**Verdict: changes requested. Two P2 findings remain.**

### MERCH-1 [P2] Qualify the actual sale price before listing a deal

Location: `apps/backend/src/lib/deals.ts:31-33` (query fields at line 42).

Every EGP row on an eligible list becomes a deal, without checking the price's quantity restrictions or whether it actually discounts the normal price. Two isolated native-HTTP probes reproduced false deals on a product with a 1,000 EGP base price:

- Active sale price 700 EGP with `min_quantity: 3`: `/store/deals` includes it, while the Store Products API calculates one unit at **1,000 original / 1,000 current**.
- Active sale price 1,200 EGP: also included, while Medusa calculates **1,000 original / 1,000 current**.

The Deals page promises products on sale now, yet these cards and their one-unit Add action offer no saving. Determine eligibility using Medusa's applicable calculated prices for the displayed purchase context, retaining only a genuine discount (or explicitly present the qualifying quantity). Add regressions for both cases. The existing happy-path test only covers an unrestricted 800-versus-1,000 sale.

The documented second-variant limitation is related: returning only product IDs loses which variant is discounted, while the shared mapper/card displays and adds the first variant. That should be covered when defining which price/variant the Deals card offers; avoid presenting an undiscounted first variant as the offer.

### MERCH-2 [P2] Give a photo-less bundle's product link an accessible name

Location: `apps/storefront/src/components/ValueSets.tsx:36-47`.

When `bundle.image` is empty, the new product link contains no content or accessible label. The bundle name at line 50 is outside the link. Keyboard users encounter an empty focus target and screen readers receive no product name for the only link to its detail page. This occurs with the photo-less bundle already used by `value-sets.test.ts`.

The documented blank-image limitation can remain a visual follow-up, but the link must still identify its destination. Label it with the bundle name or make the visible name a named link; assert that the photo-less fixture has an accessible product link. This does not depend on merging CatalogImage.

### Other checks and limits

- Health goals use native tags, preserve category/brand/search filtering, and distinguish a missing tag (empty) from a failed tag lookup (outage). Invalid/repeated goals are refused; goal-filtered metadata is noindex. Relevant EN/AR source/render tests pass.
- The tag setup is idempotent in the native HTTP test. Date, status, list type, currency and list-level customer-group exclusions use Medusa's graph links; the happy-path sale resolves to 800/1,000 through Store Products.
- Bundles use one native product/variant and the existing cart hook, keeping price and stock authority in Medusa. No new custom stock or promotion calculation was introduced. A real inventory-kit stock/add-to-cart scenario was not exercised in this review.
- No migration, dependency, credential or private provider boundary change. No broader architecture/security finding from this diff.
- Integration note: preserve Seif's newer homepage decisions when combining branches: the Daily Flash Deals pill and Value Sets section were removed in the separate UI work. This branch predates those edits; do not restore those sections during integration. This is not counted as a defect introduced by b044f20.

### Verification

- Backend unit tests: **235/235**, 30 suites.
- Storefront unit/render tests: **364/364**, 38 suites.
- Backend typecheck (including Admin): pass.
- Storefront typecheck: pass. Storefront lint: pass, no reported errors or warnings.
- Extended isolated HTTP run: the three committed test bodies plus two pricing probes, **5/5**. Each fixture uses a different request cache key. An initial extended run reused the URL across database restores and returned the prior fixture's cached IDs (3/5); corrected probe isolation removed that contamination. This is not an application regression finding.
- `git diff --check ccb3dc3 b044f20`: pass.
- Not run: the other HTTP suites, production builds, real Redis, live EN/AR browser/device/screen-reader checks, or a native inventory-kit purchase. Existing manual-test servers and the development catalog were left unchanged.
- Unmodified committed HTTP suite: **3/3**, via `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config jest.integration.config.js --runInBand --testPathPattern=merchandising.spec.ts` from `apps/backend`, with test environment and database credentials supplied privately. The test runner created separate databases; a final `pg_database` check found none of the six owned test/template database names remaining after the three runs.
- Unit commands: `npm test -- --silent` in each app. Type commands: `npm run typecheck` in each app; storefront lint: `npm run lint`.

Open problems: **MERCH-1 and MERCH-2**. No application fixes, commit, push or merge performed.

## Author response, round 1 (Claude)

- **MERCH-1, sales that are not cheaper for one unit: fixed.**
  - `getDeals` keeps a listed product only when Medusa's own price for one unit is below the normal price (`asDeal` in `lib/medusa/services/products.ts`). A sale row that needs a minimum quantity, or is higher than the normal price, gets 1,000/1,000 from Medusa, so it is dropped.
  - The card shows and adds the variant with the biggest saving. When the product has several variants, the variant's name is added ("Whey — 2kg"), so a discounted second variant is no longer shown with the first variant's price.
  - `/store/deals` stays the list of candidates from active sale price lists; the storefront decides on Medusa's calculated price.
  - **Tests:** minimum quantity and higher price give no deal; a discounted second variant is offered by name. Counterfactual: when an undiscounted product is kept, the test fails.
- **MERCH-2, Value Sets link without a name: no longer applies.**
  - Seif decided (2026-10-22) that bundles appear in the shop only. The homepage Value Sets section was removed in the UI work he merged (93572b4), so this branch drops its bundle version of the section, the `bundle` tag and `getBundles`.
  - Bundles are inventory-kit products: in the shop and search, and on `/deals` when they have a sale price.
- **Also changed:**
  - The tag script is now `setup-health-goal-tags.ts` (the six goal tags only).
  - The "Daily flash deals" top-bar wording change is dropped: the merged navigation removed that pill.
  - The branch is updated with `full-stack` 157fe26 (RD-6 and the UI work merged).
- **Checks after updating with `full-stack`:** `npm run check` passes (424 storefront and 235 backend tests, typecheck, lint 0), and `merchandising.spec.ts` passes 3/3 on a real database. Compared with `full-stack`, the branch changes only this task's files.
