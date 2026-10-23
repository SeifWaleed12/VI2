# Product-page implementation / Claude review

## PD-1 correctness and accessibility
GPT author on codex/catalog-product-audit, base c856bb0. Claude reviews only; Seif controls merging.

Changed:
- Exact complete option matching; initialize from a real native combination. An impossible combination disables both purchase paths instead of using another variant.
- Never borrow a missing selected price/comparison from the first variant. Unpriced variants remain unavailable; native SKU identifiers stay in the data model but are not shown.
- Styled native radio groups provide built-in keyboard navigation. Availability accounts for all selected options; unavailable combinations remain selectable so a sparse combination can be corrected without trapping navigation.
- Catalog descriptions render as escaped plain text. HTML formatting is intentionally not interpreted; existing HTML descriptions will show literal markup until catalog content uses the plain-text contract.
- Unknown stock wording is consistent; localized page is excluded from legacy DOM replacement. Related images request lazy/async loading.

Verification: 5 focused suites /41 tests pass; storefront TypeScript and lint pass. Tests exercise sparse combinations, exact variant/quantity cart and checkout payloads, repeated cart activation, missing price/comparison, escaped unsafe descriptions, EN/AR SKU removal and native radio structure. No backend/catalog/dependency changes or real cart/checkout actions in these tests.
Native browser radio navigation and full visual checks follow with PD-2.

## Review prompt
Review PD-1 on codex/catalog-product-audit, using its recorded commit. Read docs/reviews/catalog-product-audit-plan.md and this file. Check impossible combinations cannot submit another variant; native options and missing pricing/stock stay honest; no visible SKU; descriptions cannot execute HTML; native radio/translation behavior and cart duplicate protection remain intact. Append findings here. Review only; do not edit application code.

## PD-2 layout and mobile purchase context
Implemented after PD-1: two desktop columns with identity/options/purchase together; real details and safe descriptions below; mobile identity before media and160px absent/broken-photo stage. Functional section headings use the existing24px UI role; category links use16px text and44px targets. Mobile sticky action is Add to cart, with selected values, quantity and total, shared pending/added/failed handling and Buy now retained as secondary in-page.

Verification in progress: all46 storefront suites /441 tests pass; final lint and types pass. Native EN/AR whey page at1280x900 and390x844, plus320/700/701(actual browser width702)/982/1440 checks: no measured horizontal overflow; arrow key changes the native selected radio, selected price/availability updates, unavailable choice disables purchasing. No live cart submissions or purchases; ordinary anonymous app initialization may create an empty cart. Backend unchanged. Existing development catalog has missing media, untranslated native option values and sparse description content; these remain honest data limitations.

Evidence: C:/Users/Seif Waleed/.codex/visualizations/2026/10/10/01a1263c-8258-7fc0-8fc7-8d8e59bbe5b6/product-implementation/. EN full-page files and AR *-valid.jpg viewport files show final source. AR *-full.jpg and initial clipped files have a browser capture offset and are not overflow evidence; native viewport captures and DOM geometry establish correct alignment. Impeccable post-change scan[]/exit0. Production webpack build, lint and types pass. Independent Impeccable finish reviewer disposition ship with no material fixes; ordinary-extension documenter confirms existing-system match with no new tokens/system files needed. One additional related-image regression passes (442 passing cases in aggregate: full441 plus the added case); physical touch, screen-reader speech, native zoom and real content completeness unverified.

### Final disposition and boundaries
PD-1 commit796fee7; PD-2 is the next commit after it. Product tasks ready for Claude review; no push or merge. All441 tests in46 suites passed together; the later added related-image assertion plus product interaction suites also pass. Existing React mock prefetch warnings and the intentional offline-region console message remain test-harness output; lint has0errors/0warnings. Native backend unchanged, so no backend checks/migrations were run for this frontend task.

Impeccable finish contract: persistence pass (existing plan/ownership/evidence); fidelity match in type/material/ground/composition with RTL adaptation; scoped Operate ceiling reached; material_fixes none; keep exact price/variant identity, truthful states, native radios and mobile Add to cart. Documenter found unchanged globals and pre-existing missing PRODUCT.md/DESIGN.md/sidecar, so preserved them without creating a new system. No full-site or sorting approval is implied.

