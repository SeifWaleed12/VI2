---
target: Product page audit and critique with catalog sorting plan
total_score: 24
max_score: 40
na_heuristics: ""
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Seif Waleed\\.codex\\worktrees\\catalog-product-audit\\vi2\\apps\\storefront\\src\\app\\[locale]\\products\\[slug]\\ProductDetailClient.tsx"
target_fingerprint: "sha256:a16541264d1b937da6e7d5cdca5e1232f43718645cc7a96364e2feeb31896bf3"
target_path: "C:\\Users\\Seif Waleed\\.codex\\worktrees\\catalog-product-audit\\vi2\\apps\\storefront\\src\\app\\[locale]\\products\\[slug]\\ProductDetailClient.tsx"
timestamp: 2026-10-23T11-38-02Z
slug: ale-products-slug-productdetailclient-tsx-1cb17207
---
# Catalog sorting and product-page audit / proposed plan
Date: 2026-10-23. Status: planning only; awaiting Seif's scope/action approval.
Method: dual-agent (A: product_design_a; B: product_audit_b). Both independently inspected source and native EN/AR product pages. A finished before parent consumed B detector results.
Source: local reviewed full-stack88383ca. Author/report branch: codex/catalog-product-audit. No application/backend/configuration/dependency edits, catalog mutations, push or merge.

## Decisions and current evidence
- Owner selected **In-stock items first**, meaning purchasable products ahead of unavailable ones; not an inventory-quantity leaderboard.
- Preserve existing Bebas Neue/Inter/Cairo, Ink/Warm Paper/Muted Stone, header/footer and native Medusa commerce authority.
- Shop supports category/descendants, brands, search, health-goal tags and24-item pagination. parseShopQuery currently rejects sort/availability. Brand product links and category/goal shortcuts resolve to shop.
- Deals is a separate grid: no shared filter toolbar or pagination. /flash-deals redirects to /deals; query preservation needs coverage. Brand directory/homepage/recommendation strips are not full catalog listings and do not need a new sort control.
- Installed Medusa2.21.0 native read probes: order=title and order=-created_at return200; order=price, order=inventory_quantity and order=variants.calculated_price.calculated_amount return400. Newer2.21.1+ Search Module documentation is not proof this installation has that capability.
- Prices/stock are calculated in native request context; inventory is attached after product selection. A browser sort of24 records or a capped100-product fetch cannot guarantee order across the catalog.
- Deals uses native sale Price List IDs plus Medusa's one-unit calculated price. Preserve asDeal's actual discounted variant identity/title/price; quantity-only and higher-than-base prices are not actual deals. Current MAX_DEAL_PRODUCTS=100 must not silently become the universe for a claimed full, sorted, paginated catalog.
- Official references: https://docs.medusajs.com/resources/storefront-development/products ; https://docs.medusajs.com/learn/fundamentals/query (linked-field sorting limitation). Local installed source/probes remain authoritative.

## Design specificity and overall impression
Vi2's editorial identity is coherent. Retain the warm palette, strong title/price hierarchy, crisp controls and line icons. A new visual theme is unnecessary. The largest opportunity is purchase context: selected options, visible price and actionable variant must agree; product information should help buying rather than feature internal identifiers. On mobile, a giant missing-photo block and a context-poor fixed purchase action weaken that journey.

## Design health score
| Heuristic | /4 | Key evidence |
|---|---:|---|
| Visibility of status |3| Stock/pending/error states exist; unknown stock wording diverges |
| Match with real world |2| Visible SKU, English catalog option labels in Arabic |
| User control |3| Working breadcrumbs and editable variants |
| Consistency |2| Radio keyboard pattern incomplete; mobile Buy now priority differs |
| Error prevention |2| Unmatched combinations silently resolve to first variant |
| Recognition |2| Fixed mobile action omits selected variant and quantity |
| Efficiency |2| Every radio remains a separate Tab stop |
| Aesthetic/minimalism |3| Strong theme; internal facts and large blank media compete |
| Recovery |3| Explicit cart error/retry path; transactions not exercised |
| Help/product information |2| Delivery-fee timing clear; sample catalog content sparse |
| Total |24/40| Focused improvements needed |
All10 heuristics apply to this purchase/task surface; no n/a scores.

## Technical audit score
| Dimension | /4 | Key evidence |
|---|---:|---|
| Accessibility |3| Named controls/focus; radio navigation incomplete |
| Performance |3| Bounded related read; eager/original related images |
| Theming |3| Current tokens coherent; isolated status color literals |
| Responsive |3| EN/AR1280/390 and EN320 no observed horizontal overflow |
| Integrity |2| Variant/pricing mismatch paths and HTML trust boundary |
| Total |14/20| Good foundation; integrity repair required |
Integrity verdict: fail pending two P1 risks. No P0 findings. Five-dimension scores are scoped engineering judgments, not performance benchmarks or WCAG certification.
Detector: one successful scan over product JSX directory and VariantSelector, raw[]/exit0;0 deterministic findings and0 false positives. Logic/security/browser checks exposed issues the scanner cannot catch.

