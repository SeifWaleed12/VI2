# RD-0 — Shared bilingual typography foundation

Author: GPT. Reviewer: Claude. Implementation commits: 16899c0 and 8bf7e95 on gpt/work. Base for the task: 0cfc88e. Separate baseline synchronization f1c1f6e incorporates the already-approved full-stack order-export protection 09ab9cb; that backend change is not RD-0 implementation.

## Problem and result

Controls, captions and fields used competing 3–13px literals. Arabic h1/h2 rules forced every heading to a large size, while module-level font and line-height rules differed across languages. Fonts themselves were already correctly supplied by next/font.

The storefront now has shared rem-based text roles, language-aware reading/display aliases and Arabic display metrics. Repeated text on navigation, shared cards, search, cart, footer, discovery, account, checkout and order-success surfaces uses these roles. Primary page titles share a locale-aware scale; the shop's only local change wires its title into that role. Tiny shop filter/detail typography remains RD-3/RD-4.

## Role contract for other authors

Use these existing globals.css variables; do not create another ramp.

| Role | Variable | Default root size |
|---|---|---|
| Body, prose and fields | --text-body | 1rem / 16px |
| Navigation, controls and metadata | --text-ui | 0.875rem / 14px |
| Secondary captions, count badges | --text-caption | 0.75rem / 12px |
| Shared product-card title | --text-product-title | 1rem / 16px |
| Ordinary price | --text-price | 1rem / 16px |
| Commerce section heading | --text-section | 1.5rem / 24px |
| Primary page title | --text-page-title, --text-page-title-mobile | Responsive rem ramp; separate Arabic metrics |
| Editorial section heading | --text-editorial, --text-editorial-mobile | Existing condensed English emphasis; smaller Cairo metrics |
| Brand statement | --text-brand-statement, --text-brand-statement-mobile | Large identity lettering; separate Arabic metrics |

--font-ui resolves to the loaded Inter family for English and Cairo for Arabic. --font-heading resolves to Bebas Neue/Cairo. Aliases live on body so they resolve the next/font variables defined on the same element, not the root fallback names.

--leading-body is 1.6 English / 1.75 Arabic; --leading-ui is 1.45; --leading-display is 0.9 English / 1.2 Arabic. --weight-display is 400 English / 800 Arabic. --tracking-ui is 0.04em English / zero Arabic. Essential muted text uses --text-muted (existing Deep Stone). Prose has a 65ch maximum measure.

Retain each component's relevant role rather than forcing all headings to an identical font size. Arabic email/reference fields still use LTR direction. No font assets, weights, dependencies or package files were added.

## Scope and preserved behavior

- CSS role migration plus presentation-only inline-size replacements; no auth, cart, checkout, product mapping or commerce logic changes.
- Existing font imports, colors/identity, icons, images, responsive navigation, motion and reduced-motion behavior preserved.
- Larger labels wrap instead of shrinking at narrower desktop sizes; shared button labels can wrap, count badges can expand, and selected order strings can break safely.
- Footer/selected metadata/placeholder contrast strengthened. Footer logo, links and policy content remain RD-5.
- Duplicate global font/RTL overrides removed. Generic Arabic heading-size and forced heading-weight overrides removed.
- Shop CSS changes only primary title size/family/weight/leading. Filters, unsupported controls and product-detail CSS remain their assigned tasks.
- Claude's catalog adapters, types, backend work and newly arrived catalog-contract review draft were not edited.
- Existing unrelated dirty review notes and untracked Impeccable documents remain untouched.
- No catalog writes, migrations, backend startup/reconfiguration, provider work, new packages, pushes or full-stack merge.

## Validation and evidence

- Root npm run check: 169 storefront and 199 backend tests pass; both type checks and lint pass. Twenty existing storefront lint warnings remain.
- Production storefront build uses webpack for the existing external node_modules junctions and passes.
- Both locale homes inspected at 320, 980, 981 and 1440px; 390px mobile also inspected. Computed body is 16px, shared product-card names 16px in both languages, Inter/Cairo resolve correctly, and no document-level horizontal overflow was detected.
- Desktop and mobile sign-in, checkout, missing-order confirmation state, shop and product routes checked for role propagation/regression. Sign-in fields are 16px in both languages; Arabic primary title is 56px desktop / 28px at 390px.
- Hydrated Arabic sign-in labels and password visibility control verified. Search opens with 14px chips, 18px mobile search input and 16px empty-state prose; the empty cart opens above navigation and uses 16px prose.
- Separate independent source and mechanical assessments preceded edits. The changed-target type detector returned 102 advisory findings, all design-system-font-size comparisons against the dated DESIGN.md snapshot. They cover retained display/illustrative sizes and deferred shop controls; this is not a clean-scan claim. The old untracked design snapshot is preserved; this handoff defines the new role contract.
- No new CSS snapshot tests were added: existing behavior tests and rendered computed-style/interaction checks verify this presentation-only change.
- Backend files on gpt/work are synchronized with approved full-stack 09ab9cb, including order-export protection. The development frontend at 3001 uses the already-running canonical backend at 9000.
- Screenshot: C:/Users/Seif Waleed/.codex/visualizations/2026/10/10/01a1263c-8258-7fc0-8fc7-8d8e59bbe5b6/rd0-ar-mobile.jpg
- Computed browser observations: same artifact directory, rd0-browser-checks.json.

## Remaining acceptance and later tasks

- RD-2: desktop utility/category composition and announcement copy.
- RD-3: local shop filters/toolbar typography, real backend filtering and pagination. Those controls still have old sizes; no claim that the shop redesign is complete.
- RD-4: local product key-info, category chips and variant typography/data; the purple selector/routine/trust sections are not changed here.
- Real signed-in customer display/long-name stress, large real catalog/native Arabic product names, populated-cart/real-order visuals and native browser zoom/default-font-setting tests remain manual acceptance. Narrow-viewport reflow was checked; it is not claimed as a native browser zoom test.
- Existing missing-image warnings from the small local catalog are unrelated and remain for the relevant catalog/product task.

## Review

Review only implementation commits 16899c0 and 8bf7e95 and this handoff. Record findings in docs/reviews/storefront-typography-foundation-review.md on claude/work. Do not modify implementation code or merge it during review. Seif approves merging after review.

Preview: http://localhost:3001/en and http://localhost:3001/ar (candidate typography). The approved preview at port 3000 remains the full-stack release.
