# Header announcement and navigation repair

2026-10-22. GPT implementation on `codex/header-ticker-fix`, based on reviewed baseline `c35510a`. Owner testing and Claude review pending; not merged or pushed.

## Requested behavior

- Removed the Daily Flash Deals / 24H Picks pill and divider from the utility strip. The announcement fills that space; the ordinary Deals navigation destination remains.
- Automatic announcement movement with no visible scrollbar or Pause button. Mouse hover and keyboard focus pause the strip; leaving/blurring resumes it. Offscreen and hidden-page pauses remain.
- Seif explicitly requested announcement autoplay despite the browser's reduced-motion preference, then removed the button requirement. The override applies only to announcements; product/brand strips still respect system motion preferences and retain their own controls.
- Five category destinations plus Brands, Health Goals and Deals share one desktop row. At narrow desktop widths labels can wrap at word boundaries within their own cells; groups never drop to another row. Mobile retains its existing drawer.

## Causes and implementation

The old 981–1399px media rule explicitly put both navigation groups in separate full-width rows. The ticker's browsing/reduced-motion rules enabled a horizontal scroll lane; focus on the old pause control could also reset it into that lane. Removed those announcement-only alternate styles and the promotional slot, retained the existing animation/lifecycle, and scoped compact gaps/type and word-boundary labels to intermediate widths.

## Verification

- Actual local catalog/browser: EN at 981/982, 1280 and 1544px; AR at 981/982 and 1280px; Arabic mobile at 390px. No navigation overlap/page overflow after the compact-label correction; all eight desktop controls share the same top coordinate. Existing colors, typography family, search/account/cart layout and locale direction retained.
- Autoplay has a changing CSS transform with a 36-second infinite animation even under reduced motion. Zero announcement buttons. Hover/focus pause and leaving/blur resume; focus-visible outline retained. Keyboard ArrowDown opens a category and focuses its first link. Native scrollbar hidden; track clipped.
- Storefront tests: `node ../../node_modules/jest/bin/jest.js --runInBand --testMatch '**/src/**/__tests__/**/*.test.[jt]s'` — 41 suites, **409/409 passed**. The explicit glob avoids a Windows Jest path-escape issue under the `.codex` worktree directory; no application Jest config or React mapping changed. Added coverage for EN/AR promotion removal and the scoped autoplay choice; updated announcement-control assertions to match Seif's final instruction. Other ticker pause controls remain covered.
- Typecheck passed; lint **0 errors / 0 warnings**; final Impeccable detector **0 mechanical findings**; `git diff --check` clean.
- Existing React `prefetch=false` render warnings and deliberate offline-test logs remain. Production build, physical screen-reader/touch and external provider acceptance were not run for this header-only fix.

The running storefront on `http://localhost:3000` now serves this fix branch, while the reviewed-baseline branch itself remains untouched. Backend on 9000 still uses the existing session's in-memory Redis replacements. No backend/data/dependency changes.
