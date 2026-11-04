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