### Claude prompt for both completed product tasks
Review codex/catalog-product-audit from c856bb0 through the PD-2 commit recorded in WORKBOARD, including796fee7. Read this file and the approved catalog-product-audit-plan.md. Check exact sparse variant matching, selected price/comparison and native stock; no SKU; safe plain-text descriptions; native radio keyboard/focus; EN/AR desktop/mobile composition; mobile Add to cart/quantity/total/pending/failure and related-media loading. Re-run relevant storefront tests/static/build checks. Append findings under Round1 here. Review only; do not change application code. Backend sorting is not implemented and awaits Seif's derived-index decision; do not mark it delivered.
## Round1 — Claude review (2026-10-23)
Reviewer: Claude. Range c856bb0..b6aef5c (796fee7 PD-1, b6aef5c PD-2) on codex/catalog-product-audit. Review only; no application code touched. The branch has since moved to 5b7c7a3; I reviewed only through b6aef5c.

**Verdict: approve with minor findings.** No blocking defects. All six P1/P2 items in the audit plan are addressed in source.

### Re-run at b6aef5c (sparse-free worktree, shared node_modules)
46 suites / 442 tests pass, `tsc --noEmit` exit 0, eslint clean. I did not run a production build, and I did not open the pages in a browser (no native EN/AR/desktop/mobile pass, no real arrow-key check, no live cart). Everything below is from source and tests.

### Verified against the review prompt
- **Exact variant matching (P1).** `matchesSelection` requires every selected option to exist on the variant and match (trimmed, case-insensitive); the old fall-back to `variants[0]` is gone. With variants present and no match, price is 0, stock 0, `invalidSelection` is true, `canBuy` is false, so both Add to cart and Buy now are disabled and `addToCart` also returns early on `!canBuy`. The variant id sent to cart/checkout is `selectedVariant?.id`, never another variant. `selectOption` resets quantity to 1.
- **Selector availability.** Each pill is tested against the full current selection, so sparse S/Vanilla + M/Chocolate no longer shows M/Vanilla as purchasable. Unavailable pills stay selectable so a shopper can recover; `initialSelection` starts from a real native combination.
- **Pricing honesty (P2).** A variant with no calculated price is 0 and renders "Price unavailable"; it no longer borrows the first variant's price. Compare-at appears only when original > price, at both product and variant level.
- **No SKU.** No `sku` copy or markup remains in the product route; the data model keeps it.
- **Description (P2).** `dangerouslySetInnerHTML` is gone; description renders as an escaped `<p>` with `white-space: pre-wrap`, so line breaks survive. Tests cover unsafe input. Known cost, already disclosed: existing HTML descriptions show literal tags until content is plain text.
- **Native radios.** Real `input[type=radio]` grouped per option in a `fieldset/legend`, visible `:focus-visible` ring on the pill, 44px targets.
- **Cart duplicate protection.** The shared `addInFlight` ref guards both the in-page and sticky buttons; pending/added/failed states are shared. Buy now stays in-page as secondary.
- **Mobile bar.** Add to cart is primary and shows selected option values, quantity and total.
- **Related images.** `loading="lazy" decoding="async"` on below-fold cards only; the main image is untouched.

### Findings
**P3-1 — Out-of-stock and impossible combinations share one label and style.** A real, priced variant that is simply out of stock gets the option label "Not available with this selection" (and dashed/line-through styling), the same as a combination that does not exist. Shoppers lose the "out of stock" signal on the pill itself; the page-level availability line still says Out of stock. Consider distinguishing the two, or using wording that fits both.

**P3-2 — Initial selection ignores availability.** `initialSelection` picks the first variant that matches all options, even if it is unpriced or out of stock while another variant is purchasable, so the page can open on "unavailable" when a buyable option exists. Same as the previous first-value behavior, so not a regression; a preference for the first purchasable variant would be friendlier.

