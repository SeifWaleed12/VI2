# RD-2: bilingual header and announcements

Author: GPT, `gpt/work`. Reviewer: Claude. Date: 2026-10-15.
Base: approved `full-stack` / reviewed-baseline `3d4e981`.
Status: implementation complete, awaiting independent review and Seif merge.

## Result

- Both desktop and mobile now use one AnnouncementTicker and keyed interface messages:
  - Find your daily essentials / اكتشف مكملات روتينك اليومي
  - Vitamins, minerals & sports nutrition / فيتامينات ومعادن وتغذية رياضية
  - Explore the collection / اكتشف المنتجات
- Removed SHOP SUPPLEMENTS IN EGP and ENGLISH & ARABIC, including Arabic counterparts. Kept existing Deals utility, language/currency controls, typography system, surfaces, category layout and mobile drawer.
- Reused the installed useTickerMotion hook. The identical repeated groups fill wide screens without duplicate screen-reader announcements. A compact named pause/resume button is available for motion. Hover, focus, hidden tabs and offscreen state pause via the same hook. Reduced Motion renders a single static cycle with a keyboard-focusable horizontal viewport and hides the motion control. Announcement copy uses the 14px UI role in both languages.
- Closed Claude recheck R1: while a desktop category/brand dropdown is open, scroll/resize closes it when its category band is behind the sticky search header. If focus was inside the disappearing menu it moves to the existing search trigger without scrolling. Escape still restores focus to the category trigger while visible.
- Closed R2: desktop and mobile navigation landmarks now have localized names, including subcategory drill-in panels; the desktop language/currency utility strip is a labeled region.

## Catalog verification

Read-only native Store API calls with explicit en-US/ar-EG locale returned 38 categories: five parents and 33 children, with matching IDs, handles, relationships and rank. Every Arabic name is localized except the intentionally shared scientific label CoQ10. Each of the 33 rendered child names and ID destinations matched the live native response exactly in every desktop/mobile sample. Parent labels/order also matched the five required parents. No reproducible fallback issue remained, so no category service, frontend taxonomy mapping, native translation, script, migration or catalog data was changed.

The same category directory remains shared by desktop and mobile. Existing pagination, no-store locale isolation, development fallback warnings and outage/retry behavior retain their service coverage. Adding or renaming live catalog entries was not exercised because this task does not authorize catalog writes.

## Validation

- Storefront Jest: 18 suites, **190 tests pass**, including four new localized-announcement, repeated-content and Reduced Motion cases. Existing customer-name, language-token, cart, menu and ticker lifecycle coverage stays green.
- Storefront TypeScript: pass.
- Storefront lint: pass; 20 existing warnings, no new warnings.
- Production build: `npm run build --workspace=@dtc/storefront -- --webpack`, pass.
- Impeccable detector on changed UI: zero primary findings; 18 advisory notes against existing header values / the older DESIGN snapshot. No ignores or token-document rewrites.
- Native backend response: five parents /33 children in each locale. IDs and names compared with all rendered menu samples.
- Installed Chrome, emulated viewports (not a physical mobile device): EN and AR at 320, 390, 980, 982, 1100, 1280, 1440 and 1920. No document overflow, correct desktop/mobile breakpoint, anchored dropdowns, all five mobile drill-in/back flows, native localized category links, orphan dismissal/focus recovery and labeled visible navigation pass.
- One confirmation batch at EN/AR 1440 and390: real transform movement, manual pause/resume, equal repeated-group widths /seam geometry, ArrowDown menu focus, preservation during partial scroll, Escape dismissal/focus return pass. Reduced Motion static state, hidden copies/control and keyboard viewport pass in the initial batch. Offscreen/hidden-tab lifecycle remains covered by the reused hook's tests.
- Application browser automation failed to initialize its assets; installed Chrome was used through CDP with an isolated temporary profile. Early harness selectors and OS Reduced Motion defaults were corrected before completing the batch. No application defect was hidden. Existing dev issue badge / catalog image limitations are visible in evidence.

Evidence directory: `C:/Users/Seif Waleed/.codex/visualizations/2026/10/10/01a1263c-8258-7fc0-8fc7-8d8e59bbe5b6/`:

- rd2-category-inventory.json: public native EN/AR inventory; no credentials.
- rd2-geometry.json: 16 viewport samples with menu/panel names and destinations.
- rd2-confirmation.json: four motion/keyboard confirmation samples.
- rd2-final-en-1440.jpg, rd2-final-ar-1440.jpg, rd2-final-en-390.jpg, rd2-final-ar-390.jpg; rd2-ar-drawer.jpg.

## Review focus and limits

Review the diff against3d4e981, particularly announcement accessibility/motion and the new dropdown effect's cleanup/focus behavior. Run the storefront tests/type checks and inspect both locales at the navigation boundary. Existing public-directory error tests remain unchanged. Do not change backend/catalog data to test this frontend task.

Preview: http://localhost:3001/en and /ar, GPT checkout. Canonical backend remains localhost:9000 and is source-identical to full-stack for this task. No backend code, migrations, dependencies, policy claims, authentication, cart, shop filters or product UI changed. No push or merge. Physical touch, native200%zoom, other browser engines and new signed-in/populated-cart manual sessions were not run. Whole-page legacy Arabic first-paint behavior and Forgot password remain outside RD-2; navigation/announcements use the server-selected locale. RD-3 shop and RD-4 product-local readability remain subsequent tasks.
