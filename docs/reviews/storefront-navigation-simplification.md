# Navigation simplification — author handoff

Author: GPT. Reviewer: Claude. Branch: gpt/work. Base: 5aa4d19. Completed 2026-10-15. Awaiting Claude review and Seif merge approval.

## User request and result

Seif explicitly removed New, Bundles and Shop Products from the menu and requested Impeccable UI/UX principles. Navigation now gives the five native catalog categories priority and groups Brands, Health Goals and Deals as secondary destinations. This reduces eleven competing destinations to eight without reducing text size.

- Navbar: removed all three desktop shortcuts and corresponding Shop Products/Bundles mobile shortcuts (New was desktop-only). Mobile secondary order now matches desktop: Brands, Health Goals, Deals. Category drill-in, Shop all, bottom-nav Shop, search/account/cart, real pages and homepage sections remain available.
- Desktop grouping: replaced the three-group layout with categories plus one compact secondary group. Header/search/dropdown shells return to the existing 1440px design width. Primary category gaps are 24px, secondary gaps 16px, with 32px between groups and the retained subtle divider. Deals keeps its rust emphasis and an extra 8px separation. Labels remain the shared 14px role.
- At 1400px+, the two groups occupy one aligned 64px band. At 981–1399px, categories occupy row one and the secondary group sits at the logical end of row two with 44px targets. At 980px and below, the existing drawer remains intact.
- Category dropdown: removed its redundant promotional sidebar, including duplicate Deals. The recovered column is used by subcategory links; removed the obsolete 350px minimum panel height and exclusive sidebar styles/icons. The title, category-specific Shop all and actual child destinations remain unchanged. The dropdown continues scrolling below the measured header if content is long.
- No backend, category data, translation source, business behavior, new dependency, global text role, legal content or page-route change. Shared dictionary keys were retained to avoid unrelated translation cleanup.

## Impeccable assessment and verification

Two independent source/screenshot assessments: nav_simplification_layout reviewed reading order, grouping, rhythm, structure, density, adaptation and extremes; nav_simplification_mechanical inspected callers and ran the layout detector. Current pre-edit screenshots/source at 5aa4d19 were the visual baseline. Their recommendations converged on two semantic groups and removing repeated dropdown promotions. No new critique score is claimed.

The primary task path is category -> subcategory/Shop all -> filtered shop; secondary discovery destinations support it. Proximity and contrasting group spacing express hierarchy within Wellness Editorial, without new containers or decoration. The mobile order agrees with the desktop DOM order, and long names keep natural wrapping.

- All 171 storefront tests pass (18 suites). Added bilingual rendered-header coverage for native category retention, exactly three secondary destinations and absence of removed shortcuts throughout header/mobile markup; extended real dropdown coverage to reject removed shortcuts while retaining category-ID links. An initial new-test assertion omitted the locale-home trailing slash; corrected the assertion to the existing LocaleLink contract, with no route change.
- Storefront lint passes with 20 pre-existing warnings, no errors. Production webpack build passes, including TypeScript. Backend tests were not rerun for this frontend-only removal; backend source is untouched.
- Layout detector before and after: zero findings, zero advisories across Navbar TSX/CSS and DesktopMegaMenu TSX/CSS. The scan is layout-scoped, not a claim that every design token matches the existing DESIGN.md snapshot.
- One batched live EN/AR pass, no UI correction loop required. Requested widths: 1920,1440,1400,1398,1280,981,980,390. The 981 override resolves to actual innerWidth 982 in this browser. Assertions cover five category buttons, three secondary links, correct row topology, common centers, bounds, clipping, readable14px text and document overflow. All pass.
- Both languages: wide header height approximately178.4px; compact222.4px; mobile106.8–108.8px. Screenshots show the primary/secondary groups and natural long labels; the reduced menu fits the 1440px shell.
- Live mobile drawer in EN and AR shows only the five categories and Brands/Health Goals/Deals in the discovery section. Vitamins drill-in, stable localized Vitamin C link, Back and Close work. English Health Goals drill-in also works after reordering.
- Desktop ArrowDown opens Vitamins, focuses Shop all, and positions the menu at the header bottom178.4px in both locales. Vitamins has exactly nine destinations (Shop all plus eight real children), with no sidebar. Arabic panel height is now262.3px rather than a forced350px. Escape closes the menu. Opening the empty cart closes navigation and preserves its full900px viewport height at y0.
- Proof folder: C:/Users/Seif Waleed/.codex/visualizations/2026/10/10/01a1263c-8258-7fc0-8fc7-8d8e59bbe5b6/. Files: nav-simple-en-1920.jpg, nav-simple-ar-1920.jpg, nav-simple-en-1280.jpg, nav-simple-ar-1280.jpg, nav-simple-ar-mobile.jpg, nav-simple-ar-dropdown.jpg and nav-simple-geometry.json. Native screenshots, no image manipulation. Viewport reset after checking; the existing candidate preview remains at localhost:3001 against the approved backend9000.

## Review and limits

Review this task against5aa4d19; preserve unrelated review drafts and untracked design context. Check removals across desktop/mobile/dropdowns, category links, RTL reading order, compact/wide layout, keyboard/Escape and cart behavior. Record findings in docs/reviews/storefront-navigation-simplification-review.md on claude/work; do not edit author code or merge.

Announcement wording, shop/product/footer redesign, arbitrary future taxonomy counts, native browser zoom/default-font changes and authenticated/populated-cart acceptance remain outside this removal. No catalog writes, migrations, full-stack merge, deployment or push.
