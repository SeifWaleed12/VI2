# Product reviews implementation

2026-10-26. Ordinary extension of the existing product page. Direction: [contract](contract.md); owner-approved illustrative concepts: [desktop](desktop-proposal.png) and [mobile](mobile-proposal.png). These concepts are design references, not captures of the implementation. Existing storefront `globals.css`, RTL styles and product CSS remain the visual authority; no global PRODUCT/DESIGN document or identity replacement is introduced.

## Inherited design

The storefront uses Ink (`--ink: #11110f`), Warm Paper (`--paper: #f5f2ed`), Muted Stone (`--text-muted: #5e5a55`), existing cream form surfaces, and hairline `--border` separators. Review rows are flat, with square fields/buttons and no decorative shadows. Native Lucide stars share the incumbent icon language; fractional public ratings retain a partial fill.

Inter remains the English UI/body face and Cairo the Arabic face. Bebas Neue remains the surrounding product page's display voice; review headings deliberately use the existing functional UI face at `--text-section` (1.5rem). Body/form text uses `--text-body` (1rem), metadata/control labels `--text-ui` (.875rem), inherited line-height, and a maximum 70ch paragraph measure. Arabic remains untracked.

## Arrangement and language

The product identity includes a compact review-summary anchor. The full section follows the description and precedes Similar products, keeping purchase controls primary. Desktop has a heading/write-action row, an inline form when opened, then a 220–280px summary/breakdown column and a flexible controls/review-list column, separated by a 48px gap and hairline rule. At 760px and below, source styles stack the heading, summary/breakdown, full-width write action, own-review/form area, then controls and rows. Form actions wrap; principal controls and rating targets are 48px high.

UI copy is keyed in English/Arabic; counts and dates follow the locale. Logical spacing/borders support RTL. Customer names, titles, feedback and decision reasons retain their original text with `dir="auto"`; feedback is rendered as text with preserved line breaks, without translation or HTML interpretation.

## States and recovery

Public summaries use all approved reviews while rating filters affect the list count. Newest/highest/lowest controls and ten-review pages accompany truthful empty/no-match, loading, outage/retry and pagination states. No reviews means no invented average. Review failures leave product purchase available.

The inline form has labelled native rating radios, optional title, required written feedback, length guidance, validation, saving/disabled states and visible focus rules. Private states distinguish published, pending, rejected and withdrawn reviews, show the current saved version separately, and provide edit, explicit withdrawal confirmation, conflict reload, rate-limit and session recovery. Submission failures keep the active draft; loading the saved version does not overwrite typed feedback.

Immediately before a save attempt, one submitted-but-unsaved draft is copied into browser-tab memory, scoped to the customer and product. It expires after 15 minutes, is restored after a client-side sign-in return for that same account/product, and clears on successful save/withdrawal or Cancel. It uses no persistent browser storage, is absent during server rendering, and is lost on a full tab reload. This is short session recovery, not continuous draft autosave.

Staff moderation extends native Medusa Admin conventions: existing Container/Heading/Text/Badge/Input/Button components, UI semantic colors, product links, a pending-first status queue, bounded pagination, explicit decision reason and approve/reject actions. Flag explanations are staff-only; rejection reason visibility is stated beside the field. Loading, empty, retry, saving and stale-version errors use native patterns. Failed decisions keep the reason; staff cannot rewrite customer content.

## Verification disposition

Code inspection supports the composition, state handling, language behavior and native-control semantics above. Test source covers empty/outage rendering, fractional stars, form validation and draft retention, stale requests, pagination recovery, identity isolation, duplicate-save protection, account/product draft scope and expiry, and bounded native Admin requests. Test execution and build results belong in [the review handoff](../../reviews/product-reviews.md); this documenter did not rerun them.

The finish reviewer independently marked the new-submission error draft-loss and 401 session-recovery draft-loss findings resolved in source. The detector's source scan returned `[]`. Neither result is visual approval. No browser provider or native capture was available, so there are no valid rendered implementation screenshots. EN/AR desktop/mobile rendering, actual breakpoint reflow/overflow, keyboard order and focus/scroll recovery, contrast, mobile cart-bar clearance, zoom, touch and screen-reader behavior remain unverified. Visual acceptance remains pending.