**P3-3 — Availability is read twice.** The price row is `role="status"` and contains a visually hidden copy of `availability`, while the visible stock line below says the same thing. Announcing changes is the intent, but a linear screen-reader pass hears it twice. Either make the visible line the live region or drop the hidden copy.

**P3-4 — Mobile cart failure shown twice and only one is announced.** On failure the sticky bar shows `mobileError` (no `role`), and the in-page `role="alert"` message also shows. Visually duplicated on mobile; announcement is covered by the in-page one. Not harmful.

**P3-5 — Dead CSS.** `.outOfStockNotice` in `VariantSelector.module.css` is no longer used. Delete it.

**Info — sticky bar dropped the product name.** It now shows options, quantity and total only. This is intentional for context, and the name is on screen above, but on a long page the name is no longer visible beside the action.

### Not verified
Native keyboard behavior, EN/AR visual composition at 320/390/700/982/1280, screen-reader speech, real cart/checkout, and the production build. Treat the author's browser evidence as unreviewed by me. Backend sorting is not part of this range and I did not treat it as delivered.

## Author response, Round1 — 2026-10-23
Imported Claude's exact Round1 review from commit1c32d3e. Verdict for the original range was approve with minor findings; this follow-up awaits Claude recheck.

- P3-1: chose the review's neutral-wording option: "Unavailable" / "غير متاح" on unavailable option controls covers both a sold-out variant and a nonexistent combination. The page-level status still gives the precise reason. Dashed styling remains intentional.
- P3-2: initial selection prefers the first compatible native variant with a finite positive price and native purchasability, then falls back honestly to the first compatible variant if none can be bought. No real-option defaults use the same preference. Explicit sold-out/impossible choices are never overridden; they remain disabled for purchase. A small shared presentation predicate keeps initial/default and pill availability consistent; no backend rules changed.
- P3-3: removed the hidden stock copy from the price status. The visible stock line is its own polite status. No duplicate hidden availability remains.
- P3-4: the in-page error is hidden at the mobile breakpoint, where the sticky error now has role=alert. The sticky bar remains hidden on desktop. Both representations share the existing cart state; exactly one error/alert is visible and accessible per viewport.
- P3-5: deleted the unused outOfStockNotice CSS.

Validation:
- All46 persistent storefront suites /451 tests pass. Added cases for sold-out/unpriced/nonfinite initial variants, native purchasability at zero stock, malformed option maps, honest all-unavailable fallback, explicit sold-out selection, neutral option wording, one availability copy and mobile error role.
- Storefront lint, types and production webpack build pass. Generated next-env path changes excluded.
- Disposable SSR fixtures used the actual ProductDetailClient, VariantSelector and CSS with only contexts/icons/cart-failure state mocked. EN/AR at320/390/700/701(actual702)/1280: exactly one visible role=alert in every case, M selected rather than sold-out S, no horizontal overflow. No JS/cart/order/backend calls from these static fixtures. Screenshot font registration/chrome are fixture-only; these are error-state checks, not new full-site visual approval.
- Evidence: C:/Users/Seif Waleed/.codex/visualizations/2026/10/10/01a1263c-8258-7fc0-8fc7-8d8e59bbe5b6/product-review-round1/measurements.json, en-mobile-error.jpg, ar-mobile-error.jpg. Desktop capture is auxiliary and clipped by the browser panel; use DOM measurements for desktop error count.
- One design scan: no real UI findings. One false positive points to the existing img assertion regex in product-detail.test.ts:92, not a rendered image. No test weakened or suppression added.
- Fixture test/server stopped and removed; browser tab closed/viewport reset. No backend/schema/catalog/dependency changes, push or merge. Physical screen-reader speech and real cart flow not rerun; existing full-page visual evidence remains from PD-2.

### Recheck prompt
Review the Round1 follow-up commit on codex/catalog-product-audit after5b7c7a3. Read Claude Round1 and this author response. Verify P3-1–P3-5, especially initial preference never overriding explicit selections and one visible/accessible error per breakpoint. Append Round2 here; review only, no application edits. Sorting is still outside this review and awaits the owner's index decision.
