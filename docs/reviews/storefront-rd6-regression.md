# RD-6: combined storefront regression and focused repairs

2026-10-19. GPT author. Implementation and verification complete; Claude review and Seif manual acceptance pending. No push or merge.

## Source and scope

Started on reviewed-baseline `9e59489`, combining reviewed RD-0 through RD-5 and the merged backend. Synchronized the author branch in `63a77d0`. Candidate: `gpt/work`, folder `C:/Users/Seif Waleed/OneDrive/Desktop/New folder/e commerce/VI2 FInal/vi2-gpt-review`.

Both apps were tested from this same checkout. Backend source remains identical to `9e59489`. No backend/schema/dependency/catalog/permission changes. Separate Resend, storage and product-admin branches are excluded. Reviewed-baseline does not yet contain these repairs. Existing unrelated dirty reviews and untracked design/draft files were preserved; the pre-existing untracked manager-create-product draft was renamed with `.gpt-draft-before-rd6-sync.md` before adopting the canonical baseline document.

## Implementation integrity verdict

Pass for scoped repairs: existing Wellness Editorial tokens and separate desktop/mobile layouts are retained. Medusa remains catalog authority. No fictional products or business claims, global CSS changes, replacement navigation or dependency additions.

Valid relative-path Impeccable detector runs before/after show 0 primary and 198 advisory signals: 107 typography, 66 color, 25 radius. The initial absolute-path hidden-worktree scan skipped source and is not valid evidence. Advisories require contextual reconciliation with the older 2026-10-10 DESIGN snapshot and later approved RD-0 roles; they are not 198 verified defects or an all-site clean bill. No unrelated token migration was performed.

## Findings and repairs

### F1 [P1]: homepage fails completely when catalog is unavailable

Location: `apps/storefront/src/app/[locale]/page.tsx`, new `HomeRecovery.module.css`, `src/lib/i18n.ts`. Category: resilience/accessibility.

Baseline EN/AR home returned HTTP 500 with Medusa stopped. Product or brand loading failure now renders a server-localized status, native document retry and shop link. Healthy empty catalogs retain normal rendering. CSS is isolated rather than importing unused legacy homepage rules.

Verified development and production EN/AR HTTP 200 with exact localized recovery descriptions. Restarting Medusa and activating retry restores actual catalog content. Five rendered tests cover both dependencies, both languages, recovery and genuine empty data. Impeccable harden: implemented.

### F2 [P2]: pointer click closes Account immediately after hover opens it

Location: `apps/storefront/src/components/Navbar.tsx`. Category: interaction/accessibility.

Baseline first pointer click closed the hover-open panel; second click reopened it. Pointer activation now keeps it open while keyboard activation retains toggle behavior. Icon, name, styles, mouse-leave and Escape are retained. Actual browser first-click/Enter confirmation and component event-handler regression pass. Impeccable harden: implemented.

### F3 [P2]: mobile category filtering loses results focus/scroll

Location: `apps/storefront/src/app/[locale]/shop/ShopClient.tsx`. Category: focus/responsive interaction.

Category changes now include the existing `#shop-results` target and enable native router scrolling, reusing current focus logic and 96px offset. Same-category brand changes retain their non-scrolling behavior. Search/brand survive and pagination resets.

Browser: Arabic mobile category change focused `shop-results` at 95.8px from top; brand-only change retained Filters focus. Initial confirmation caught scrolling disabled despite the fragment; corrected before final suite/build. Tests invoke the actual Apply Filters handler and verify destinations/scroll options. Native router reference: https://nextjs.org/docs/app/api-reference/functions/use-router . Impeccable harden: implemented.

## Verification results

| Check | Result |
|---|---|
| Final storefront source tests | 337 passing, 33 suites; eight new regressions |
| Identical backend source tests | 207 passing, 23 suites; generated `.medusa` copies excluded |
| Native HTTP catalog/checkout | 15 passing, two suites, isolated temporary databases |
| Type checks | Both apps pass, uncached |
| Lint | Both pass; 15 existing storefront warnings, zero errors |
| Production builds | Backend server/admin and final storefront webpack build pass |
| Production route matrix | 19 requests: EN/AR home/shop 200; three removed category URLs 404; all 12 unapproved information routes 404 even with preview query, no draft leakage |
| Production backend outage | Both home locales 200 with recovery surface and exact localized description |

