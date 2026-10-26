# Product reviews: delivery contract

Baseline: 05d78a6. Author GPT; reviewer Claude; merge owner Seif.

## Rules
- Signed-in customer, no purchase/delivery requirement, no verified-purchase badge.
- One persistent customer/product review. Rating integer 1–5; title optional max120; content20–3000 trimmed characters. Customer name comes from customer service, never browser input. Public first-name only; blank name uses localized Member label. Display original content as text with dir=auto.
- Review states approved, pending, rejected, withdrawn. Clean local screen auto-approves. Flagged text waits for staff. Customer edit re-screens new content. Previous staff rejection never bypassed by unchanged resubmission. Withdrawn records preserve uniqueness and can be resubmitted by their owner. Moderator approval/rejection checks exact version and records actor/reason/time. Customer edits clear old moderation decision. Low stars never affect screening.
- Local screen version2: curated exact English/Arabic terms (token boundaries, Unicode normalization, strip Arabic diacritics/tatweel and zero-width disguises for detection only), suspicious external URLs (including shortened/spaced forms) and excessive repeated characters. No broad substrings, sentiment, medical-word blocking, automatic rewriting, or full-language coverage claim. Flag codes are staff/private only. Matching means pending, not permanent rejection. Same policy for 1 and5 stars.
- Per-customer write rate limit reuses native cache/locking;5 create/edit attempts per15min. Withdrawal remains available when rate-limited. No new Redis cache, provider, dependency or third-party text transfer.

## Backend contract
Public GET /store/products/:id/reviews: approved-only, limit default10/max20, offset bounded, sort newest/highest/lowest, optional integer rating1–5. Return {reviews,count,offset,limit,summary:{count,average,distribution}}; summary always all approved ratings, count reflects current filter. Public product must be published and in the request publishable-key sales channel. Public payload excludes customer IDs/contact, private reasons, flags and staff IDs. Cache-Control no-store initially.
Private GET /store/products/:id/reviews/me: authenticated customer (own reads/withdrawal remain available after a product becomes nonpublic), return {review} or null including own status/version and rejection explanation. POST same route: strict body {rating,title?,content,version?}; new requires no version, subsequent writes require current version. DELETE requires current version and withdraws only own review. Identity solely auth_context. Auth token required, no customer_id/order inputs.
Admin GET /admin/product-reviews: pending default, oldest pending update first; other statuses newest first; allowlisted status, bounded paging. POST /admin/product-reviews/:id: {status:approved|rejected,version,reason}; no content rewriting. Both native staff roles allowed via scoped existing RBAC guard; no new role or unrelated permissions.
Conflict returns409; validation400; auth401/403; unavailable503; write rate429. Customer/product lookups native. Public aggregation in module persistence, not whole-review memory reduction. Atomic uniqueness/version updates protect persistence even if locks expire.

## Direction contract
THESIS: readable customer experience evidence after the description, before Similar products; buying controls stay primary.
OWN-WORLD: existing Ink11110f/Warm Paperf5f2ed/Muted Stone5e5a55; Inter16px body and Cairo Arabic; existing Bebas display voice, neutral buttons, hairline separators. No new fonts/colors.
STORY: understand rating distribution, read feedback, filter, then share a signed-in review without a purchase requirement. Empty state says no reviews yet; no fabricated rating.
FIRST VIEWPORT: heading and write action; desktop summary/breakdown left, controls and generous review rows right; mobile stacked summary, breakdown, controls and rows. Inline labelled form. Keyboard radio rating,44px controls, errors preserve draft, no overlap with mobile cart bar.
FORM: precise extension of incumbent product page, code-led; two separate illustrative mockups for desktop/mobile approval, not a new visual world. EN/AR keyed UI, no translation of user text.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Delivery / limits
REV-1 contract/mockups, REV-2 module/API/migration, REV-3 moderation, REV-4 storefront, REV-5 checks/handoff. No photos, votes, reward points, invitations, feed syndication, product-card/homepage ratings or external moderation. Tests use disposable DB, empty Resend and no real providers. Exact generated schema and operational migration command documented before owner use. Existing visual docs not rewritten; missing global design docs remain a pre-existing gap.

## Approved implementation / recovery note —2026-10-26
Seif approved both separate UI proposals. Implementation is code-led in the inherited system. To preserve a submitted draft on401, one customer/product-scoped draft lives only in browser-tab memory for15minutes; no persistent storage/server sharing. Same-account client-side sign-in return restores it; different accounts/products cannot see it. Success/cancel/withdraw clear it; full reload loses it, explained in recovery copy. The source finish reviewer resolved two draft-loss findings; actual rendered/keyboard approval remains pending because browser/native capture access was unavailable. No live migration, provider calls, push or merge.
