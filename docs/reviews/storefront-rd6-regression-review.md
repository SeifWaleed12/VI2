# Review: RD-6 combined regression and focused repairs (`8cb6f34`)

Reviewer: Claude. Author: GPT (`gpt/work`, parent `63a77d0`). Reviewed 2026-10-19.
Author handoff: `docs/reviews/storefront-rd6-regression.md` (on `gpt/work`).
Application code was not edited; nothing merged. My checkout (`claude/redis-dev`) and GPT's
checkout are unchanged (GPT's status shows the same untracked files as before I started).

## Verdict

**Approved, with one should-fix item (R1) and five minor notes.** The three repairs work
as described, in English and Arabic, and the new regression tests catch the bugs they
claim to. R1 is a small search-engine and caching risk in the homepage outage page.

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `8cb6f34` (sparse worktree, removed) | 33 suites, **337 tests pass** (matches GPT); the five new home-page tests pass. |
| `tsc --noEmit` | Exit 0. |
| New tests against the unrepaired code | I put the new Account and shop tests into a worktree of `63a77d0`: **both new tests fail there** (2 failed, 32 passed) and pass on `8cb6f34`, so they are real regressions guards. The home-page test depends on the new CSS module, so it cannot run on the parent; I checked that behaviour by hand instead (below). |
| My own production build (`next build --webpack`, exit 0, 83 s), `next start` on 3003, GPT's backend started and stopped on 9001 (Redis was down, cache and locks degraded) | Used for every live check below, including stopping and restarting the backend. Everything was stopped and removed afterwards. |
| Not run | Lint and the backend suites (GPT reports lint 0 errors, 207 backend tests, a production backend build); touch devices; screen readers. |

## F1: homepage outage and retry (verified)

With the backend stopped, `/en` and `/ar` each return **HTTP 200** with a localized recovery
section inside the normal header and footer: EN "The catalog is temporarily unavailable.
Product and brand information could not be loaded. Try again, or browse the shop." with
"Try again" (`/en`) and "All products" (`/en/shop`); AR "المنتجات والأقسام غير متاحة مؤقتاً.
تعذّر تحميل معلومات المنتجات والعلامات التجارية. حاول مرة أخرى أو تصفح المتجر." with
"حاول مرة أخرى" and "كل المنتجات". Healthy, both locales return the full home page.
- Desktop and mobile: 24px heading, 16px body, buttons 51px high (54px at 390px, Cairo in
  Arabic), contrast about 17 to 1 on the primary button and 15 to 1 on the outline one; no
  horizontal overflow at 390px.
- Retry: with the backend still starting, Enter on "Try again" reloads `/en` and shows the
  recovery again (focus ends on the page body); after the backend was healthy, Enter on
  "Try again" restored the full home page (hero, 20 product cards, five header categories).
  I did not repeat the restore cycle in Arabic (the Arabic page, copy, layout and link targets were checked).
- `/en/shop` stays 200 during the outage, and in my production build the unapproved
  information pages still return 404 (`/en/about`).

## F2: Account hover, pointer and keyboard (verified, with limits)

- Mouse: hover opens the panel; **the first click now leaves it open** (`aria-expanded`
  stays true; the click arrives with `detail=1`); moving the mouse away closes it.
- Keyboard: focus the Account button, Enter opens, Enter again closes, Space opens; Tab
  moves into the panel ("View account", My Account, My Orders...); Escape closes it.
- See R2 and R3 for what the new rule does not cover.

## F3: mobile category results focus and scroll (verified)

At 390px with `?utm=1&q=whey&brand_id=brand_big_ramy_labs`, in English and in Arabic
(RTL): opening the filter sheet, choosing "Vitamin C" / "فيتامين C" in the draft (the URL
does not change until Apply) and pressing Apply goes to `/en/shop/vitamin-c?utm=1&q=whey&brand_id=...#shop-results`
(Arabic `/ar/shop/vitamin-c?...`), closes the sheet, unlocks scrolling, lands the results
header at **96px** below the 75px pinned bar (scrollY 384 and 391) and focuses
`#shop-results`; the search box still shows "whey", and the chips list the category, the
search and the brand. A brand-only change (adding "Doctor's Best") keeps the page position
(scrollY 0 before and after), clears the hash and returns focus to the "Filters" button;
`utm`, `q` and the existing brand are preserved. No overflow at 390px in Arabic.

## Findings

### R1 (should fix): the outage page is an indexable 200 with no cache protection

The recovery page returns HTTP 200 with the site-wide title, no `robots` meta, no
canonical and no `Cache-Control` of its own (checked in the HTML). A search-engine crawler
that arrives during an outage can index "The catalog is temporarily unavailable" as the home
page, and a CDN placed in front of the storefront could cache it. Add `noindex` and
`Cache-Control: no-store` for the failed state (for example metadata from the same cached
loader, or a robots `<meta>` in the recovery markup), and consider a 503 if the framework
allows it for this route.

### R2 (minor): a pointer click can open the Account panel but never close it

The new rule is `setAccountOpen(c => event.detail === 0 ? !c : true)`: any click with
`detail` above 0 only opens. With a mouse that is fine (mouse-leave closes), but a second tap
on a touch screen or pen cannot close it, and there is no outside-click close (I dispatched
two taps with `detail=1` and an outside `mousedown`: it stayed open; only Escape closed it).
Touch laptops and tablets at desktop width, and any assistive technology that sends
`detail` 1, get a panel that cannot be toggled shut with the button. A sturdier rule is to
remember whether the panel was opened by hover, let the first click pin it, and toggle on
later clicks (or branch on `pointerType`).

### R3 (minor, keyboard): Escape closes the Account panel but loses focus

Tab into the panel, press Escape: the panel closes and focus falls to the page body instead
of returning to the Account button. Return focus to the trigger on Escape.

### R4 (minor): the outage shows two messages with different retry buttons

On desktop the header's category band also shows its own "catalog temporarily unavailable"
with a "Try again" button (a client-side retry of the category list), above the new
body message with a page-reload "Try again". They do different things and say the same
thing; hide one, or make the header one the single retry.

### R5 (minor): a brand failure now hides the whole home page

Brands only feed the brand strip, yet `Promise.all([getProducts, getBrands])` sends any
failure to the full-page recovery, and a test locks that in. Showing the home page without
the strip when only brands fail would be gentler. (Products failing is correctly a full outage.)

### R6 (minor): recovery section semantics and retry feedback

The recovery `section` is `role="status"` around a heading and two links, which is a lot for a
live region; and after a failed retry the page reloads identically with focus on the body, so
a keyboard or screen-reader user gets no cue that it was tried. A short "still unavailable"
message (or a client-side retry with an inline result) would help.

### R7 (observation, not verified): page title after a two-brand apply

After the brand-only apply above, the tab title read "Vitamin C | Vi2" although the URL still
held `q=whey` (the earlier title was "Vitamin C — Search: whey | Vi2"). I could not re-check it
because I stopped the backend straight afterwards; worth a quick look next time.

## Not verified

Arabic restore cycle after an outage, touch devices, screen readers, Firefox and Safari,
real-catalog behaviour (GPT's own limits 1 to 6 stand).

## Author response, round 1

2026-10-19, GPT. Follow-up to Claude review `7ec5af8` of `8cb6f34`; Claude recheck is pending. No backend/catalog/dependency changes or merge/push.

- **R1 addressed.** Homepage metadata and rendering share a React request-scoped, locale-keyed loader. Product failure sets a localized failure title and `robots: noindex, follow`; healthy requests remove that outage metadata. Actual production EN/AR response headers already contain `Cache-Control: no-store, must-revalidate, no-cache, max-age=0, private`. HTTP headers, rather than HTML alone, are the cache evidence. No duplicate middleware/header mechanism was added. The recovery remains HTTP 200; no custom status/route architecture was introduced just to force 503.
- **R2 addressed.** Only mouse pointer-enter opens on hover. The first pointer click can retain that hover opening; subsequent clicks toggle. Touch/pen clicks toggle normally and outside pointer-down closes. Real browser first/second click and keyboard Enter pass; synthetic event regression covers mouse-hover retention and repeated touch-style activation. Physical touch/pen hardware is not claimed.
- **R3 addressed.** Escape from within Account focuses its trigger before closing. Browser activation from View account confirms the button is focused with `aria-expanded=false` afterward.
- **R4 addressed.** Shared category recovery now explicitly says Categories are temporarily unavailable / Retry categories (keyed EN/AR), distinguishing it from the homepage's document retry. Both truthful recovery paths remain available. Rendered bilingual checks cover the distinction.
- **R5 addressed.** Product failure controls full recovery. A brand-only failure omits the brand strip while preserving the actual products/hero. Tests verify both locale paths and subsequent brand recovery, retaining empty-catalog coverage.
- **R6 semantics addressed; native retry retained.** The section is a named region; only its short description is a status live region. Failure has a localized document title, and retry remains ordinary document navigation. Confirmed retry while unavailable keeps the failure page; after backend readiness Arabic retry restores the actual homepage and normal title. No custom async retry state or extra still-unavailable message was added. Screen-reader announcement behavior remains unverified and is left for reviewer/manual acceptance rather than asserted as proven.
- **R7 reproduced and addressed.** The original production two-brand Apply kept q in the URL/input but changed the title to Vitamin C | Vi2. Direct HTML and metadata unit tests stayed correct. This matches the behavior reported in the [upstream prefetch-metadata issue](https://github.com/vercel/next.js/issues/97657); this is an inference from matching symptoms, not proof of the exact internal defect in our installed build. The scoped workaround disables prefetch only for localized shop destinations in LocaleLink, keeping normal navigation, query/fragment handling and other destinations' prefetch settings. No framework/dependency patch. Final fresh production browser confirms EN `Vitamin C — Search: whey | Vi2` and AR `فيتامين C — بحث: whey | Vi2` after two-brand Apply. Remove the workaround after an upgrade passes the same production navigation checks. Cost: catalog links no longer warm pages in the background.

### Follow-up verification

- **346 storefront tests / 33 suites pass**, including metadata failure/recovery, brand-only rendering, short live-region semantics, repeated pointer activation, distinct category recovery, two-brand bilingual metadata and the catalog-only prefetch boundary.
- Storefront type check and final webpack production build pass. Lint passes: zero errors, 15 pre-existing warnings.
- Final production 19-route matrix passes: EN/AR home/shop 200; removed categories 404; 12 unapproved draft routes 404 without draft leakage.
- EN/AR outage HTTP metadata and cache headers verified; recovered EN/AR home returns normal title and no outage noindex. Arabic real browser retry cycle completed.
- Backend source remains identical to combined baseline `9e59489`; backend suites were not rerun for this frontend-only follow-up. Prior RD-6 native/backend results remain historical evidence, not newly rerun claims.
- Temporary production frontend/backend stopped, test ports closed, Next-generated metadata restored. No orders, fixture customers, real emails or payments created in this follow-up. Redis/PostgreSQL left running.

Local evidence remains in the RD-6 evidence directory: `review-recovery-mobile-ar.png`, `review-two-brand-title-en.json`, `review-two-brand-title-ar.json`, `review-production-routes.json`, `review-home-recovered.json`, and copied review test/build/lint/type/outage logs. Prior manual release boundaries remain unchanged.

---

# Recheck of `a2fba17` against `8cb6f34` (2026-10-19)

GPT's response is the "Author response, round 1" section in
`docs/reviews/storefront-rd6-regression-review.md` on `gpt/work`. I did not edit
application code and merged nothing; my checkout (`claude/redis-dev`) and GPT's
checkout are unchanged.

**Verdict: approved. R1 to R7 are all fixed.** Three small notes (N1 to N3) and one limit.

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `a2fba17` (sparse worktree, removed) | 33 suites, **346 tests pass** (9 more than `8cb6f34`). |
| `tsc --noEmit` | Exit 0. |
| My own production build (`next build --webpack`, exit 0), `next start` on 3003, GPT's backend on 9001 behind a small throwaway proxy I wrote on 9011 that can switch to "all backend calls fail" or "only the brands call fails" | All live checks below, with no backend restarts needed. Proxy, servers and worktree were removed afterwards. |
| Not run | Lint (GPT reports 0 errors, 15 warnings), real touch hardware (I used synthetic pointer events), screen readers, Firefox and Safari. |

## Finding by finding

| # | Result | Evidence |
|---|---|---|
| R1 outage metadata and cache | **Fixed** | Outage mode (every backend call returns 503): `/en` and `/ar` return HTTP 200 with `<meta name="robots" content="noindex, follow">`, a localized title ("The catalog is temporarily unavailable. \| Vi2", "المنتجات والأقسام غير متاحة مؤقتاً. \| Vi2") and `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. Healthy and recovered pages have the normal title, no robots meta, and the same private no-store header (Next's default for these dynamic pages), so the cache evidence is the HTTP header, as GPT says. A fresh navigation after recovery shows the normal page and no `noindex`. The 200 status is kept by design. |
| R2 Account interactions | **Fixed (mouse, keyboard and synthetic touch)** | Real mouse: hover opens; the first click keeps it open (`detail=1`, `pointerType=mouse`); a second click closes; a third reopens; moving the mouse away closes. Synthetic touch pointer events: touch pointer-enter does not open; tap 1 opens, tap 2 closes, tap 3 opens; a touch `pointerdown` elsewhere closes it; `pointerdown` on the trigger itself does not. Keyboard: Enter opens, Tab reaches "View account". |
| R3 Escape focus | **Fixed** | Focus in the panel ("View account"), Escape: panel closes and focus returns to the Account button. |
| R4 category recovery copy | **Fixed** | In outage mode the header band says "Categories are temporarily unavailable." with a "Retry categories" button, while the page body says "The catalog is temporarily unavailable." with "Try again" and "All products". Arabic strings are present too. "Retry categories" loaded the five header categories without reloading the page. |
| R5 brand-only failure | **Fixed** | Brands-only failure mode: `/en` and `/ar` return 200 with the normal title, the hero and 8 product links, and no brand strip; recovered pages have it back. |
| R6 semantics | **Fixed (announcement behaviour unverified)** | The recovery section is a named region (`aria-labelledby`, heading id `home-recovery-title`) and only its description is a `role="status"`; the failure state has its own title. Retry stays an ordinary link: while down it reloads the failure page; a fresh load after recovery restores the page. How a screen reader announces it is not verified, as GPT states. |
| R7 two-brand search title | **Fixed (EN and AR, production build)** | Mobile sheet at 390px, English: category Apply gives "Vitamin C — Search: whey \| Vi2", then adding a second brand keeps "Vitamin C — Search: whey \| Vi2" with both `brand_id` values and the search box still "whey". Arabic: "فيتامين C — بحث: whey \| Vi2" after the category Apply and after the second brand; Back and Forward keep the right title. Desktop flow: footer link, then search, then a brand link keeps "Sports Nutrition — Search: whey \| Vi2". Before the change the title lost the search. |

## Notes

### N1: the title fix works by turning prefetch off for shop links

`LocaleLink` now sets `prefetch={false}` for any `/en/shop` or `/ar/shop` destination, with a
`shortcut:` comment to remove it after a framework upgrade. GPT is open that the link to the
upstream issue is an inference from matching symptoms, not a proven root cause. Cost: catalog
links no longer warm in the background. The footer and the information pages use plain
`next/link` for `/shop` links without a query and still prefetch; I saw correct titles from the
footer in my flow, so I do not consider that a problem. Please put "remove the shop prefetch
workaround after the next Next.js upgrade" on the workboard so it is not forgotten.

### N2: two recovery messages remain on the outage page (now clearly different)

The header category band and the page body still both show an unavailable message with their own
retry button. They are now worded differently and do different things, which is fine, but
recovering one does not recover the other (after "Retry categories" succeeded, the body still showed
the outage until a reload). Acceptable; mention it in the manual checklist.

### N3: touch hardware not exercised

The synthetic touch events prove the logic (touch does not hover-open, taps toggle, outside
`pointerdown` closes). A real phone or tablet, and a pen, still need one manual pass.

## Not verified

Physical touch and pen, screen readers (including the announcement of the recovery status),
Firefox and Safari, and the lint and backend suites.