Portable source-test commands, from each app:

```powershell
# apps/storefront
npm test -- --testMatch '**/src/**/__tests__/**/*.test.[jt]s'
# apps/backend
npm test -- --modulePathIgnorePatterns '[.]medusa' --testPathIgnorePatterns '[.]medusa'
```

HTTP tests used installed runner behavior, `NODE_OPTIONS=--experimental-vm-modules`, private environment values, empty email settings and isolated databases. Temporary databases/templates were confirmed absent afterward. No real email.

## Browser coverage

- EN/AR shop at 1440, 1024, 982, 980, 390 and 320 CSS pixels: no horizontal overflow; intended breakpoint layouts. Body text 16px Inter/Cairo; product fact labels 14px and values 16px.
- All five parents/33 children per locale inspected with native localized links. Scientific names CoQ10/DHA retained. Desktop Enter/initial focus/Escape/opener return and header-aligned dropdowns pass.
- AR mobile drawer drill/back/Escape, 16 contained Tab stops; EN Sports panel reverse-Tab containment pass.
- Native category/brand/search combinations, empty category, clear filters and language/query preservation pass. Native 106-product HTTP fixture covers filtering beyond 100, including unknown/inactive IDs; live catalog only has two products.
- Available/unavailable variants, backend prices, Ink selection styling, Arabic mobile facts and real image loading checked.
- Cart above navigation: English desktop right, Arabic left, mobile full-height; focus containment, Escape return, native totals and opening cart dismissing menus checked.
- Disposable customer long first name fits beside cart; missing name uses existing email-name fallback; locale switch preserves authenticated session/populated cart. Sign-out restores guest display and preserves existing cart reset behavior.
- Checkout empty validation and synthetic valid details reach native review: 70 EGP delivery, 1570 EGP fixture total. Stopped before Place Order; native manual-test completion covered separately in isolated HTTP tests, not live payment.
- Invalid order-confirmation link shows Order not confirmed and retains basket. Disposable basket item removed afterward; no development order created.
- Development draft notices, missing facts, contents navigation and locale/hash preservation checked at 96px. Production drafts remain inaccessible.
- Browser forced Reduced Motion: static strips/product browsing checked. Fresh normal-motion ticker looping is not verified by this run.

## Provisional audit health, observed paths only

| Dimension | Score | Limit |
|---|---:|---|
| Accessibility | 3/4 | Keyboard/focus exercised; no screen-reader/full WCAG certification |
| Performance | 2/4 | Builds/pagination pass; no traffic/latency benchmark |
| Theming | 3/4 | Existing tokens/readable roles preserved; older detector snapshot unresolved |
| Responsive | 3/4 | Six widths each locale; physical touch/native zoom pending |
| Implementation integrity | 3/4 | Native authority/truthful recovery; legacy content boundaries remain |
| Total | 14/20: Good, limited scope | Not launch certification |

Positive patterns: server-localized navigation, shared catalog hierarchy, readable mobile facts, native filters, truthful policy/checkout gates. Three in-scope issues found (one P1/two P2), repaired; review still pending. Prioritize confirmed content gaps with Impeccable clarify, physical-device findings with adapt, and polish only after those scoped checks.

## Remaining acceptance boundaries

1. Claude review and Seif manual acceptance/merge remain required.
2. Native Arabic catalog wording and complete bilingual policy/business approval remain open. Drafts are not approved legal content.
3. Full Arabic account/checkout/descriptions/option values are explicitly deferred. Some legacy controls and confirmation messages remain English; this is not whole-site Arabic completion.
4. Two-product test catalog is not real-catalog acceptance. One legacy homepage product lacks an image and emits an existing empty-src warning. Test names/missing facts/media need catalog review; no invented data added.
5. Physical touch, native 200% zoom, Firefox/Safari, screen reader and normal-motion ticker continuity remain manual. CSS viewport emulation does not prove those checks.
6. Redis admin-write invalidation, deployment and live provider checks remain separate tasks. Paymob/Bosta/Odoo unreleased; production checkout stays gated.

