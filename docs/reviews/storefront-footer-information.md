# RD-5 — footer and bilingual information pages

Author: GPT, gpt/work. Baseline: 093048b. Released by Seif 2026-10-18.
Status: implementation verified; Claude code review and Seif business/legal content approval pending.

## Direction contract

THESIS: A useful footer leads to real catalog destinations and readable store information; no decorative or fake trust destinations.
OWN-WORLD: Preserve Wellness Editorial Ink/Warm Paper/Muted Stone, Inter/Bebas/Cairo, the supplied mark, square surfaces and restrained rules.
STORY: Readers find a page, scan its contents, read clear sections, and return to the shop. Draft status and missing facts are explicit in review.
FIRST VIEWPORT: Breadcrumb, a 240px information rail and a 70ch reading column; title 56px desktop/40px mobile, 16px prose. At 980px and below, the information links wrap above the reading column. Footer uses the existing dark closing surface, a 48x76 supplied mark, 16px links, real categories and development-only information navigation.
FORM: An extension of the established reading/navigation system, code-led; no new visual world or concept seed. Standard contents anchors form its signature wayfinding.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Content approval and release boundary

Review the complete English and Arabic snapshots in docs/drafts/storefront-information.en.md and .ar.md. The source is src/lib/information-pages.ts. All six pages are unapproved. They render only when NODE_ENV is development, with noindex/nofollow metadata and a visible review notice. Production excludes every draft link from the server-rendered footer and each page/metadata loader returns notFound. No query parameter or public preview flag can unlock a draft. Approval requires a separate owner-authorized change, including reviewed final text; there is deliberately no production toggle to publish unfinished drafts accidentally.

Before content approval, Seif must provide business identity/address and registration/tax details as applicable; staffed contact channels/hours; delivery coverage, charges/timing and courier process; lawful returns/refunds/cancellation wording and operational process; privacy controller/contact, actual processors/hosting/transfers, cookies, retention and rights procedures. Native Arabic and legal review are pending. Contact has no fake form, email, phone number or map. No authenticity claim or unsupported social link is displayed.

Legal reference checks (2026-10-18): official Consumer Protection Authority legislation page https://cpa.gov.eg/ar-eg/تشريعات lists Law 181/2018. The indexed excerpt of official Personal Data Protection Center guidance https://pdpc.gov.eg/assets/pdf-data/Guidelines/DPO.pdf identifies Law 151/2020 and Executive Regulations Decision 816/2025. Fetching the full PDPC PDF timed out; its complete text was not reviewed. These are review references, not an assertion that these incomplete drafts establish compliance. No statutory deadlines, blanket supplement exclusions, regulator contacts, refund promises or contract terms were invented. The production release remains blocked on content approval.

## Scope

Footer becomes a server component with explicit locale, keyed copy and data-no-translate; root layout passes its URL-derived locale. Existing native category IDs/handles remain authoritative. Empty category directory retains All products. Supplied black logo mark is rendered monochrome on the existing dark surface using CSS; no new asset or image modification. Scoped CSS replaces retired global footer selectors only. New whitelisted information routes share one server page and localized content; unknown slugs (including prototype names), unsupported locales and the removed categories interface remain unavailable.

No backend, catalog, dependencies, shared package/lockfiles or provider changes. RD-3 source remains in this dependent branch and is already pushed; RD-5 will not be pushed or merged without Seif's direction.

## Validation and evidence — 2026-10-18

- 318 storefront tests / 31 suites pass (35 new RD-5 rendered and negative-path tests). TypeScript passes. Lint: 0 errors, 15 existing warnings. Production webpack build passes.
- All six pages in each language return HTTP 200 in development with server-rendered locale, a review notice and noindex/nofollow. Unknown information slugs and /categories, /en/categories, /ar/categories remain HTTP 404.
- Temporary production preview (next start, port 3002) returns HTTP 404 for all twelve unapproved pages, including ?preview=true. No draft content leaks. Actual production /en/shop HTML has the logo and only /en and /en/shop in its empty-directory footer; no draft links or placeholder wording. Temporary production server stopped after the probe.
- Live Inter/Cairo body and footer links compute to 16px. EN/AR reading and footer captures inspected at 982px desktop, 320px English and 390px Arabic mobile. DOM reflow checks at 980px and 1440px show stacked vs sidebar page layout and two vs three footer columns with no horizontal overflow. Contents keyboard activation focuses its target heading; switching EN to AR preserves /returns and #condition.
- One Impeccable detector pass: 0 primary findings; 5 advisory title-size notes compared with the pre-existing 2026-10-10 DESIGN.md ramp. Source RD-0 rem roles and readable computed values are authoritative. No system-document drift was repaired as a side effect.
- Impeccable independent finish review: disposition ship, no material fixes, at draft-interface scope. Review source/screenshots checked; this is not approval of policy wording.
- Screenshots (local, not shipped assets): apps/storefront/.impeccable/review/rd5/{desktop-en,desktop-ar,mobile-en,mobile-ar}.jpg. Existing supplied logo is unchanged; no generated raster asset.

Runtime: frontend localhost:3001 from this author checkout, process-local backend URL 9001. Attempted same-checkout backend emitted repeated cache/lock Redis connection errors; Docker's engine is stopped. That backend attempt was stopped. No healthy live native directory response was accepted this round; populated category links are verified with native-shaped fixtures, and actual outage All products fallback is verified live. Restart the existing Docker/Redis and same-checkout backend for populated-catalog acceptance; no second catalog or environment-file changes were introduced.

