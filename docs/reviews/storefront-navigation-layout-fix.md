# RD-0-NAV author handoff — desktop navigation regression

Author: GPT. Reviewer: Claude. Branch: gpt/work. Base: d356b1a. Completed 2026-10-15. Not merged into full-stack.

## Problem and implementation

RD-0 enlarged navigation to the shared readable 14px role, but the desktop row retained uncontrolled outer wrapping and top alignment. English needed approximately 1594px inside a 1440px shell and spilled promotional destinations below the categories. Arabic fit but its shorter links were approximately 8.75px above category centers. The old no-horizontal-overflow check did not detect this regression.

- Navbar.tsx separates native category triggers, Brands/Health Goals, and promotional links into three layout groups. DOM destination order and existing handlers are preserved.
- Navbar.module.css shares a 1680px maximum shell across the utility, search/account and category bands. At 1400px and above, all groups share one centered band. At 981–1399px, the whole category group spans the first row and the secondary groups share a second row. Category text can wrap within controls without a fixed 220px cap. Natural flex sizing keeps long English labels on one line when space permits. Labels remain 14px; controls stretch to the same row height, with at least 64px for categories and 44px for compact secondary links.
- DesktopMegaMenu.module.css consumes the same inherited shell width. Its existing placement below the measured header remains intact.
- Mobile drawer JSX/CSS, data fetching, native category IDs/translations, utility destinations, icon assets and account/cart behavior are preserved. No backend, catalog, dependency, global typography or announcement-copy change.

## Critique

Two isolated assessments preceded edits: nav_design_critique (design) and nav_mechanical_critique (browser/detector), with A completed before B findings entered synthesis. The Wellness Editorial palette, Inter/Cairo and recognizable category names were retained. Root issues: P1 uncontrolled capacity/wrapping, P2 vertical alignment. First-time shoppers lost a clear category-to-secondary hierarchy; keyboard users encountered a visually displaced row. Mobile drill-in remained coherent. Eleven destinations still warrant grouping, rather than equally competing labels. Redundant announcement wording remains RD-2.

Pre-fix heuristic scores: status 3, familiar language 3, user control 3, consistency 2, prevention 2, recognition 3, efficiency 2, visual clarity 1, recovery 3, help n/a: 22/36. This is the baseline critique score, not a post-fix rescoring. Archive: .impeccable/critique/2026-10-13T15-50-47Z__apps-storefront-src-components-navbar-tsx.md. First snapshot; no earlier trend comparison.

## Validation

- Root npm run check passed: 169 storefront + 199 backend tests, both type checks and lint. Twenty pre-existing storefront lint warnings remain. Final CSS adjustment changes only flex basis and the compact breakpoint; final production webpack build passed afterward.
- Live real catalog via approved canonical backend on port 9000; backend source diff against full-stack is empty. PostgreSQL was already running. Docker Desktop was stopped; started the existing installation, which restarted vi2-redis. No env/config change, migration, setup or catalog write. Backend health returned 200 after recovery.
- One batched inspection and one confirmation round. Final browser geometry assertions pass for EN and AR at requested widths 1920,1536,1440,1400,1398,1280,1100,981,980,390. The 981 request resolves to actual innerWidth 982 in this browser; adjacent mobile width 980 is verified. Checks cover all five parents, all six secondary links, common centers, intended rows, 14px text, bounds, clipping and document overflow.
- Both locales: wide header approximately 178.4px high; compact 222.4px; mobile 106.8–108.8px. Wide controls share the same vertical center; compact categories occupy one complete first row and both secondary groups share the next row. At 1920px all English parent labels fit on one line.
- Arabic and English mobile menu open, Vitamins drill-in, translated child links, Back and Close work at 390px. Desktop ArrowDown opens the category menu, focuses Shop all, and places its top at the header bottom (178.4px at 1440px). Escape closes it and returns to its trigger. Opening the cart closes navigation; the empty English cart occupies the full 900px viewport height above the header (drawer z-index 610). Arabic empty-cart close/focus was also checked. Existing automated tests cover focus hooks and navigation/cart presentation contracts.
- Actual screenshots and detailed per-control geometry live at C:/Users/Seif Waleed/.codex/visualizations/2026/10/10/01a1263c-8258-7fc0-8fc7-8d8e59bbe5b6/: nav-fix-en-1920.jpg, nav-fix-ar-1920.jpg, nav-fix-en-1100.jpg, nav-fix-ar-1100.jpg, nav-fix-geometry.json. These are native browser captures, not mockups.
- Post-fix changed-file detector: zero primary findings; 27 existing advisory comparisons against DESIGN.md (Navbar: 18, DesktopMegaMenu: 9). They concern retained palette, font-size and radius values; none were silenced. Primary Navbar markup remains clean. Source scanning cannot detect this row-placement failure, so actual geometry is the main evidence.

## Limits and review scope

- This fixes the desktop navigation regression only. Full category-translation inventory, announcement copy, shop/product/footer redesign remain their workboard tasks.
- Native browser zoom/default-font changes, arbitrary future taxonomy counts, authenticated long-name states, populated carts and checkout/order flows were not re-tested in this layout-only correction. Narrow viewport reflow is not claimed as a native zoom test.
- Backend + frontend preview remain running for Seif at 9000/3001. Port 3001 serves the GPT candidate; port 3000 was not started or changed. Nothing was merged, pushed or deployed.
- Review these three component files, this handoff and workboard update against d356b1a. Preserve unrelated review drafts and untracked design context. Write findings on claude/work; do not edit author code or merge during review.

Copyable request for Claude: Review the RD-0-NAV commit on gpt/work against d356b1a. Check EN/AR wide and compact desktop rows, 980/981 and 1399/1400 boundaries, 14px labels, natural wrapping, dropdown anchoring and keyboard/Escape behavior, mobile drawer and cart layering. Read this handoff and run relevant checks. Record findings in docs/reviews/storefront-navigation-layout-review.md; do not edit implementation or merge.
