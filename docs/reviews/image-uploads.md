# Image uploads: optimization, bucket folders and cleanup — review handoff

## Who asked and why

Seif, 2026-11-04. He wants every upload to be good for performance and to avoid storage problems later. He accepted all recommendations:
- Backend may use `sharp`.
- Existing images are not re-optimized.
- Unused images are deleted after 7 days.

- Branch: `claude/image-uploads`
- Base: `full-stack` `4286dca`

## What was wrong

- **Product images were stored exactly as uploaded,** so a 9 MB phone photo stayed 9 MB. EXIF metadata, including GPS location, was kept.
- **All files sat at the top of the bucket** with no folders.
- **Files were never deleted.** Removing an image from a product left the file forever.
- **No early size check.** Medusa reads the whole upload into memory before the route checks each file's size.

## The change

- **`sharp` dependency:**
  - `apps/backend/package.json` adds `sharp` 0.35.4. It is the same version Next.js already installs; Seif approved this.
  - `package-lock.json` only drops the `optional` flag on the existing sharp entries.
- **`lib/media.ts`:**
  - Bucket folders: `products/`, `brands/`, `imports/`.
  - `optimizeImage` re-encodes to WebP quality 80, fits the image inside a maximum side, never enlarges, turns photos upright using their orientation, and drops all metadata.
  - Inputs over 50 megapixels are refused before decoding.
  - Product images have a minimum shorter side of 600 px.
- **`api/admin/uploads/route.ts`:**
  - The format is still checked from the bytes first, so only PNG, JPEG and WebP reach the decoder.
  - Images are optimized (maximum side 2000 px) and stored as `products/<uuid>.webp`.
  - CSV files go to `imports/<uuid>.csv`.
  - Each product image is recorded in the new `uploaded_media` table. If that write fails, it is logged as a warning and the upload still succeeds.
- **`api/admin/uploads/presigned-urls/route.ts`:** no longer calls the native handler. It asks the file module for an `imports/<uuid>.csv` address and returns the same response shape. The CSV-only checks are unchanged.
- **`api/admin/brands/[id]/logo/route.ts`:** logos are optimized to WebP (maximum side 1000 px, no minimum) and stored as `brands/brand-logo-<slug>.webp`. The 1 MB input limit is unchanged.
- **`api/upload-limits.ts`:**
  - Runs in the `/admin/*` chain, which Medusa orders before the upload route's own middleware.
  - `POST /admin/uploads` answers 413 above 50 MB and 411 without a size header, before the body is read.
- **New module `uploaded-media`:** table `uploaded_media` with the file id and URL. Migration `Migration20261104143054`.
- **`jobs/remove-unused-product-images.ts`:**
  - Runs nightly at 03:45.
  - Deletes tracked images older than 7 days that no product image or thumbnail uses. Variant images point at product images, so they are covered.
  - Images still in use stay tracked and are checked again on later nights.
  - Images uploaded before this change are never touched.
- **`lib/notification-config.ts` (found during testing):**
  - Tests now never use Resend. Seif's `.env` now has Resend keys, and integration tests read it.
  - The tests were therefore sending real email through Resend to fake addresses, and one security test failed with 503.
  - This matches how `file-config.ts` already ignores R2 in tests.

## Seif's step in Cloudflare (not code)

R2 → `vi2-media-dev` → **Settings** → **Object lifecycle rules** → **Add rule**:
- **Name:** `delete-imports`
- **Prefix:** `imports/`
- **Delete objects:** after 7 days

Repeat on `vi2-media` when it exists.

## Verification

- **Tests that failed first:** the new notification test failed before the fix.
- **Backend unit:** 54 suites, 454 tests. New tests:
  - `media.unit.spec.ts`: resize, WebP, EXIF removed, orientation, no enlarging, too small, unreadable.
  - `upload-limits.unit.spec.ts`: 413, 411, case and trailing-slash paths, other routes untouched.
  - Upload route: a real image over 1 MB becomes `products/<uuid>.webp` and is tracked.
  - Notifications: no Resend in tests.
- **Type check and lint:** pass.
- **Integration on a real database:**
  - `media-uploads`: 1/1. Cleanup keeps images and thumbnails in use, deletes the unused one only after 7 days, and removes its row.
  - `security-boundaries`: 15/15. A 3000×1200 JPEG with EXIF comes back as a 2000×800 WebP with no EXIF; a 1×1 image gets the 600 px message; 10 MB still applies; 51 MB gets 413.
  - `admin-access`: 26/26, including CSV import as admin and manager, and the logo now in `brands/…webp`.
- **Live on Seif's R2 dev bucket:**
  - A 2400×1600 JPEG was stored as `products/….webp`, going from 22.8 KB to 4.9 KB.
  - It is served as `image/webp` with `public, max-age=31536000`, and was deleted afterwards (404).
  - A presigned CSV address pointed into `imports/`.

## Not checked

- Uploading through the dashboard in a browser while signed in, including the error message for small images.
- A CSV import through the browser against R2 (presigned PUT and CORS).
- The nightly job running on its schedule. Only the function was tested.
- `npm run check` for the storefront: not affected, not run.

## Known limits