## Priorities
1. **P1: Selected combination may purchase another variant.** ProductDetailClient.tsx140-150 falls back to variants[0] when no complete combination matches. VariantSelector.tsx26-49 checks each value independently. A sparse S/Vanilla + M/Chocolate catalog can leave M/Vanilla displayed while the first variant is priced/purchased. Source-confirmed negative path; live catalog has only one option dimension, so no live reproduction claimed. Fix exact matching/context-sensitive availability and disable incompatible combinations. Preserve option text/IDs, selected image, stock, price and cart/checkout identity together. Command: impeccable harden.
2. **P1: Description HTML safety contract is missing.** ProductDetailClient.tsx322 injects HTML; products.ts129 passes description unchanged; no application sanitizer found. Unsafe staff/import content could inject markup/event handlers. Sink verified; upstream guarantees unproven, no exploit/data write performed. Confirm upstream policy; default to safe text unless an approved sanitizer/rich-text contract is established. Command: impeccable harden.
3. **P2: Variant price/availability states can mislead.** products.ts62-64 borrows first-variant price when the selected variant has none; ProductDetailClient.tsx153-154 borrows first comparison price when selected comparison is absent. Preserve selected variant absence; do not fabricate sale evidence. Unknown availability must not become definitive Out of stock on action labels. Command: impeccable harden/clarify.
4. **P2: Keyboard/touch affordances need completion.** VariantSelector.tsx78-105 has radio roles but no roving Tab/arrow behavior. Both independent live checks found ArrowRight leaves Chocolate selected. Use styled native radio inputs or full radio keyboard pattern. Category chips are36px high: improve to the44px project target without claiming a measured WCAG2.5.8 failure. Command: impeccable harden/adapt.
5. **P2: Product information hierarchy and mobile purchase context.** Visible SKU at ProductDetailClient.tsx169/187 is explicitly unwanted; remove the presentation/copy only, preserving internal SKU/barcode/IDs. Current14px display-style detail headings are weak. Desktop splits image, information and buying into3 columns; group decision/action content more clearly. Mobile empty-photo square is about358px at390viewport and pushes title to abouty550; compact missing-media treatment and earlier identity improve first-screen usefulness. Fixed mobile bar at398-405 omits chosen option/quantity and prioritizes Buy now; add compact context and recommend Add to cart as primary, retain Buy now secondary. Commands: impeccable distill/layout/clarify.
6. **P2: Related-image loading.** ProductDetailClient.tsx382 passes no lazy loading to CatalogImage raw img. Lazy-load/decode below-fold images; main image remains eager. Measure responsive image costs before new machinery/dependencies; no byte-size/Core Web Vitals regression claimed. Command: impeccable optimize.

## Strengths, personas and smaller observations
- Preserve explicit stock/price states, quantity limits, cart pending/error,44px option/share targets and visible focus.
- Preserve native category links, real-only EDA registration/approval, optional bounded related products and honest delivery-fee timing.
- First-time supplement buyer: no description/photo on real whey sample limits informed comparison; SKU is not helpful replacement. Catalog completion must supply actual content, not invented supplement claims.
- Arabic mobile buyer: shell/RTL work; real option labels/values remain Flavors/Chocolate/etc. Confirm native translation ownership before any mappings.
- Keyboard buyer: Tab/Enter work, radio arrow navigation does not. No screen-reader speech claim.
- Cognitive load moderate: mobile purchase context requires recall; empty imagery consumes attention. Current product choices have at most4 values; no observed more-than4 product-specific decision.
- Emotional journey: strong visual order at entry, weak confidence when empty media/sparse descriptions dominate, some recovery from truthful availability and delivery copy.
- Main image gallery/zoom absent and mapper retains only one image. Label-reading value cannot be judged using missing/broken local media. Defer full gallery/zoom until usable real images and scope are confirmed.
- Wheyyyy-protein image targets localhost9000/static while isolated audit backend uses9004. naturalWidth0 is an environment/data limitation; do not present it as a proven deployed CSS/photo defect.
- Product page metadata inherits generic title; useful later follow-up, outside priority implementation scope.

## Proposed implementation order for owner approval
| Task | Proposed owner | Deliverable/dependency |
|---|---|---|
| CS-1 Native backend sorting contract | Claude | Define global price/availability/newest order with existing category/brand/search/goal/deals scopes before pagination |
| CS-2 Shared catalog sort UI | GPT | Shop and Deals toolbar, keyed EN/AR labels, mobile/keyboard/URL behavior; integrates confirmed CS-1 |
| PD-1 Product correctness/accessibility | GPT, Claude reviewer | Exact variant/price/availability matching, description trust boundary, radio keyboard behavior, visible SKU removal |
| PD-2 Product layout refinement | GPT, Claude reviewer | Clearer desktop/mobile information/purchase hierarchy, readable token roles, contextual sticky action, compact no-image state |
| QA-1 Cross-surface acceptance | GPT + Claude, Seif manual acceptance | Focused unit/native integration/browser regressions; owner review and merge |

