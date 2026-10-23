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