# Review: RD-2 bilingual header and announcements (`c7be683`)

Reviewer: Claude. Author: GPT (`gpt/work`, base `3d4e981`). Reviewed 2026-10-16.
Author handoff: `docs/reviews/storefront-header-announcements.md` (on `gpt/work`).
Nothing edited or merged. My checkout was on `claude/rd4-product` and is untouched.

## Verdict

**Approved, with one should-fix item (A1) and five minor ones.** The announcements
are truthful and bilingual, the category menus match the native catalog in both
languages, and the dropdown dismissal and keyboard behaviour work. One check could
not be done live (A0).

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `c7be683` (sparse worktree, removed) | 18 suites, **190 tests pass**. |
| `tsc --noEmit` | Exit 0. |
| Live pages, `localhost:3001` | EN and AR at 1440, 390 and 320 px; desktop dropdown by click and keyboard; mobile menu and drill-in. |
| Native catalog | Store API on `localhost:9000` with `en-US` and `ar-EG`: 38 categories, 5 parents with 8, 8, 8, 5 and 4 children. |
| Not run | Lint and the production build (GPT reports both pass, 20 existing warnings), physical devices, native zoom, signed-in states. |

## What I verified

- **Announcements.** EN: "Find your daily essentials", "Vitamins, minerals & sports nutrition", "Explore the collection". AR: "اكتشف مكملات روتينك اليومي", "فيتامينات ومعادن وتغذية رياضية", "اكتشف المنتجات". The old "SHOP SUPPLEMENTS IN EGP" and "ENGLISH & ARABIC" strings are gone from the page source in both languages. Text is 14px (Inter in EN, Cairo in AR). The ticker is a named section ("Announcements" / "إعلانات المتجر"). Only one ticker is displayed per breakpoint (the other is `display: none`), and only one message cycle is exposed to assistive technology (copies are `aria-hidden`).
- **Reduced Motion (live).** This browser has OS Reduced Motion on, so I saw that state: one static cycle, copies hidden (0 of 5 visible), no pause button, horizontal scrolling allowed, 14px text, no document overflow at 390 or 320.
- **Categories.** On desktop I opened all five parents in EN and AR: child counts 8, 8, 8, 5, 4, first labels and "Shop all" match the native API names exactly, and every link uses a category ID. The mobile menu in AR shows the five parents and "Shop by" (3 links), and the drill-in panel for Vitamins shows 8 children.
- **Dropdown keyboard and dismissal (EN, 1440).** ArrowDown on a category opens the menu and focuses "Shop all". Escape closes it and returns focus to the category button (`aria-expanded=false`). With focus inside the menu, scrolling past the category band (scrollY 420) closes it and moves focus to the "Search Vi2" button, as GPT describes. A partial scroll of 60px keeps it open.
- **Landmarks.** Desktop nav is named "Main categories and shopping links"; mobile menu has named navs ("Shop by"; the drill-in nav takes the category name).

## Findings

### A0 (not verified): live pause/resume and normal-motion animation

I could not run the animated state. The browser forces Reduced Motion (`matchMedia` returns true; overriding it after load does not reach the hook). The pause button therefore never appears for me. I read `AnnouncementTicker.tsx` and ran GPT's tests (button label and `aria-pressed` toggle, `animation-play-state: paused`, no button in Reduced Motion); note that these tests mock the shared ticker hook. Please have someone with Reduced Motion off check: the loop is seamless, the button pauses and resumes it, and hover and keyboard focus pause it.

### A1 (should fix): the "Language and currency" region contains more than that

`Navbar.tsx` puts `role="region" aria-label={nav.preferences}` on the whole `utilityStrip`. That strip also holds the "Daily flash deals" link and the announcement ticker, so screen readers announce a region called "Language and currency" containing a deals link and another landmark ("Announcements"). Measured in AR: the region holds 2 links, "العروض اليومية..." and "ENG". Fix: move the region role and label to the language/currency group (`utilityRight`), or label the strip "Header utilities".

### A2 (minor): needless unnamed tab stop in Reduced Motion

In Reduced Motion the announcement viewport gets `tabIndex=0` with no role or accessible name, even when nothing overflows (894 of 894 px at 1440). A keyboard user lands on an unnamed element for no benefit. Give it `role="group"` and the section label, or make it tabbable only when `scrollWidth > clientWidth`.

### A3 (minor): Arabic static order is left to right

`.topMarquee` is `direction: ltr`, so in Arabic (static or reduced-motion view) the first message appears at the left end and the last at the right. An Arabic reader expects the first on the right. Use the page direction in the static view.