Remaining: Claude code review; Seif-provided business facts, native Arabic and legal/content approval; actual populated directory/footer acceptance when backend services return; physical devices, native zoom, screen reader and other engines remain RD-6. No push or merge.

Documentation pass: independent impeccable_document_rd5 confirmed the extension follows the incumbent palette, type families, responsive rules and flat surfaces. No system files changed; pre-existing DESIGN.md/sidecar typography drift was reported without repair. Detailed design review: storefront-footer-information-design-review.md.

## Claude review response — 2026-10-18

Review 369b9eb approved 289b92c with F1 to investigate and minor F2/F3. Original
review preserved verbatim in storefront-footer-information-review.md. This follow-up
fixes F1-F3; Claude recheck and Seif content approval are pending.

- **F1 reproduced:** on /en/returns, native Enter set #condition and focused the
  heading while scrollY stayed 0 and its top remained about 1267px after settling.
  The shared locale template now respects fragments during initial/paint-delayed
  route resets, hash changes, internal link clicks (including repeated same hashes),
  and history navigation. It explicitly scrolls the decoded ID into view instantly;
  ordinary non-fragment route/query resets are retained. Missing or malformed IDs do
  not throw or unexpectedly reset the page. Modified/external/download/other-target
  clicks are ignored, and all pending frames/timeouts/listeners are cleaned up.
  No second fragment handler or dependency was added to the information page.
- **F2:** Information sidebar label is now a styled paragraph inside its named nav.
  The page's heading outline starts with its single h1 in both languages.
- **F3:** Breadcrumb links now have minimum 44px width/height and centered alignment.
  The live English and Arabic Home links compute to 44px height.
- **F4 retained:** all six bilingual drafts remain development-only and unapproved.
  No publication switch, policy wording or business fact was changed.
- **F5 separate follow-up:** Claude observed homepage /en returning 500 with the
  backend down. Recorded as open on the workboard, not bundled into this UI fix.

Validation: 329 storefront tests / 32 suites pass (9 shared scroll-effect tests and
2 heading-outline regressions added); TypeScript passes; lint 0 errors / 15 existing
warnings; final production webpack build passes. One detector pass on changed UI:
0 primary findings, 2 pre-existing title-size advisories vs the stale DESIGN.md ramp.

Live Chromium in-app browser: desktop EN Enter reaches heading target
#condition at about 95.5px with scrollY 1193; direct refresh settles at the same
position after hydration. AR 390px click and repeated Enter reach about 96.1px with
scrollY 1435 and native heading focus. First heading is h1 and breadcrumbs are 44px
in both locales. Frames are instantaneous, so Reduced Motion does not need a new
animation. Screenshots review-fix-desktop-en.jpg (full document from top) and
review-fix-mobile-ar.jpg (actual scrolled target) are under the existing local
.impeccable/review/rd5 directory. Native physical browsers/devices and screen readers
remain RD-6 checks; no claim of independent Firefox/Safari coverage.

Claude's review additionally verified the five real categories in development and
his production build with a same-checkout backend; that resolves the initial
round's empty-directory-only visual evidence for unchanged footer links. This
follow-up did not restart services, change the backend/catalog/dependencies or
push/merge anything.

## Approved recheck and G1 response — 2026-10-18

Claude 7a80b33 approves 2aaf3ea: F1-F3 fixed and production draft blocking intact.
He independently verified EN/AR click/Enter, repeated fragments, refresh, history,
home #health-goals and shop #shop-results, including his production build.
The complete recheck is preserved in storefront-footer-information-review.md.

Minor G1 is addressed with one low-specificity :where(main [id]) default:
scroll-margin-top: 96px. This gives content targets such as home #health-goals
clearance below the pinned bar. Existing component margins override the default;
there is no global scroll-padding, so offsets are not added together. No copy,
policy publication guard, JavaScript or backend changes in this follow-up.

Live browser checks: the draft-notice-title target had a 0px margin before; after
the rule, default and explicit component margins both compute to 96px. Direct
EN 982px and AR 390px loads land the default target at about 96.2px. Enter on
the existing Arabic #condition target still lands at about 96.1px, without overflow.
The home target is covered by the same main/id selector; healthy-home acceptance
of this final CSS default remains a Claude/RD-6 check while the local backend is down.
A local proof capture is review-offset-mobile-ar.jpg in the existing review folder.

329 tests / 32 suites, TypeScript and lint pass (15 existing warnings). One global
stylesheet detector scan: 0 primary findings, 31 existing advisories, none on the
four added lines. Production webpack build passes.
Claude's final minor G1 confirmation and Seif content approval remain pending;
original policy/native-device and homepage-outage follow-ups are retained. No push/merge.

## Final code approval — 2026-10-18

Claude confirmation 5bd4a01 approves implementation d92f80d: G1 fixed, no doubled
offsets and no remaining code-review findings. Full original review/rechecks are
preserved in storefront-footer-information-review.md. Claude independently reran
329 tests / 32 suites and TypeScript, and verified EN 1440px and AR 390px home
anchors, repeated activation, information targets and RD-3 shop results all land
at 96px. The source delta was CSS-only; prior production draft-blocking evidence
remains valid, and the author's final production build passed.

RD-5 code is ready for Seif's manual acceptance and merge. The bilingual business
and policy drafts are not approved for publication; they remain development-only
until Seif supplies missing facts and approves reviewed final content. Physical
devices, Firefox/Safari, screen readers and other RD-6 checks remain outstanding.
The separately recorded homepage outage follow-up is open.

This approval-record commit changes documentation only; no tests rerun, no
application/backend/catalog changes, no push or merge.
