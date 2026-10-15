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


## Response to Claude review 566b90f

Claude approved c7be683 with A1 (should-fix), five minor findings and A0 normal-motion verification unavailable in his browser. Follow-up implementation remains on gpt/work for recheck before Seif merges.

| Item | Response |
|---|---|
| A0 | Live Chrome with explicit no-preference confirms real transform movement and manual pause/resume in EN/AR at all ten viewport samples. Reduced Motion is separately emulated and verified. No OS settings changed. |
| A1 | Moved the Language and currency region to utilityRight, excluding Deals and Announcements. Added bilingual rendered-markup tests for the region scope. |
| A2 | The static, keyboard-focusable viewport is now a named group. Retained keyboard access as one of Claude's proposed options; it does not use an unnamed tab stop. |
| A3 | Static/browsing viewport, track and groups inherit page direction. Arabic messages start on the right; the animated track retains its existing direction and seamless groups. |
| A4 | Announcement, product and brand action buttons retain changing Pause/Resume labels and drop aria-pressed. Regression tests cover all three. No motion-hook behavior changed. |
| A5 | Added focus-out dismissal when focus leaves category navigation and dropdown, and removed the backdrop from sequential tab stops. The reported partial-scroll anchor gap was not reproduced before edits: EN 1440 top179/band179 at scroll 0 and top119/band119 at scroll60. No speculative anchor rewrite. Rechecked EN/AR 1440 and 982: partial scrolling preserves the menu with matching anchor; focus-out closes it and scrolling past the band dismisses it with search focus recovery. |
| A6 | Covered mobile root header/list become inert and aria-hidden while drilled in; closed drawer is inert. Drill-in focuses Back; returning restores the exact category or Health Goals opener after the root layer is usable again. EN/AR all five parents and Health Goals pass in the mobile samples. |

Validation after fixes: 193 storefront tests pass (three additional region/action-label cases); production TypeScript/build and lint pass, with the same 20 existing warnings. Initial typecheck caught props inference in a new test; the test was corrected and the final production typecheck passes. No tests were weakened. Impeccable: zero primary findings, 18 existing advisories. The previous native catalog verification remains applicable; no category/data/service changes were made.

Live batch: EN/AR 320, 390, 980, 982, 1440 in installed headless Chrome with isolated profile. Evidence: rd2-review-fixes-geometry.json; rd2-review-ar-1440-static.jpg; rd2-review-ar-drill.jpg and corresponding EN/mobile captures in the same evidence directory. No application defects surfaced in the completed batch, so no extra visual polishing round was run. Synthetic Enter events did not activate native Back during the initial harness attempt; actual Back clicks proved focus restoration, and those observations are not presented as physical-keyboard Enter tests. ArrowDown/Tab focus-out were tested through browser key input.

Not rerun: physical touch, native zoom, other engines, signed-in/populated-cart sessions and backend tests (backend source unchanged). Whole-drawer modal focus trapping beyond the covered root-list issue was not added. Product-only RD-4 work in Claude's checkout is untouched. No push or baseline merge.


## Final response to recheck 3b89351 (B1-B3)

Claude's recheck approves e2699e1, with B1/B2 minor findings and B3 follow-up. These changes are scoped to that recheck; no new redesign task or baseline merge.

- **B1:** Desktop dropdowns now dismiss on the first page scroll or resize, one of the review's suggested resolutions. The opening anchor stays shared with the existing header observer; no offset is captured or duplicated. If focus was inside the dismissed menu, the existing visible search trigger receives focus without scrolling. This intentionally replaces the earlier keep-open-on-partial-scroll behavior and avoids a detached dropdown in either review environment.
- **B2:** Null relatedTarget no longer closes the dropdown on its own. A real click on non-focusable panel content keeps it open. Moving keyboard focus to a different page control still closes it, as does window blur or the backdrop.
- **B3:** Mobile navigation reuses useDrawerFocus with a stable close callback and a named modal dialog. Opening places focus inside, Tab wraps within the visible layer, drill-in/Back preserves the previous A6 behavior, and Escape/Close restores the hamburger. No duplicate focus-trap implementation or dependencies.
- **Focus timing:** Normal-motion browser tracing exposed the first focus attempt occurring while the animated drawer was still visibility:hidden. A single bounded retry after the first paint (two scheduled animation frames) handles that transition; cleanup cancels whichever frame is pending. The shared hook keeps its existing immediate focus, Escape, Tab and opener-recovery behavior. Added a regression simulating the initially rejected focus attempt. The cart uses the same hook and its empty-state focus was checked live.

Validation: 196 storefront tests pass, including the existing drawer focus suite and three new modal/retry cases. Final lint and production TypeScript/build pass (20 existing lint warnings). Browser evidence: rd2-recheck-final-geometry.json in the existing evidence directory, ten EN/AR samples at 320, 390, 980, 982, 1440. Actual heading/empty-panel clicks, wheel scrolling from scroll 0, keyboard Enter/Tab/Escape, category/Health Goals drill-in/Back, Close and empty-cart focus pass. Each mobile sample performed 28 Tabs without escaping. Normal motion was explicitly enabled. The bounded confirmation corrected the observed transition timing defect; no visual redesign or additional polishing round. Temporary keyboard-harness encoding/readiness issues were investigated separately and are not hidden as application passes.

The earlier A0 normal-animation proof remains available; Claude's own Reduced Motion environment limitation remains explicit. Physical devices, native zoom, other engines, signed-in/populated carts and backend tests were not rerun. Backend source and catalog data remain unchanged. Awaiting focused independent recheck; nothing pushed or merged.