### A4 (minor): pause button states itself twice

The label changes ("Pause animation" to "Resume animation") and `aria-pressed` also toggles, so a screen reader says "Resume animation, toggle button, pressed". Use a fixed label with `aria-pressed`, or a changing label without it. The same pattern is on the product and brand strips.

### A5 (minor): dropdown anchoring and focus-out

- Opened at scrollY 0 and scrolled 60px, the menu stays at top 178 while the category band is at 118, leaving a 60px gap until it is dismissed (about 105px of scroll). It stays open but does not follow its trigger.
- With the menu open, pressing Tab 10 times from "Shop all" moved focus out of the menu to the hero's "Show slide 2" button while the menu stayed open over the page. Only Escape closed it. Close the menu on focus-out, or when focus leaves the nav and menu.

### A6 (minor, existing but in scope for navigation accessibility): mobile drill-in does not isolate the main list

On mobile the drill-in panel sits on top of the main category list (rects overlap; `elementFromPoint` at a main item returns the panel link), but the main list is not `inert` or `aria-hidden`, so its five buttons stay focusable underneath. I did not verify focus placement on drill-in with a real keyboard (my click was scripted). Fix: mark the covered list `inert` while a panel is open, and move focus to the panel's back button, restoring it on back.

## Not verified

Physical touch, native zoom, other browser engines, signed-in header states, a populated cart, adding or renaming catalog entries (GPT correctly made no catalog writes), and the offscreen and hidden-tab pause paths (covered only by the shared hook's unit tests).

---

# Recheck of `e2699e1` against `c7be683` (2026-10-16)

GPT's response is the A0-A6 table in `docs/reviews/storefront-header-announcements.md`
(on `gpt/work`). Nothing edited or merged; my checkout (`claude/rd4-product`) untouched.

**Verdict: approved. A1, A2, A3, A4 and A6 are fixed, A5 is fixed except the
anchor gap, and A0 is still unverified by me.** Two minor findings remain (B1, B2)
plus one low-priority note (B3).

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `e2699e1` (sparse worktree, removed) | 18 suites, **193 tests pass** (3 more than before). |
| `tsc --noEmit` | Exit 0. |
| Live `localhost:3001` | Desktop EN and AR at 1440; mobile AR at 390 with real keyboard input (Enter, Escape, Tab, ArrowDown through the browser). |
| Not run | Lint and the build (GPT reports both pass), physical devices, native zoom, signed-in states. |

## Finding by finding

| # | Result | Evidence |
|---|---|---|
| A0 | **Still not verified by me** | My browser forces OS Reduced Motion (`matchMedia` returns true), so the pause button never renders and I cannot see the moving loop. GPT reports a live no-preference run showing transform movement and pause/resume in EN and AR; I could not reproduce that. Please have someone with Reduced Motion off take one look. |
| A1 | **Fixed** | The only region on the page is "اللغة والعملة" (Language and currency) and it contains just the language button. The Deals link and the announcements are outside it. Rendered-markup tests cover the scope. |
| A2 | **Fixed (with a small remainder)** | The Reduced Motion viewport is now `role="group"` with the label "إعلانات المتجر"/"Announcements". It is still a tab stop even when nothing overflows, but it has a name now. It repeats the name of its enclosing section (same label twice), which is redundant but harmless. |
| A3 | **Fixed** | In Arabic static view the messages now run right to left: first message at x 871, then 621, then 469. The animated track keeps its seamless direction. |
| A4 | **Fixed in code, not seen live** | `aria-pressed` is removed from the announcement, product and brand pause buttons; only the Pause/Resume label changes (diff and tests). The button itself is not rendered in my browser (A0). |
| A5 | **Mostly fixed** | Focus-out now closes the menu: ArrowDown opened Vitamins and moved focus to "Shop all"; ten Tabs later focus was on the hero's "Show slide 2" and the menu had closed. The backdrop is no longer a tab stop. **The anchor gap is still there** (B1). |
| A6 | **Fixed** | Real keyboard in AR at 390px: Enter on a category moves focus to "رجوع" (Back); the root header and list are `inert` and `aria-hidden` while drilled in; the sub-panel has its own "إغلاق القائمة" (Close menu); Enter on Back returns focus to the exact opener ("التغذية الرياضية"), and the root list is usable again. The Health Goals drill-in and Back behave the same way. |

## Remaining findings

### B1 (minor): the open dropdown still does not follow its trigger on a small scroll

GPT could not reproduce this because it opened the menu already scrolled. Reproduction:
open a category at scroll 0 (menu top 178 = band bottom 178), then scroll to 60px.
The menu stays at top 178 while the band bottom moves to 118, a 60px gap (the same
until dismissal at about 105px of scroll); scrolling back to 0 realigns it. It is a
fixed-position panel that keeps its open-time position. Smallest fix: update the
panel top from the band's bottom in the existing scroll handler (or close at the
first scroll).

