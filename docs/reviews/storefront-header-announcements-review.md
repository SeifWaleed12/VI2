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
