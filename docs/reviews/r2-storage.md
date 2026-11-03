# Core 3 R2 storage review

Reviewed 2026-10-11. Scope: commits `e41dbf7` and `d0773f9` only. `e41dbf7` adds the file provider configuration; `d0773f9` updates the workboard and records a separate storefront image-host follow-up.

## Findings

### [P1] Keep customer order exports out of the public R2 bucket — `apps/backend/src/lib/file-config.ts:35`

This provider handles all Medusa File Module writes, not only public product images. In the installed Medusa 2.21, the native `POST /admin/orders/export` flow writes a CSV through `Modules.FILE` containing customer names, email addresses, and shipping addresses, then sends the direct file URL in an admin notification. The S3 provider returns a bucket URL rather than an authenticated or expiring download URL. With a public bucket, anyone who obtains that URL can read the export, and R2 keeps it available across redeploys. The nearby comment only considers product exports. Keep order exports in private, expiring storage or otherwise prevent them from using this public provider before enabling it in production.

## Checklist

- The change uses Medusa's native S3 File Module provider and supports Cloudflare R2's endpoint, `file_url`, and `auto` region configuration ([Medusa S3 provider documentation](https://docs.medusajs.com/resources/architectural-modules/file/s3)).
- The configuration requires all S3 settings together, defaults to local storage in development/tests, and fails fast in production when configuration is incomplete.
- No credential exposure issue was found. The public bucket's use for customer order exports is the finding above; Cloudflare documents that public buckets make objects accessible to anyone on the Internet ([R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)).
- Focused `file-config` unit tests passed (4/4). Live R2 upload/export/import/delete checks remain unavailable pending bucket, CORS, and credentials.
- The storefront `next/image` host follow-up recorded by `d0773f9` is separate from this backend storage change.

## Author response (Claude)

**[P1] Order exports in the public bucket: fixed by turning order export off.**
- Confirmed in Medusa 2.21: `exportOrdersWorkflow` writes customer names, emails and shipping addresses through `Modules.FILE`.
- The file module allows exactly one provider, so it cannot send some files to a private store.
- Medusa's local provider is no safer: it also puts "private" files in the public `static` folder.
- Seif decided (2026-10-11) the bucket is for images; customer data stays in PostgreSQL.
- `POST /admin/orders/export` now answers 403 for everyone (`apps/backend/src/api/middlewares.ts`), with or without R2.
- Product and stock exports, and product imports, hold only catalog data and keep working.
- Regression: `admin-access.spec.ts` "turns order export off for everyone". It passes, and it fails with 202 when the block is removed.
- `npm run check` passes (194 backend, 105 storefront tests).

## Round 2

Reviewed 2026-10-11. Scope: commits `8ad7860` and `7fde6b2` only. `8ad7860` disables the native order-export endpoint; `7fde6b2` only records the fix on the workboard.

The Round 1 P1 is resolved. The new `/admin/orders/export` middleware throws `403` for all requests that reach the route, including both admins and managers, before Medusa can create the export file. The integration regression checks both roles and verifies that catalog product export remains available, so it would fail if the order-export block were removed. The change does not alter the R2 provider configuration or the other supported file workflows. I found no new actionable issue in these commits.

The focused HTTP integration test could not run in this environment: Jest first hit a Windows cache permission error; with a workspace-local cache, the test runner started but could not connect to PostgreSQL. The test result is therefore unverified here; the behavior was checked against the diff and installed Medusa route/workflow.

### Author note (Claude)
The regression ran against PostgreSQL in the author environment. It passes on 8ad7860, and it fails (202 instead of 403) when the order-export block is removed.

## Round 3 scope (Claude, 2026-10-18): merge-ready version

Seif asked for R2 to be merged so that only credentials are missing. Branch `claude/r2-storage` from `full-stack` 7351bc5, commit f48696c:
- **Backend:** `src/lib/file-config.ts` and its unit test, taken unchanged from `claude/work`. That is the approved e41dbf7 plus the round-1 comment from 8ad7860. `fileModules()` is wired in `medusa-config.ts` after `redisModules()`, and the `S3_*` settings are added to `apps/backend/.env.template`. The order-export block from 8ad7860 is already in full-stack (09ab9cb).
- **Storefront (new in this round):**
  - `next.config.ts` turns the existing backend-address parsing into `imageHost(url)` and uses it for `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and for the new `NEXT_PUBLIC_MEDIA_URL`, the bucket's public address. `next/image` then accepts R2 product images.
  - An empty or invalid value adds nothing.
  - Added to `apps/storefront/.env.template`.
- **Behavior:**
  - Unchanged locally until `S3_*` is set.
  - Production refuses to start without the bucket (as approved in rounds 1-2).
  - Tests always use the disk.
- **Checks:**
  - `npm run check` passes: 211 backend tests (4 for `file-config`), 225 storefront tests, typecheck, lint 0 errors.
  - The image setting was evaluated with a bucket address, empty and invalid: it adds `pub-abc123.r2.dev` only in the first case.
- **Not verified:** a live upload to a real bucket, which waits for Seif's bucket and keys. The checklist is in the workboard's R2 row.

Review only f48696c.

## Round 3

Reviewer: GPT. Date: 2026-10-18. Scope: `f48696c` only, following the Round 3 scope above.

No actionable findings. The backend provider is unchanged from the previously approved version (verified against `8ad7860`), is wired after `redisModules()`, and retains development/test disk behavior and the approved production fail-fast behavior. The existing `/admin/orders/export` refusal remains present in this branch. Credentials stay in backend-only settings; the storefront receives only the public media address.

The new `imageHost` use adds the configured public bucket host to `next/image` alongside the backend host. With the media setting empty or malformed, its remote-pattern configuration matches the parent commit. The templates document that `NEXT_PUBLIC_MEDIA_URL` must use the same public address as backend `S3_FILE_URL`.

Validation:

- Ran `npm run test:unit -- --runTestsByPath src/lib/__tests__/file-config.unit.spec.ts` in the existing R2 checkout: **4/4 tests passed**. Reviewed source files match `f48696c`.
- Evaluated the exact reviewed Next.js config and exercised the installed Next.js remote-image matcher: R2 and custom-domain media URLs match, backend images still match, unrelated hosts do not match, an explicit non-default port is respected, and unset/empty/malformed media settings preserve the parent's image patterns.
- No live bucket upload/delete or image-optimizer request was performed; those still need Seif's actual bucket and keys. Full-workspace checks were not rerun for this review.

No open code findings. Live R2 verification remains the documented prerequisite before treating storage as operational.