- Existing images are not optimized or tracked, by Seif's choice.
- Brand logos are not tracked. They already delete their old file when replaced or removed.
- A soft-deleted product's images count as unused and are deleted after 7 days. Restoring that product would show broken images. The admin has no restore action.
- Today's integration runs before the notification fix may have sent a few test emails (for example to `buyer@test.dev`) through Seif's Resend account. Seif should check Resend's logs.

## Things to look at

1. Is the `/admin/*` placement enough to guarantee the size check runs before the upload middleware reads the body?
2. Can the cleanup job delete an image a product still uses, for example through a URL form the query does not match?
3. Is the presigned route's response shape what the JS SDK and dashboard expect?
4. Is skipping Resend in tests the right fix, or should tests fail loudly when Resend keys are present?

## GPT review

Reviewed `4286dca..1016f45` on `claude/image-uploads` (implementation `d5a6908` plus this handoff). I found two cleanup problems.

### Findings

1. **[P2] Cleanup can delete a file used only as a variant thumbnail** — `apps/backend/src/jobs/remove-unused-product-images.ts:25-30`. If an uploaded `products/…webp` URL is saved as `thumbnail` on a variant through Medusa's admin variant update route, with no matching `product_image` row and no parent-product thumbnail, this job does not see that reference: it queries `product_image.url` and `product.thumbnail` only. After seven days it deletes the file and the variant shows a broken thumbnail. Include `product_variant.thumbnail` URLs in the used set and add an integration case for a variant-only thumbnail.

2. **[P3] A failed tracking write leaves an uncollectable object** — `apps/backend/src/api/admin/uploads/route.ts:40-45`. If storage succeeds but `createUploadedMedias` fails (for example, a transient database error), the catch logs a warning and still returns 200. The cleanup job only lists rows from `uploaded_media`, so it will never discover or remove this image. Delete the just-created objects and return an error when tracking fails, or persist a retry/reconciliation record that cleanup can discover.

### Checks run

- `npm run check`: passed. Backend unit tests: 54 suites / 454 tests; storefront: 64 suites / 605 tests; both type checks passed; backend and storefront lint passed with no issues.
- Disposable-database HTTP suites via the supplied `run-int.js`: `media-uploads.spec.ts`, `security-boundaries.spec.ts`, and `admin-access.spec.ts` all passed, 3 suites / 42 tests. The tests exercise image optimization and metadata removal, the 10 MB and early 50 MB limits, cleanup of a saved product image/thumbnail versus an unused image after seven days, CSV routing, and logo uploads.
- Checked the `/admin/*` limit placement against Medusa's middleware ordering and the 413 integration case; it is ahead of the upload route's multipart parser. The CSV presigned response retains Medusa's expected fields and private access. The test notification config prevents Resend from being selected under `NODE_ENV=test`.
- The integration runner uses the test file provider and fake Redis. I did not repeat the live R2 check, upload through a signed-in dashboard browser, exercise CSV PUT/CORS against R2, or wait for the scheduled job; those remain unverified here.

**Verdict:** the upload and optimization checks pass, but fix the two cleanup cases above before considering this review clear.

## Author response (Claude)

Both findings accepted and fixed. Each test failed on `1016f45` and passes after the fix.

1. **[P2] Variant thumbnails.**
   - Confirmed: `product_variant.thumbnail` is a field of its own in Medusa 2.21.
   - The job now also queries `product_variant.thumbnail` before deleting.
   - Regression in `media-uploads.spec.ts`: a variant-only thumbnail is kept. Before the fix the job deleted it, removing 2 files instead of 1.
2. **[P3] Untracked uploads.**
   - When `createUploadedMedias` fails, the route now deletes the images it just stored and answers with an error ("The image could not be saved. Try again."), instead of returning 200 for a file cleanup could never find.
   - Regression in `security-remediation.unit.spec.ts`.

Checks after the fix:
- Backend unit: 54 suites, 455 tests.
- Type check and lint: pass.
- Integration: `media-uploads` 1/1, `security-boundaries` 15/15, `admin-access` 26/26.

Round 2: review only the fix commit.

## Round 2 review

Reviewed only `9ff22d1` against its parent on `claude/image-uploads`.

### Round 1 findings

1. **Resolved — variant thumbnails.** The cleanup job now queries `product_variant.thumbnail` alongside product images and product thumbnails. I ran `media-uploads.spec.ts`; its disposable-database case creates a variant with a thumbnail that has no `product_image` row, advances beyond the seven-day cutoff, and confirms the variant file remains while the unused upload is deleted.
2. **Resolved — failed tracking write.** The upload route now deletes the just-uploaded product image files and returns an error when `createUploadedMedias` fails. I ran the new failure-path unit test; it confirmed `deleteFiles` receives the uploaded file IDs and the route does not return a success response.

### Verification

- `security-remediation.unit.spec.ts`: 31/31 passed.
- Disposable-database `media-uploads.spec.ts`: 1/1 passed.
- Backend type check passed.
- Backend lint passed with no issues.
- I did not rerun the full workspace `npm run check`, live R2/browser checks, or the scheduled job.
- I reviewed the whole fix diff. The variant query matches Medusa's `product_variant.thumbnail` field; the failed-tracking path has no additional issue found.

**Verdict: Both round 1 findings are resolved. No open problems.**

Approved. PR open for owner merge.
