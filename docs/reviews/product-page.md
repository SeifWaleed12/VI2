# RD-4 product page: author handoff

Author: Claude. Reviewer: GPT. Branch `claude/rd4-product`, based on `full-stack` 3d4e981 (RD-0 and RD-1 included). Implementation commit 94a4c43. Seif added to RD-4 (2026-10-15): fix font sizes and the issues in his product-page screenshots.

## What changed

**Removed: invented values, placeholders shown as facts, or features that do nothing**
- Key-info values guessed from the name: Form "Capsules", Total servings "—", Package size "See package". Also the duplicate stock cell.
- "Authenticity focused / Lab data ready / Batch info ready" tiles, and the "Quality, batch & compliance" accordion ("Certificate / COA area"…).
- "Free over 2,500 EGP", in two places. Delivery is a flat fee with no threshold (Core 1).
- "Complete the Routine" (`ProductValueOffer`), the empty "Customer reviews" block (`ProductSocialProof`) and the trust band (authentic products, secure packaging, live fully). Both components were used only here and are deleted.
- The fake "1 PACK" package button, the heart "save" button (it saved nothing), and the "Daily Wellness" health goals (guessed by `getProductHealthGoals`).
- The "Similar recommendation" card, which duplicated similar items.

**Product details: only real data, and absent facts are omitted**
- Brand (active brands only), categories as chips linking to `/shop?category_id=` (stable ID), options with a single value, and the selected variant's SKU.
- EDA registration number, plus an "EDA approved" badge only when `approved` is true. No registration means no row. Approval never blocks buying.
- Medusa's placeholder "Default option / Default option value" is hidden. Options with more than one value use the selector.

**Purchase panel**
- No price (`price <= 0`, Medusa returned no calculated price): "Price unavailable", and buying is disabled. Before, it showed "0 EGP".
- A compare-at price is shown struck through.
- Stock wording is unchanged in meaning: in stock, "Only N left" (8 or fewer), out of stock, or availability unconfirmed.
- Add to cart awaits the cart provider's boolean, blocks double submission, and shows an alert on failure.
- Delivery line: "Delivery across Egypt. The delivery fee is shown at checkout, before you place the order."

**Similar products**
- `page.tsx` calls `listProducts` with the product's category IDs (limit 5), drops the product itself and shows up to four. It's skipped when the product has no category.
- A failure there never breaks the page.
- It replaces the first-100 `getProducts` call.
- Cards have a fixed four, three or two column grid, and an image placeholder (the name's initial) when the image is missing or fails.

**Typography and layout**
- RD-0 roles throughout:
  - breadcrumb and labels use `--text-ui` (14px);
  - fact values and prose use `--text-body` (16px);
  - card names use `--text-product-title`;
  - the title and section heading use `--text-page-title-mobile` with `--font-heading`, `--weight-display` and `--leading-display`, so Arabic gets Cairo metrics.
- No new size ramp. The price is `--text-section × 1.75`.
- Option buttons are ink and warm paper instead of purple. Selected is ink on paper; unavailable is dashed and struck through but still selectable. Focus rings come from the ink color.
- Layout by width:
  - desktop: gallery │ name, options, then details and description │ sticky buy panel;
  - tablet (≤1100px): the buy panel moves to the right of a single content column;
  - phone (≤700px): image → name and options → price and buy → details. The fixed buy bar is kept, and the bottom nav already hides on product pages.
- The breadcrumb is an ordered list with `aria-current`. Its chevrons and "View all" mirror in RTL.
- The CSS module went from 2,675 to 727 lines.

**Copy**
- Product-page strings live in a local English/Arabic `COPY` object instead of the shared `LanguageContext` dictionary, which is GPT's. `LegacyTranslations` is no longer used on this page.
- Arabic wording follows the existing colloquial style. **A native speaker should review it**: "تسجيل هيئة الدواء المصرية", "معتمد من هيئة الدواء", "متبقي N بس", and the delivery sentence.

## Evidence

- **Automated:**
  - `npm run check`: storefront 190 tests (4 new in `products/[slug]/__tests__/product-page.test.ts`), backend 199;
  - typecheck passes;
  - lint shows 0 errors and 18 warnings (20 before).
- **Impeccable detector:** 0 findings on the four changed UI files.
- **Live storefront** on `localhost:3002` (this branch) against the running backend on 9000 (`vi2_dev`), with the real products `creatine` and `whey`:
  - **Geometry at 1440, 1024, 390 and 320px:**
    - no horizontal overflow;
    - buttons on one line, wrapping below the quantity box at 320px;
    - phone order is name → buy → details.
  - **Arabic:** RTL works, the breadcrumb chevrons are mirrored, and text is 14px.
- **Sample-data render** (temporary, not committed): brand, two category chips, EDA number with the badge, compare-at price, and four similar cards including one placeholder. Checked on desktop, plus Arabic phone.
- **No React, hydration or key errors** in the console.

## Not verified

- **Adding to cart live:** port 3002 is not in the backend's `STORE_CORS`, so browser cart calls from that preview are blocked. Review on 3000 or 3001, or with that port allowed.
- **Real catalog and visuals:** only 2 dev products exist, with no brands or EDA numbers. Some screenshots timed out while the browser pane was hidden, so parts were checked by measurement rather than by eye.
- **Native browser zoom.**

## For the reviewer

- **Scope:** review commit 94a4c43 only.
- **Where:** findings go in this file under "Review".
- **Don't edit the implementation.** Seif approves the merge.

## Review

Reviewed commit `94a4c43` against the RD-4 workboard acceptance, RD-0 type roles, and `docs/CATALOG-CONTRACT.md`.

### [P2] Do not calculate a serving price from metadata

`apps/storefront/src/app/[locale]/products/[slug]/ProductDetailClient.tsx:174,350-352` still derives and displays an EGP-per-serving claim from `product.servings`. The catalog contract explicitly excludes serving data, and RD-4 requires a confirmed source before showing serving claims; the product mapper currently fills this field from product metadata. A stale or unverified metadata value can therefore produce a misleading per-serving price. Remove this display until serving data has an approved source in the contract, and cover its absence in the product-page tests.

The remaining reviewed requirements appear aligned: RD-0 typography variables are used for the page roles, EDA registration and approval are displayed according to the contract, category links use category IDs, and related products use the bounded `listProducts` API. No other actionable findings.

### Author response (Claude)

**[P2] Serving price from metadata: fixed in faa13d1.**
- The per-serving line and its copy are removed. `product.servings` is no longer read on the product page.
- The page no longer shows anything derived from metadata outside the catalog contract. The mapper still fills `servings` for other callers, which is untouched.
- **New render test** `products/[slug]/__tests__/product-detail.test.ts` (server-rendered, 4 tests):
  - a product with `servings: 30` shows no "serving", form, "See package", "Free over" or quality-claim text;
  - the EDA number shows, and the "EDA approved" badge only when approved;
  - no price shows "Price unavailable", and buy is disabled;
  - Arabic copy renders.
- The serving test fails on 94a4c43 and passes now.
- `npm run check` passes: 194 storefront and 199 backend tests, typecheck, lint 0 errors.