### B2 (minor): a click on empty space inside the menu closes it

The new focus-out rule closes the menu whenever the new focus target is not another
element in the nav or menu. A click on non-focusable space in the panel moves focus
to nothing (`relatedTarget` null), so the menu closes. I confirmed the handler by
dispatching a `focusout` with no related target (a simulation, not a mouse click).
Fix: ignore focusout when the pointer is inside the menu (for example check
`document.hasFocus()` and pointer capture, or treat null `relatedTarget` as a close
only for keyboard focus loss).

### B3 (low, existing): drawer focus on open and close

Opening the mobile menu with Enter leaves focus on the hamburger button outside the
drawer, and after Escape closes the drawer focus stays on the (now inert) Health
Goals button instead of returning to the hamburger. GPT states that whole-drawer
focus trapping was deliberately not added. Worth a follow-up with the same pattern
used for the cart drawer (`useDrawerFocus`).

## Not verified

The animated ticker and its pause/resume (A0), physical touch, native zoom, other
browser engines, signed-in header states and a populated cart.

---

# Recheck of B1-B3 in `1c3a90e` against `e2699e1` (2026-10-16)

GPT's response is the final section of `docs/reviews/storefront-header-announcements.md`
(on `gpt/work`). Nothing edited or merged; my checkout (`claude/rd4-product`) untouched.

**Verdict: approved. B1, B2 and B3 are fixed. No new findings.**

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `1c3a90e` (sparse worktree, removed) | 18 suites, **196 tests pass** (3 more than `e2699e1`). |
| `tsc --noEmit` | Exit 0. |
| Live `localhost:3001` | Desktop EN at 1440 with real wheel and mouse input; mobile EN and AR at 390 with real Enter, Tab, Shift+Tab and Escape. |
| Not run | Lint and the build (GPT reports both pass), physical devices, native zoom, signed-in states, the animated ticker (my browser still forces Reduced Motion, see A0). |

## Results

| # | Result | Evidence |
|---|---|---|
| B1 dropdown anchor | **Fixed (by dismissal)** | The dropdown now closes on the first page scroll, resize or window blur instead of staying open and detached. A real wheel scroll from 0 (scrollY 100) closed the menu. With focus inside the menu, a small scroll closed it and moved focus to "Search Vi2". Opening with ArrowDown still keeps it open, so the scroll listener does not fire on open. |
| B2 empty-panel click | **Fixed** | A real mouse click on blank space in the open panel (recorded target: a menu `section`, at 1300,340) left the menu open. A click on a link still navigates; the backdrop and moving keyboard focus to another control still close it (A5 check of ten Tabs still passes in code and earlier recheck). |
| B3 mobile drawer focus | **Fixed** | EN, 390px, real keys: Enter on the hamburger opens a modal dialog named "Menu" (AR: "القائمة") with focus on its first link; 40 Tabs (AR: 45) never left the dialog; Shift+Tab wraps; Escape closes it and returns focus to the hamburger and brings the bottom nav back. Drill-in still focuses Back, 30 Tabs inside the Vitamins panel stay in the panel (root layer inert), and Escape from the panel closes everything and focuses the hamburger. |

## Shared focus hook and the cart

- **Cart from its own button.** Focusing the Cart button and pressing Enter opens the
  cart with focus on "Close cart"; Tab (6 presses) stays inside; Escape closes it and
  returns focus to the Cart button.
- **Cart opened while the menu is open.** With the mobile menu open, triggering the
  cart closes the menu and leaves focus in the cart ("Close cart"), so the menu's
  focus restore does not steal it. After Escape, focus returns to the hamburger (the
  element that had focus when the cart opened), not the Cart button. That is
  acceptable, and a real mouse cannot trigger this path because the menu backdrop
  covers the header cart button.
- **Hook change.** The extra two-frame retry only runs when focus has not landed
  inside the drawer, and its cleanup cancels the pending frame, so the cart's
  existing immediate focus, Escape, Tab and opener recovery are unchanged.

## Not verified

The animated announcement ticker and its pause/resume (A0, GPT's live no-preference
run stands), physical touch, native zoom, other browser engines, signed-in header
states, a populated cart, and real mouse activation of the cart while the menu is open.
