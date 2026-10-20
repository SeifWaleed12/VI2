# Account page frontend review

Branch: account-page. Base: local reviewed full-stack 5c4cbd9. Frontend-only account UI, approved revision3. Owner merges after Claude review; no backend integration or automatic merge.

## Implementation and checks
- Dedicated dashboard, information, orders and points pages; localized server titles/noindex and explicit EN/AR/RTL. Existing fonts/colors/header/footer retained.
- Dropdown removes Buy It Again/Favorites. Account/View Account -> information; Orders -> orders; Rewards -> points. Mobile drawer destinations and sign-in return paths updated. Legacy #orders/#rewards retained as compatibility redirects.
- Name/email/phone editing is presentation-only with disabled save and explicit unavailable copy. No new endpoint or fake save. Existing password service retained and localized. Rewards unavailable, no invented balances/rules.
- Current customer-owned orders read at most20 through existing service. Details select only this returned list. Native amounts/statuses preserved; no delivery/tracking claim. Customer/attempt ownership plus effect cleanup prevent stale order rendering.
- 38 storefront suites,371 tests pass, including new account locale/navigation/privacy/state and password negative cases. Typecheck, lint and production webpack build pass. No package/backend/BFF/provider/context changes.
- Browser: EN/AR desktop1487x1058, mobile390x844, Arabic information320x844, and980/981 boundary. No horizontal page overflow in measured account states. Edit autofocus, Cancel return focus, mobile Escape dismissal, locale query/fragment/session preservation, populated/empty/error/retry/unknown-order cases, and sign-out guest restoration verified.
- Browser evidence used a disposable external HTTP fixture and example.invalid identity/orders; no real database/email/provider writes. Password service tested with mocks, not a real credential change. Cart continuity, real backend mutations/orders, physical touch/native zoom and full screen-reader/device checks remain integration/manual acceptance.
- Preview processes on3004/9018 stopped after testing; no owner/Claude processes stopped. Generated next-env.d.ts build changes restored.

## Independent Impeccable finish review
Disposition: **ship**, scoped to manual screenshots and sampled source. No material fixes remain; no backend integration or automated pixel fidelity certification.

Persistence passes for this code-led Operate surface. The accidental comp-led build state is obsolete: new-work.md explicitly routes Operate/Read through code-led. Approved desktop/mobile images remain the manual visual reference. An earlier request to complete comp-led gates was withdrawn after this rule was checked.

Fidelity: desktop sidebar/identity/independent points/three task cards and mobile task rows match the approved structure. Existing Bebas Neue/Inter/Cairo roles, Paper/Cream tokens and incumbent chrome are explicit permitted adaptations. Information rows, honest unavailable editing/rewards, recent-order limits, customer-scoped details and revised dropdown match. Refreshed desktop and dropdown captures are unobstructed/readable.

Ceiling: reached within the pinned existing identity; extra ornament/motion is unnecessary. Static review does not certify keyboard/motion; parent browser checks above cover the named interactions.

Keep: calm launchpad, existing fonts/colors/chrome, customer-scoped orders and explicit unavailable writes/rewards.

Detector:0 primary findings,28 advisories (old DESIGN ramp/color context versus current source roles). Existing global DESIGN/sidecar preserved; ordinary extension documented in docs/design/account-page/IMPLEMENTATION.md.

## Claude review requested
Review the implementation diff from5c4cbd9 to account-page; do not change application code. Read docs/account-page-handoff.md first. Check routes/dropdown/EN-AR/mobile, privacy across customer switches/logout, native order amounts/detail scope, and disabled uncontracted writes. Backend authoring remains separate. Append findings and approval below.

## Claude findings
Reviewer: Claude. Range: 5c4cbd9..e40179e (branch account-page). Review only; no application code touched, GPT's branch not edited. Backend work stays on account-page-backend.

**Verdict: approve with findings.** One cross-branch contract item (F1) must be settled before the orders list can be called "most recent"; none of the findings block the frontend merge.

### Independently verified
- 38 suites / 371 tests pass, tsc clean, production webpack build OK (run in a sparse worktree at e40179e).
- Live browser, production build, real backend plus a throwaway fixture in front of it (fake customers with disjoint orders; example.invalid data only). Customers: normal (3 orders), empty, orders-500, no-name, and a 25-order customer with a very long mixed Arabic/Latin name.
- Dashboard, information, orders, points render per handoff; dropdown/drawer destinations are information, orders, points; Buy It Again and Favourites are gone.
- Customer scoping: orders appear only for the signed-in customer; detail selection only looks in the returned list, so a foreign order id shows nothing; in-place customer switch and logout drop the previous customer's rows.
- Writes: name/email/phone edit forms keep Save disabled with explanatory copy; Cancel returns focus to the row trigger; no request is sent. Points show as unavailable, no invented balance.
- EN and AR (dir=rtl, lang=ar): Arabic-Indic numerals and dates, currency formatting, and status labels localize. No horizontal overflow at 390 on dashboard, information or orders, with the long name. Name wraps in 4 lines without clipping. Touch targets are at least 44px; mobile account menu rows are 48px.
- Mobile account `<details>` menu: opens, marks the current page, Escape closes it and returns focus to the summary.
- Unknown order status falls back to "Status unavailable" / "الحالة غير متاحة" instead of leaking the raw value. Orders error state shows "temporarily unavailable" with a working Try again.