Claude assignment is proposed only; no message sent or other agent task claimed. Backend contract work and independent product frontend work may run in parallel after Seif approves. Sorting UI cannot ship as working until the backend contract is verified.

### CS-1 details
- Sort allowlist: default, price_asc, price_desc, in_stock, newest. Labels: Default; Price low–high; Price high–low; In-stock first; Newest. No fake relevance/recommendation/bestseller/rating sort.
- Return existing paginated products/count/limit/offset plus applied sort; preserve native visibility, sales channel, locale, EGP region and applicable pricing context.
- Use native Medusa fields for supported order. For calculated price/availability, prove a narrow backend query extension using installed primitives. Do not upgrade Medusa, add search/dependencies, build another price/stock authority, or fetch/sort the entire catalog in Next.js. If current primitives need a derived index, first return its explicit authority/invalidation/failure/scale contract for owner approval rather than silently adding one.
- Price order must match the actual card's price and variant, including Deals' one-unit sale price; missing prices sort last rather than as invented0. Preserve multi-variant identity. In-stock-first uses the current purchasability rules, including inventory management/backorder flags; unknown availability stays explicit.
- Stable product-ID tie breaker for unchanged data; no duplicated/missing records across pages. Stock/prices may naturally change between independent requests; purchase remains backend-authorized.
- Deals membership and counts must be correct before sorting/paging; remove/replace the arbitrary100-candidate cap where needed, rather than sort a truncated subset and call it complete.

### CS-2 details
- Native accessible select in results toolbar, not hidden inside filter sidebar. Desktop beside results/search; mobile paired with Filters,44px targets, RTL and keyed labels.
- Reuse existing catalog layout/filter components for Deals with true deal scope; do not redirect Deals to unfiltered shop.
- Preserve sort with category, brand, q, goal, pagination and language switching. Sort/filter changes reset page1. Clear filters retains selected sort; existing return/retry links retain meaningful state.
- Allowlisted URL sort for refresh/bookmark/Back/Forward; invalid values use existing invalid-filter recovery. Display loading/result count and allow recovery on empty/outage states. Preserve existing canonical/locale and SEO policy.
- Cover /shop, /shop/<handle>, brand-filtered/search/health-goal shop destinations, /deals and /flash-deals alias query preservation. Do not add sort to brand directory/homepage carousels.

### PD-1/PD-2 details
- No visible SKU in EN/AR, any variant, or empty-details state; internal identifiers/types/API compatibility remain intact.
- Exact variant selection, preserve truly missing selected price/comparison, aligned unknown/sold-out/unpriced labels. No add-to-cart/checkout fallback to a different variant.
- Safe catalog description display under confirmed format policy. Do not invent dosage, ingredients, authenticity, health outcomes or stock.
- Styled accessible radio group, one group Tab stop with arrows/Space as appropriate; announce selected price/stock changes concisely.
- Proposed desktop: image at left; brand/title/options/price/availability/quantity/actions grouped at right; description/useful facts below with readable current typography tokens. Retain EDA when backed by native data, useful fixed options and genuine category links.
- Proposed mobile: expose identity earlier, maintain real media, compact absent-photo state, selected options/quantity/price visible in sticky context. Recommend primary Add to cart; keep Buy now secondary if owner approves this action hierarchy.
- Preserve current fonts/colors/header/footer and meaningful known failure handling. No full branding replacement.
- Lazy related images; no unmeasured optimization framework. Keep gallery/zoom and new medical/content fields out of this first scope.

### Acceptance
- More than24 products, plus a Deals fixture exceeding current100 cap; price/stock/ties tested across all pages with category/brand/q/goal intersections.
- Real EGP sale pricing, mixed variants/default-out-of-stock, backorders/unmanaged inventory, missing prices, unknown stock and no-price/no-compare-at variants.
- Sparse option combinations cannot activate wrong variant; no false discount. Correct Buy now/cart IDs and quantities using mocked or isolated native tests, no real purchase.
- EN/AR desktop1440/1280, mobile390/320 and product/shop breakpoint boundaries; keyboard, focus/announcements, language/query continuity and browser history.
- Empty/error/invalid-sort/retry, no SKU, safe text/description policy, no horizontal overflow, header/cart/mobile-nav layering.
- Existing storefront and relevant backend suites, types/lint/build; compare before/after source and performance where appropriate. Physical touch/native zoom/screen-reader/real approved catalog content remain explicit owner/manual checks.
- End approved implementation with impeccable polish, then Claude review and Seif merge. No implementation authorized by this planning document alone.

## Questions for Seif
1. Scope: full recommended plan (sorting plus all prioritized product fixes), or sorting + visible SKU removal only?
2. Mobile primary action: Add to cart with chosen variant/quantity (recommended), or keep Buy now primary?
