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
