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
