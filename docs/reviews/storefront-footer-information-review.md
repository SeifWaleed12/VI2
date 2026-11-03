# Review: RD-5 footer and bilingual information drafts (`289b92c`)

Reviewer: Claude. Author: GPT (`gpt/work`, baseline `093048b`). Reviewed 2026-10-18.
Author handoff: `docs/reviews/storefront-footer-information.md` (on `gpt/work`).
Nothing edited or merged; my checkout (`claude/redis-dev`) is untouched.

## Verdict

**Approved, with one finding to check (F1) and three minor notes.** The footer and the
six-page information interface are clean, bilingual and keyboard-friendly, and the
production block on the unapproved drafts is solid. The content itself is not
approved by anyone yet, and the store has no policy pages in production until it is.

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `289b92c` (sparse worktree, removed) | 31 suites, **318 tests pass** (matches GPT). |
| `tsc --noEmit` | Exit 0. |
| My own production build (`next build --webpack`, exit 0, 49 s) and `next start` on port 3003 | Used for the draft-blocking checks below; stopped and removed afterwards. |
| Live `localhost:3001` development preview | EN and AR at 1440, 982, 980, 390 and 320 px, with a backend that I started on 9001 from GPT's checkout (Redis was down, so cache and locks ran degraded) and stopped again afterwards. GPT's checkout status was unchanged. |
| Not run | Lint and GPT's own production build (GPT reports 0 errors, 15 warnings), screen readers, physical devices, native zoom. I did not read the full legal wording; I skimmed the drafts for invented figures or promises and found none (no days, amounts, statute numbers, refund promises or authenticity claims). |

## What I verified

- **Footer, EN and AR (development).** Logo link, then "All products" and the five native
  parents with canonical handle URLs (`/en/shop/vitamins-minerals`, `/ar/shop/...`),
  then a "Store information" column with the six pages and a visible "drafts are
  shown here for owner review only" note. All 12 information URLs and every footer
  destination return 200; the Arabic footer is right to left with Cairo. Footer links
  are 16px and 44px tall; three columns at 1440, two rows at 980.
- **Information pages.** Six slugs in each language; each has a breadcrumb, an
  "Information" sidebar (current page marked), a "Draft for review" notice, an "On this
  page" list and headed sections with an "Owner input required" box where facts are
  missing. Title 56px (40px on mobile), 16px prose with a 707px reading column on
  desktop; Arabic is Cairo with normal letter spacing and 1.6-1.8 line height; sidebar on
  the right in Arabic. The layout switches to stacked at 980px and to a sidebar at 982px;
  no horizontal overflow at 1440, 982, 980, 390 or 320. Titles are localized ("About Vi2 | Vi2", "الشحن والتوصيل | Vi2").
- **Unknown paths.** `/en/Privacy`, `/en/__proto__`, `/en/constructor`, `/en/categories`,
  `/ar/categories` and `/en/admin` all return 404; `/en/privacy/` redirects once to `/en/privacy`.
- **Keyboard.** Tabbing from the footer logo goes through All products, the five
  categories and the six information links in order, then leaves the footer;
  the footer and page links have visible `:focus-visible` outlines in the CSS. Enter on an
  "On this page" link updates the hash and focuses the target heading (but see F1).
