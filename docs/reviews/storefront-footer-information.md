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
