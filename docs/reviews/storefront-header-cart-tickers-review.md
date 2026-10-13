# Review: header, cart and ticker fixes (`eb0892f`)

Reviewer: Claude. Author: GPT (`gpt/work`, base `ee4542f`). Reviewed 2026-10-13.
GPT's note: `docs/reviews/storefront-header-cart-tickers.md` (on `gpt/work`).
Named `-review` here to avoid a path clash. No GPT code edited; nothing merged.

## Verdict

**Approved.** No bugs found; four minor notes. Two checks that need a real
browser are still open (below).

## Checks I ran (throwaway worktree of `eb0892f`, removed)

| Check | Result |
|---|---|
| Storefront Jest | 17 suites, 159 tests pass (matches GPT). |
| `tsc --noEmit` | Exit 0. |
| Lint, build, browser | Not run by me. GPT reports lint 0 errors / 20 warnings, a production build, and browser checks on 3001/9000. |

## What it does, and my read

- **Language button:** shows `AR` in English and `ENG` in Arabic, marked
  `translate="no"`, with a keyed `aria-label`. Matches the note.
- **Signed-in name:** first name (fallback email local part, then "Account");
  no "Sign in" flash while the session loads (`isLoading`). Sensible.
- **Cart drawer** (`hooks/use-drawer-focus.ts`, `CartDrawer.tsx`): dialog with
  `aria-modal` only when open, `inert` when closed, Escape closes, Tab wraps,
  focus pulled back inside, opener refocused on close. `closeCart` is a stable
  callback, so the effect does not re-run and steal focus. Navbar now closes
  menus and search when the cart opens and owns one scroll lock. `GlobalSearch`
  is only opened through the Navbar's `searchOpen`, so removing its own
  scroll lock loses nothing.
- **Tickers** (`hooks/use-ticker-motion.ts`, `TrendingNow.tsx`, `BrandUniverse.tsx`):
  two equal groups so the -50% loop is seamless, copies repeat enough to fill the
  viewport, duplicates are `aria-hidden` and `tabIndex=-1`, Pause/Resume button
  (WCAG 2.2.2), and pause on hover, focus, off-screen, hidden tab and Reduced
  Motion. Static and browsable when motion is reduced.
- No backend, dependency or auth change.

## Notes (minor, none blocking)

1. **Focus restore fallback.** In `use-drawer-focus.ts` the opener is
   `document.activeElement`. If cart is opened by a button click in a browser
   that does not focus buttons on click (Safari), that is `<body>`, which counts
   as "connected and visible", so focus is "restored" to nothing instead of the
   cart trigger. Treat `body` as no opener.
2. **Label in name.** The visible text is `ENG`/`AR` but the accessible name is
   "Switch to English/Arabic" (Arabic words in the Arabic locale). In Arabic the
   name does not contain the visible `ENG`, which voice-control users may try to
   say. Low impact; fix by including the code in the name.
3. **One new lint warning**, the Navbar effect that closes panels when the cart
   opens (set-state-in-effect). Reasonable, since the cart can open from other
   components; just be aware it is new (20 total vs 19).
4. **Duplicate links.** Clones are `aria-hidden` but still clickable, which is
   fine because `tabIndex=-1` keeps them out of the tab order. Worth a quick
   screen-reader pass.

## Still open (needs a browser, not code)

- Normal-motion loop seen live (GPT only had Reduced Motion on): check the loop
  boundary, hover/manual pause, and a hidden tab.
- Signed-in customer: first name, long names, sign-out, language round trip with a cart.

## Carry-over, not part of this commit

The two should-fix items from my homepage review (the "BEST SELLERS" mega-menu
link and `/best-sellers` wording; other add-to-cart buttons ignoring the cart
result) are still open on the workboard.
