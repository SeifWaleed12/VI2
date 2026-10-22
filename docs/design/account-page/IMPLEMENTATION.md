# Account page implementation record

2026-10-20. Documentation check for AP-FE on `account-page`, based on source and the current local review captures. This is an ordinary extension of Vi2's established visual system and the approved revision-3 launchpad. It does not replace the global design authority. The parent finish review and Claude frontend review remain separate requirements; this note is not their approval.

## Delivered surface and routes

| Destination | Locale-preserving route | Implemented presentation |
|---|---|---|
| Dashboard | `/[locale]/account` | Customer greeting and initial avatar, account-information link, independent unavailable-points summary and three task destinations |
| Account Information | `/[locale]/account/information` | Name, email, phone, password and language rows; one focused editor at a time |
| My Orders | `/[locale]/account/orders` | Up to 20 recent customer orders, loading, empty, error/retry and missing-order states |
| Order detail | `/[locale]/account/orders?order=<id>` | Detail selected only from the returned customer-owned list; date, order/payment status, items and authoritative supplied totals |
| Vi2 Points | `/[locale]/account/points` | Explicit unavailable state and return link; no balance, earning or redemption claims |

Server route helpers validate the locale and provide localized titles and noindex metadata. Account copy is keyed English/Arabic and excluded from legacy DOM translation. Legacy dashboard `#orders` and `#rewards` links forward to their dedicated destinations. Dropdown My Account and View Account reach information; My Orders reaches orders; My Rewards reaches points. Buy It Again and My Favorites are removed. The existing dropdown icon, visual treatment and authentication actions are retained.

## Retained visual authority

The actual token authority remains `apps/storefront/src/app/globals.css` and `rtl-support.css`, with the established font loading. Account CSS uses the existing Ink, Paper, Cream, deep Cream, border and muted-text variables. English display uses Bebas Neue, UI uses Inter and Arabic uses Cairo. Current source body/UI roles are 16px/14px. Existing site header, footer, logo and font/color system remain the surrounding world; this task does not redefine them.

Account surfaces use thin rules, square task panels, square controls, an initial avatar and restrained cream separation. There is no new imagery dependency. Approved design images and review captures are documentation evidence, not production customer/product content. No dependency changes are part of this UI delivery.

## Desktop, mobile and RTL behavior

The account shell is capped at 1288px with desktop side gutters, a 260px account sidebar and a flexible content region. At 1200px the sidebar narrows to 190px and identity/points stack. Desktop task destinations form three columns. At 980px and below the sidebar and breadcrumb give way to the existing mobile chrome; tasks become full-width ruled rows and secondary pages expose a native compact account-navigation disclosure. Mobile sign-out remains available below the content.

Information uses label/value/edit rows, wraps long values and opens the relevant fields inline. Editors focus their first input; Cancel returns focus to the row trigger. Account controls have visible focus outlines and 44px minimum icon actions; form actions are at least 48px. The mobile disclosure closes on Escape and returns focus to its summary. Motion is limited to brief background changes when reduced motion is not requested.

Arabic receives explicit route locale and RTL direction, logical layout spacing and the existing Cairo treatment. Customer values, order references and amounts use bidi isolation; email/phone editing preserves LTR input direction. Mobile orders reflow status and amount into readable rows; details wrap item content and use full-width totals.

## Existing service boundaries and unavailable operations

Identity comes from the existing `useAuth` customer/session provider, backed by the existing HttpOnly-cookie authentication path. Session restoration renders a loading state before account content. Guests see a sign-in prompt with a return destination. New account profile editors display current authoritative values but cannot save name, email or phone: Save is disabled and the copy explicitly says updates are unavailable and changes have not been saved. Input drafts are temporary presentation state, with no invented endpoint, browser customer authority or fabricated saved-success.

Password change retains the existing `changePassword(currentPassword, newPassword)` service to `/api/auth/password`. The form adds localized labels, confirmation, visibility, pending and result states; success follows the service result. This documentation check did not exercise the real password/backend operation.

Orders retain `getCustomerOrders(20)` through `/api/orders` and the existing authenticated Medusa order read. Result state is associated with the current customer and request attempt; stale responses are ignored after effect cleanup. Detail is a lookup within that returned list, never a guest confirmation lookup by arbitrary ID. This does not promise complete history, pagination, shipment tracking or a new detail contract. Prices/statuses/totals are displayed from returned order data; no delivery status is inferred from order completion.

Rewards explicitly remain unavailable throughout the dashboard, points destination and dropdown. No invented zero, tier, earning rate, expiry or loyalty source of truth is introduced. Backend contracts and integration acceptance remain as recorded in `docs/account-page-handoff.md`.

## Evidence checked and practical limits

Manually inspected source: account route helper, client/shell/dashboard/information/orders/points/password components, account navigation, dropdown, account CSS, global/RTL tokens, frontend PRODUCT.md and existing DESIGN.md; also the approved direction and backend handoff.

Manually inspected captures in `apps/storefront/.impeccable/review/account-page/`: `desktop.png`, `mobile.png`, `desktop-ar.png`, `mobile-ar.png`, `information-desktop.png`, `information-mobile.png`, `information-ar-320.png`, `orders-mobile.png`, `order-detail-mobile.png`, `orders-desktop-ar.png` and `dropdown-desktop.png`. These show the intended desktop/sidebar and mobile/stacked composition, EN/AR output, information editing/unavailable save, returned-order presentation and retained dropdown chrome. The filename `orders-desktop-ar.png` currently shows Arabic order detail. Review data such as preview@example.invalid and VI2-41 are UI fixtures, not evidence of a live account, real order, payment or provider integration. Development badges and the existing ticker/mobile navigation visible in captures are surrounding preview artifacts.

The skill routes this Operate task to the code-led build path (new-work.md line 55). The initially started comp state is obsolete for this delivery and is not a required completion gate. The approved desktop/mobile images remain the manual visual-reference contract, with current source tokens governing their font/color approximations. Source and captures were manually checked; no automated pixel-fidelity pass is claimed. A refreshed desktop capture is pending to remove a clipped capture frame; no page edit is implied. No live integration or Claude approval is claimed.

The parent reports 371 storefront tests, typecheck, lint and production build passing. Bounded browser checks additionally verified: the sidebar is hidden at 980px and shown at 981px without overflow; Arabic information has no overflow at 320px; Cancel restores Edit name focus; Escape closes the mobile menu and focuses its summary; language switching preserves the order query and #summary fragment; unknown order IDs show a safe missing-order state; order outage retry recovers; empty orders render honestly; and sign-out restores the guest state. Password validation/service-result behavior was exercised with a unit mock only, not a real credential change. These are parent-reported verification results, separate from this documenter source/capture inspection.

## Existing documentation drift and advisories

The existing frontend DESIGN.md is a dated source snapshot. It still describes 14px body/10px labels, a split 1180px account form shell and older small input roles, while current global source uses 16px/14px roles and this approved account extension has its own responsive shell. Its global palette remains descriptive context, but current CSS and the owner's preserved-world instruction govern this delivery.

The detector's existing DESIGN type-ramp/tonal-ramp advisories are not proof of a new identity or a passed accessibility check. They include source values absent from the older documentation/ramp snapshot. No global DESIGN.md or design.json rewrite, palette repair, font change or unrelated source repair was made by this documentation check. Review capture variations, physical touch/native zoom, full accessibility validation and real backend integration remain matters for the parent review/integration record rather than claims established by this note.
