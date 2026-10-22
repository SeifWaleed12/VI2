# Trending Products strip

GPT, 2026-10-22. Owner-requested UI on `codex/trending-products-ui`, following header fix `70c378a`. Owner testing and Claude review pending; no push or merge.

## Delivered

- Removed Vi2 Picks and renamed the heading Trending Products / منتجات رائجة. Heading and rail share the page content edge (32px at desktop, 14px mobile); Arabic mirrors the heading and View All.
- Consistent product/photo boxes and readable names. Reused CatalogImage for missing/broken images, so the development product without a photo gets its existing letter fallback rather than a second product-name label or empty image URL.
- The real supplied products repeat visually for a continuous native-scrolling loop at 28px/sec, including a two-product catalog. No invented extra products, sales ordering or selection endpoint. Visual copies are hidden from assistive technology and excluded from the tab order; each real product has one keyboard stop.
- The rail pauses while a mouse is over it or a product has keyboard focus. Product images enlarge 7% on hover/focus without resizing the layout. Leaving/blurring resumes from the same position. No Pause button or scrollbar.
- Native touch scrolling is retained. Touch pauses automatic motion, and motion resumes 1.5 seconds after native scrolling settles. Mouse-hover handlers use pointer type so touch emulation cannot leave the strip permanently paused.
- Reused the existing ticker visibility/measurement lifecycle. Its explicit reduced-motion opt-out applies to this owner-requested auto-moving product strip; unrelated brand behavior is unchanged. Native scroll animation avoids competing CSS transforms during swipes or keyboard scrolling.

## Claude follow-up

The workboard has a separate requested task for an ordered, admin-managed selection of up to eight existing Medusa products. Claude must define persistence, authorization and the public read contract using native capabilities first, including unpublished/deleted-item behavior. Two products are valid during development. Automatic popularity/sales ranking is outside that task. The UI currently consumes the existing supplied catalog array and awaits the confirmed contract for integration.

## Verification

- `node ../../node_modules/jest/bin/jest.js --runInBand --testMatch '**/src/**/__tests__/**/*.test.[jt]s'` from apps/storefront: **42 suites, 413/413 passed**. Explicit glob handles the known Windows `.codex` path matching issue; the application's existing React resolution remains intact.
- New native-scroll tests cover stable advancement, seamless cycle wrapping, frame/observer cleanup, paused startup, touch scrolling and inertia-delayed resume. Render tests cover the new EN/AR heading, two real products, image fallback, no controls and one keyboard stop per real product. Existing announcement and brand behavior remains covered.
- Typecheck passed; lint **0 errors / 0 warnings**; final Impeccable scan **0 findings**. Existing React prefetch warnings and deliberate offline-test output remain.
- Browser with actual development catalog: English and Arabic at 1280px and 390px, no horizontal page overflow. The desktop heading and rail start at the same 32px edge; mobile rail has 148px items. Hovered image computed transform was `scale(1.07)` and scrollLeft remained **267** while hovered; movement resumed at **275** after leaving. Keyboard Tab entered the first real product with a focus outline/enlargement; View All went to the locale's shop. Missing-image fallback, photo scaling and mirrored Arabic heading were visually checked.

Not run: production build, physical touch/inertia, physical screen-reader speech or a new provider acceptance run. No real catalog data was changed. The existing manual-test backend remains on 9000 with its prior in-memory Redis configuration. The storefront on localhost:3000 serves this branch.