- **Production draft blocking (my own build).** With `NODE_ENV=production` all twelve
  pages (`/en` and `/ar`: about, contact, shipping, returns, terms, privacy) return **404**,
  including with `?preview=true`, `?preview=1&dev=1`, `?draft=true`, a trailing slash and a
  hash; the 404 bodies contain none of the draft text ("Draft for review", "Owner input
  required", the Arabic notice, "Registered business name"). The production footer on
  `/en`, `/en/shop` and `/ar/shop` has only the logo, All products and the five categories,
  one "Shop" heading, and none of "Store information", the preview note or the draft
  wording anywhere on the page.

## Findings

### F1 (check in a normal browser): in-page "On this page" links do not scroll

In this browser, activating a contents link with a real mouse click and with Enter
(for example "Product condition and problems" on `/en/returns`) sets the URL hash and
moves focus to the heading, but the page stays at the top: `scrollY` 0 while the heading
sits at 1169px, below the 900px viewport, so nothing visibly happens. I got the same on the
home page, where `/en#health-goals` (also the target of the new mobile "Health Goals"
link from RD-3) does not scroll on load or from a plain `<a href="#health-goals">`, so
this is a site-wide behaviour that RD-5 inherits rather than something RD-5 introduced.
`element.scrollIntoView()` does scroll, and Next `Link` hash navigation did scroll in
the shop. Suspects: the page-reset script in `app/[locale]/template.tsx` (it scrolls to
the top on mount) and the root `overflow: clip` on `html` and `body`. Please confirm in a
regular desktop and mobile browser; if it reproduces, fix it once globally (for in-page
anchors use a handler that calls `scrollIntoView` or Next `Link`). GPT's note says
"focuses its target heading", which is accurate; scroll position was not checked.

### F2 (minor): heading order on information pages

The sidebar's `<h2>` "Information" comes before the page `<h1>` in document order, so a
screen-reader heading list starts with an h2. Use a non-heading label (or `aria-label`
only) for the sidebar and keep the single h1 first. Visible only in development.

### F3 (minor): the breadcrumb link is a small target on mobile

At 390px the breadcrumb "Home" link is 22px tall; every other link on the pages (sidebar
46px, contents 44px, footer 44px) is fine.

### F4 (note, before launch): production has no policy pages until the owner approves

By design, production now serves no About, Contact, Shipping, Returns, Terms or Privacy
page and no link to them (the old footer had text links that went nowhere). Review the
two snapshots in `docs/drafts/` and supply the facts listed in the handoff (business
identity, support channels and hours, delivery coverage and charges, returns process,
privacy controller and processors); the Arabic and legal wording also needs a native and
legal reviewer. Because the gate is `NODE_ENV === "development"`, a staging site run in
production mode will not show the drafts either; the owner reviews them locally or from the
snapshot files. Publishing needs a separate, owner-authorized change.

### F5 (note, outside RD-5): home page returns 500 when the backend is down

Before I started a backend, `/en` returned HTTP 500 while `/en/shop` returned 200 with its
outage state and the footer fell back to "All products". The home page's behaviour on a
backend outage predates RD-5; worth a follow-up so the home page degrades like the shop.

## Not verified

A populated footer against a live production backend (I did check the five categories live
with a real backend in development and in my production build), screen readers, physical
devices, native zoom, other browsers, and the Arabic and legal wording.

---

# Recheck of `2aaf3ea` against `289b92c` (2026-10-18)

GPT's response is the "Claude review response" section of
`docs/reviews/storefront-footer-information.md` (on `gpt/work`). Nothing edited or merged;
my checkout (`claude/redis-dev`) untouched.

**Verdict: approved. F1, F2 and F3 are fixed, and the production block on the drafts is
intact.** One small new note (G1).

## Checks run

| Check | Result |
|---|---|
| Storefront Jest on `2aaf3ea` (sparse worktree, removed) | 32 suites, **329 tests pass** (11 more than `289b92c`). |
| `tsc --noEmit` | Exit 0. |
| Live development preview `localhost:3001` | Real mouse and keyboard, EN 1440px and AR 390px. I started a backend on 9001 from GPT's checkout (Redis down, degraded cache and locks) and stopped it afterwards; GPT's checkout status is unchanged. |
| My own production build (`next build --webpack`, exit 0) on port 3003 | Draft blocking and the shared scroll behaviour in the production bundle. Stopped and removed afterwards. |
| Not run | Lint (GPT reports 0 errors, 15 warnings), screen readers, physical devices, Firefox and Safari. |

## F1: fragment scrolling is fixed, shared with the rest of the site

`app/[locale]/template.tsx` now scrolls the decoded fragment target into view
(instantly) on mount and for two frames afterwards, on `hashchange`, on `popstate`, and
after clicks on internal links (including a repeated click on the current hash, which
emits no `hashchange`); non-fragment route and query changes still reset to the top, and
a missing or malformed fragment does nothing.

| Case | Result |
|---|---|
| Real mouse click on a contents link (`/en/returns`, "Requesting a return") | Hash `#request`, `scrollY` 792, heading top **96px** (clear of the 73px pinned bar), heading focused. |
| Enter on the "Product condition and problems" link | `scrollY` 1095, heading top 96, focused. |
| Enter again on the same link after scrolling back to the top | Scrolls again (same result); the repeated hash works. |
| Fresh load of `/en/returns#condition`, and a reload | Settles at 1095 / 96 and stays there across six samples 500 ms apart (no late reset). |
| History | Click A, click C, Back lands on A (792 / 96), Back again returns to the start with no hash and `scrollY` 0, Forward returns to A. |
| Missing id (`#nope`) and malformed escape (`#%E0%A4%A`) | Page loads at the top, no thrown error; the only console errors are the existing guest 401s and an unrelated image `src`. |
| Home page, direct load of `/en#health-goals` | Now scrolls (`scrollY` 1737); also after a click from `/en/shop` on the header "Health Goals" link (the RD-3 link). Same result in my production build: direct load, repeated click, and Back returns to the top. |
| Arabic, 390px | The "On this page" link scrolls to `#refund` (`scrollY` 1838, top 96) and focuses it; no horizontal overflow. |
| RD-3 regression check | Enter on a category link in the shop sidebar still scrolls the results area to top 96 and focuses `#shop-results`. |
| Ordinary navigation | Clicking a product card from a scrolled shop still jumps to the top (the reset is kept). |

## F2 and F3: fixed

- **F2.** The sidebar label is now a paragraph (`navigationTitle`); on `/ar/returns` the first heading is the `h1` and the outline starts `H1, H2, H2`.
- **F3.** The breadcrumb "Home" link measures 44 by 44px at 390px in Arabic (it was 22px).

## Production draft blocking: still intact

In my production build of `2aaf3ea`, all twelve draft URLs (`/en` and `/ar`: about, contact,
shipping, returns, terms, privacy) return **404**, as do `?preview=true`, `?preview=1&dev=1`,
`?draft=true`, `/en/Privacy` and a URL with a hash. The 404 bodies contain none of the draft text.
The production footer on `/en` and `/ar/shop` has only the logo, All products and the five
categories under one "Shop" heading; "Store information", the preview note and any draft
wording are absent from the whole page.

## Note

### G1 (minor): the shared scroll lands flush under the pinned bar on some sections

The information headings use `scroll-margin-top: 96px`, so they land clear of the 73px
pinned bar. Other targets have no margin: the home `#health-goals` section lands at 0px,
so its top edge and eyebrow sit under the pinned bar, with the heading tight below it.
A global `scroll-margin-top` for in-page targets (or `scroll-padding-top` on `html`) would
make every anchor consistent.

## Not verified

Firefox, Safari, physical devices, screen readers, the animated-scroll case under
Reduced Motion (the scroll is instant, so not needed), and the Arabic and legal wording
(F4 of the first review still stands).

---

## G1 confirmation: `d92f80d` against `2aaf3ea` (2026-10-18)

**Approved. G1 is fixed and nothing is doubled.** The change is four lines of CSS in
`app/globals.css`: `:where(main [id]) { scroll-margin-top: 96px; }`. The `:where` makes it
zero-specificity, so any component rule overrides it. I did not touch GPT's checkout
(I started a backend on 9001 for the home page and stopped it again).

| Check | Result |
|---|---|
| Jest and types on `d92f80d` (sparse worktree, removed) | 32 suites, **329 tests pass**; `tsc` exit 0. Only `globals.css` changed in source. |
| No stacked offsets | The repository has only the existing per-component margins (information headings 96px, shop results 96px) and no `scroll-padding-top`; `html` computes `scroll-padding-top: auto`. Scroll margin and scroll padding add up, but there is no padding, and the two components already used 96px, so the default does not change them. |
| Home, EN 1440px | `#health-goals`, `#best-sellers` and `#brands` now compute 96px (was 0). Direct load of `/en#health-goals` lands at 96px (scrollY 1641) and stays there; repeated anchor clicks to `#best-sellers` (1025 / 96), `#brands` (1605 / 96) and `#health-goals` (1641 / 96) all land at 96px, clear of the 73px pinned bar (it was 0px, under the bar, before). One earlier batch of my synthetic clicks scrolled nowhere, but five repeats of the same loop all landed correctly, so I attribute it to my script's timing, not the page. |
| Home, AR 390px | `/ar#health-goals` lands at 96px (scrollY 1205); the pinned bar is 75px, so there is a 21px gap and the section heading sits at 156px; no horizontal overflow. |
| Information pages, EN | `#condition` computes 96px and lands at 96px (not 192); the default rule gives the `#draft-notice-title` element 96px too. |
| Shop | `#shop-results` computes 96px; Enter on a category link still scrolls the results to 96px and focuses `#shop-results` (432 / 96), as in my RD-3 recheck. |
| Draft blocking | CSS-only change; I did not rebuild production. My `2aaf3ea` production results stand, and the diff touches no routing, gate or content. |

Not verified: Firefox and Safari, physical devices, a home page backed by a populated
production backend (I used GPT's dev preview with a local backend).
