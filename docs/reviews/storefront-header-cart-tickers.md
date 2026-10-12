# Header, cart and ticker fixes

Author: GPT. Branch: `gpt/work`. Reviewer: Claude. Owner: Seif.
Approved plan: 2026-10-12. Base: `ee4542f`.

## Result

- Desktop and mobile language buttons show AR in English and ENG in Arabic. Destination labels are keyed/localized; codes bypass compatibility translation. Existing locale navigation keeps path/query/fragment and shared cart/session identities.
- Signed-in desktop account displays first name only, with the existing UserRound icon and dropdown. Email local-part and localized Account are fallbacks. Long names truncate visually while their complete text remains accessible. Guests keep the original labels; pending session restoration avoids a Sign in flash.
- Cart backdrop/drawer layers are 600/610, above header (120), menu (350), search (400), and mobile bottom navigation (500). Navigation panels close on any cart opening. Navbar owns the shared scroll lock. The drawer is a named modal, closed content is inert, Escape dismisses, Tab wraps, outside focus returns inside, and closing restores the opener or visible cart trigger.
- The product rail uses two equal visual groups, repeating enough real content to cover the viewport. One canonical keyboard link per product; decorative duplicate links keep the same localized destination, are hidden from assistive technology and tab order, and do not take pointer focus. Visible names and current truthful Explore Products copy remain.
- The black brand strip keeps its original styling, real names, and slow CSS animation. Both loops have compact localized Pause/Resume controls, stop for hover/focus/offscreen/hidden tabs, and retain static horizontal browsing with Reduced Motion. Pointer activation of the controls does not leave keyboard focus holding the ticker paused.
- No backend, catalog, dependency, provider, or authentication-contract changes.

## Validation

- Workspace check passes: 193 backend tests + 159 storefront tests; both type checks; backend lint clean; storefront lint 0 errors / 20 warnings. Of those warnings, 19 were present before this task; one new warning is the navigation effect synchronizing its local panel states when the shared cart opens.
- Storefront production build passes.
- New regression coverage checks destination codes in both layouts/locales, guest/session/name fallbacks, long mixed-direction names, cart modal semantics and keyboard focus lifecycle, ticker controls/duplicate destinations, viewport repetition and all pause causes.
- Live preview uses this checkout on localhost:3001 and the owned Medusa backend on localhost:9000 with the existing localhost vi2_dev environment. No migrations or category setup applied. The initial backend start lacked the local environment and was stopped; the correctly configured start succeeded.
- Browser checks: English/Arabic URL language and direction; mobile return to English; query and fragment retained across switch; desktop 1440 and mobile 390; breakpoint 981/980; no horizontal page overflow. Empty and populated cart cover the header/top and mobile bottom navigation; close control receives focus; Shift+Tab wraps to final link; Escape closes and restores Cart; shared cart retains its product across language switch. Only the added test item was removed afterward.
- Reduced Motion is enabled in the available browser. Both strips render a single static browsable group with valid product links; normal-motion lifecycle is covered by tests. A visual observation of an uninterrupted normal-motion loop remains for Claude/Seif in a browser with Reduced Motion off.
- Customer first-name, fallback, loading and sign-out display states are covered with component fixtures. Live signed-in customer verification remains: no customer credentials were supplied. Auth/session code is unchanged.

## Review focus

1. Account name and unchanged icon/dropdown at compact desktop widths.
2. Cart opening from header, mobile bottom navigation and Add to Cart; focus restoration when the originating button is disabled/removed.
3. Ticker loops with normal motion, a short catalog, hover/manual pause, keyboard browsing and a hidden tab. Inspect the loop boundary and check visual clones still navigate correctly.
4. Language round-trip while signed in, preserving the existing cart and destination.

Seif owns merging. No merge or deployment performed. Existing unrelated drafts/review changes remain untouched.
