# Product review UI finish disposition

2026-10-26. Candidate UI a48bdfc; API follow-ups6a35033.

**disposition: recapture** — source fixes verified, rendered acceptance remains open.

The independent Impeccable finish reviewer identified two source defects: a failed initial submission unmounted the form, and session expiry unmounted the draft before sign-in recovery. Both were fixed in one source batch and scored **resolved in source**, with no material regression identified from the fixes. Regression tests cover writer/form boundaries, new submission400/409/429/503, trimmed validation, stale saved version, customer/product memory isolation,15-minute expiry and server-rendering non-storage. The final focused review suites have22 tests. This is source verification, not a browser pass.

Mechanical detector source scan returned `[]` (one scan, before the finish source-fix batch). No second detector/polish loop was run. Changes in that batch concern failure-state mounting and in-memory recovery; the reviewer inspected the final source. Existing global design/typography files are preserved; implementation.md records inherited-system evidence.

CUA inventory exposed no browser provider. Both IAB and Chrome creation reported unavailable. Native app-window access timed out. No implementation screenshot was obtained; approved proposal PNGs are concept references only. No substitute/generated image is claimed as an actual render.

Required remaining captures/checks: EN/AR desktop1280/1440, mobile390/320,760/761 boundary; populated/empty/error/form/own-review states; keyboard radio/focus/scroll recovery; original mixed-language text and RTL; mobile Add to cart clearance; staff queue and decision focus. Physical touch, zoom/contrast and screen-reader speech remain unverified. The final source verdict grants no visual approval.

The built feature is handed to Claude for source and running visual review, and Seif for acceptance/merge. No full-feature shipping verdict is recorded while these checks are open.


## Claude Round2 and fix handoff —2026-10-26
Claude independently ran actual browser/layout checks on a48bdfc: EN1440/1280/981/761/760/390/320 and AR1024/320, wrapping,44px targets, original mixed-language text, native radios and mobile-cart clearance passed. Those are reviewer results, not author captures. His verdict requests six corrections, documented verbatim in docs/reviews/product-reviews.md.

GPT fixed R2-1–R2-6 in92b1528, adding regression tests for screening, cross-account request assertions, feedback placement, real-only recovery, deferred focus and localized validation. No font/palette/breakpoint redesign or new dependency. Updated running-browser verification of the fixes is pending: the current CUA inventory again has no browser providers. Source hook harnesses do not prove browser scrolling/focus or RTL pixels. No repeat detector/polish loop; the earlier cycle's detector result is not presented as a new scan. Disposition remains recapture until Claude rechecks the changed behavior. Physical touch, screen-reader speech, text zoom, contrast and real Redis remain unverified.