## Manual checklist

Run both apps from the candidate folder above with its existing local configuration and PostgreSQL/Redis available. Do not mix author branches' backends. Reviewed-baseline lacks these repairs until approved merge.

- EN/AR home/shop/product at desktop/mobile: menu alignment, all labels, readable fonts.
- Account pointer hover then one click stays open; keyboard Enter toggles, Escape closes.
- Mobile category change focuses results below header, retains search/brand; brand-only change avoids forced jump.
- Available/unavailable variants; cart quantities/removal; locale switch; sign-in/out; drawer side/layering.
- Stop candidate backend: both homes recover; restart and Try again restores catalog.
- Checkout through review only; invalid order link must preserve a populated cart.
- Real multi-page catalog, native 200% zoom, physical phone, normal-motion loop/pause and Reduced Motion static browsing.
- Draft pages only in development; production hides them and all removed category URLs return 404.

## Evidence and cleanup

Temporary local evidence: `C:/Users/Seif Waleed/AppData/Local/Temp/vi2-rd6-evidence-20261019`. Captures include bilingual desktop/mobile shop, cart layers, long-name account, localized outage, product facts, filter focus and invalid-order basket preservation. Test/build logs and route/cleanup JSON copied here; no fixture credentials.

One existing catalog image was missing from these runtime folders. Only that exact public upload was copied from the product-admin checkout into baseline/candidate static folders and hash-checked. It remains untracked and is not committed; no catalog or other agent source changed. Source merges do not synchronize env files/uploads.

Disposable customer/auth identity removed through native services after verifying no orders. Private credential file deleted. Final guest item removed. Existing guest cart retention remains unchanged; no blanket purge.

All RD-6 servers on 3000/3002/9000 stopped and ports confirmed closed. Existing PostgreSQL/Redis left running. Generated Next metadata restored in both checkouts. No deployment, real email/payment, remote push or automatic merge.

## Claude review follow-up — 2026-10-19

Claude `7ec5af8` approved `8cb6f34` with R1 should-fix and minor notes. Author response is in `storefront-rd6-regression-review.md`. Follow-up adds outage noindex/localized title with request-scoped shared loading; preserves products during brand-only failure; shortens the recovery live region; distinguishes category retry; fixes Account repeat-click/outside/Escape focus; and prevents confirmed production search-title loss through shop-only prefetch suppression. The latter avoids a metadata cache symptom without a dependency upgrade and trades away background catalog prefetch.

Latest verification: 346 storefront tests pass; type/lint/final production build pass (15 existing warnings); production route matrix and bilingual recovery/title checks pass. This supersedes the initial 337-test frontend count, not the historical backend test runs. Temporary servers stopped. Claude recheck, Seif manual acceptance and owner merge remain pending; no push or automatic merge.

## Final code-review approval — 2026-10-19

Claude recheck `cd4eb90` approves `a2fba17`: R1–R7 fixed, no additional code repairs requested. His independent verification includes 346 tests, TypeScript, production build, bilingual failure/partial recovery, Account pointer/keyboard/focus and production search titles including Back/Forward. Full recheck is preserved in `storefront-rd6-regression-review.md`, after the author response. No additional application changes or tests were needed for this documentation-only closure.

Manual checklist clarification (N2): header Retry categories refreshes only the category directory; it does not retry the homepage product load. Use the body Try again link for that separate document retry. Check both actions independently. N1's prefetch-upgrade reminder and N3's physical touch/pen, screen-reader and device checks are explicitly retained on the workboard. All other catalog/content/legal and manual release boundaries remain open as documented.

Code review is complete; Seif manual acceptance and owner merge remain pending. GPT has not pushed or merged these commits.