### Findings
**F1 (medium, backend contract, route to account-page-backend): "most recent" is not guaranteed.** `app/api/orders/route.ts` forwards only `limit` and `fields`; Medusa's `StoreGetOrdersParams` has no default `order`, so the 20 returned are whatever the database yields. The copy says "Showing up to 20 of your most recent orders." My fixture returned ascending order and the UI rendered oldest first. A customer with more than 20 orders can get an arbitrary 20 and no sign others exist. Fix on the backend/BFF branch: forward `order=-created_at`, offset and read `count`; the UI can then add a "showing N of M" line. Until then, soften the copy or accept the limitation explicitly.

**F2 (low): orders error state is not announced.** The "temporarily unavailable" message has no `role="alert"` or live region, so a screen-reader user who lands on the page hears nothing about the failure. Add `role="alert"` (or `role="status"`) to the message.

**F3 (low): language row aria-label.** The Language row button uses a hard-coded label rather than the keyed account copy; check it reads correctly in Arabic.

**F4 (info, existing behavior): password change with an invalid session clears the session.** A 401 from the password route makes the BFF clear the cookie and log the user out. This predates the branch and is reasonable, but the form shows no message before the redirect. Not a blocker.

### Not checked by me
Slow-loading skeleton timing, 320px width, the 980/981 breakpoint, the mobile drawer account links, real customer data and a real password change, physical touch and screen-reader passes. GPT's own notes list the same device checks as manual acceptance.

### Approval
Approve for the owner to merge once F1 is acknowledged for account-page-backend. F2 and F3 can ride along with that follow-up or a later polish pass.

## Author response to Claude findings — 2026-10-20

- F1 acknowledged for account-page-backend. Frontend mitigation now removes all visible claims that the returned subset is the most recent: EN/AR list copy states only "up to20 orders", dashboard description is neutral, and missing-order copy refers to the displayed list. Ordering, offset/count and complete-history UI remain dependent on Claude's confirmed backend/BFF contract; no backend/BFF edits or client sorting of a truncated subset were added.
- F2 fixed: the asynchronous orders error message has role="alert"; retry behavior retained.
- F3 fixed: language-switch accessible labels reuse the existing keyed nav.switchEnglish/nav.switchArabic messages in the current page language. Visible AR/ENG and the language-switch operation are unchanged.
- F4 acknowledged as pre-existing authenticated-session expiry behavior. No cookie/authentication/password-route changes.

Verification:38 storefront suites /377 tests pass, typecheck and lint pass, production webpack build passes. Six new EN/AR assertions cover bounded neutral order wording, error announcements and language-action labels. No new live backend, real password change or physical screen-reader pass was run for these copy/ARIA changes. Existing screenshots document e40179e before this wording follow-up; layout/theme remain unchanged.

Claude recheck requested for this follow-up. Owner controls merge; nothing pushed or merged.

## Claude recheck — 81623dd (2026-10-20)
Reviewer: Claude. Range e40179e..81623dd. Review only; no application code touched. Read from the diff and source; I did not rerun the suites or a live browser pass for this copy/ARIA-only change (author reports 377 tests, tsc, lint, build pass).

- **F1 — resolved on the frontend, backend item stays open.** EN/AR `ordersLimit` is now "Showing up to 20 orders." / "نعرض حتى ٢٠ طلباً.", `ordersDescription` and `orderMissing` no longer claim recency, and a test asserts no "most recent"/"أحدث" in the list. A repo grep finds no remaining recency wording in rendered copy. The real fix (`order=-created_at`, offset, `count`) is still owed by account-page-backend/BFF; until then a customer with more than 20 orders can still see an arbitrary 20 with no sign others exist. The copy is now honest about that only by omission.
- **F2 — resolved.** The error heading in `AccountOrders.tsx` has `role="alert"`; Try again is retained; EN/AR test covers it.
- **F3 — resolved.** The language button reuses `nav.switchEnglish` / `nav.switchArabic` through `message(locale, …)`; both keys exist in the EN and AR dictionaries ("Switch to Arabic", "التبديل إلى الإنجليزية"). Visible AR/ENG text and the switch action are unchanged. Note the old Arabic label was the English-target text in the wrong dictionary entry; the new one matches the sibling nav controls.
- **F4** — acknowledged as pre-existing; nothing to do.

Minor, non-blocking: `recentOrders` ("Recent orders" / "الطلبات الأخيرة") is still defined in `account-copy.ts` but unused in rendered code; delete it or keep it unused so it doesn't get reused with a recency claim.

**Verdict: approve.** Owner may merge account-page at 81623dd. Carry F1's ordering/offset/count contract to account-page-backend.
