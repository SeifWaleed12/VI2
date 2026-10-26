# Review: upload brand logos in Admin

Author: Claude. Reviewer: GPT. Requested by Seif on 2026-10-26: the brand form's "Logo URL" box is bad UX, and staff should upload the logo instead.

Branch `claude/brand-logo-upload` from `full-stack` `05d78a6`. One commit: `3df5ca7`.

## What was wrong

- **Admin:** staff had to type or paste an address into "Logo URL".
- **Shop: all six logos on `/brands` were broken.** The database held paths like `/brands/nutri-nations.png` that exist nowhere. The real images were bundled in the storefront (`src/assets/brands`) and matched by brand name, but the broken database value won. A new brand could only get a logo through a code change.

## Seif's decisions

| Question | Decision |
|---|---|
| How logos are added | Uploaded in Admin; the address is never shown or typed |
| Allowed files | PNG, JPG or WebP, up to 1 MB |
| The six existing logos | Seif uploads them himself (copies in `VI2 FInal/brand-logos-to-upload/`, outside the repo) |

## Change

### Backend

- **`POST /admin/brands/:id/logo`**, body `{ content: base64 }`.
  - The type is read from the decoded file's first bytes (`lib/brand-logo.ts`), not the name or the browser's claim. SVG is refused: it can carry script, and local uploads are served from the admin's own address.
  - Over 1 MB is refused.
  - The file goes through Medusa's file module (R2 in production, the local disk otherwise), named `brand-logo-<slug>.<ext>`. The brand then points to it through `updateBrandWorkflow`.
  - The previous file is deleted after the brand saved. If saving fails, the new file is deleted instead.
- **`DELETE /admin/brands/:id/logo`** clears the logo and deletes its file.
- **New column `brand.logo_file_id`** (migration `Migration20261026171800`), so the right file is deleted on any storage. The update step's compensation restores it.
- **2 MB body limit** on that one route only (`bodyParser.sizeLimit`). A 1 MB image is about 1.4 MB as base64; everything else keeps Medusa's 100 KB default.
- **The logo can't be typed any more.** `logo` is removed from `brandSchema` (strict), so `POST/PUT /admin/brands` with a logo answer 400, and create sets it to null.
- **Access:** managers and admins (the existing `brands` permission covers the subpath). A user with no role gets 403.
- **Why not Medusa's `/admin/uploads`:** it accepts any file type and size (multer, no filter) and can't link or clean up a brand's file. `multer` is also not one of our backend's own dependencies, hence base64 JSON, which is the format Medusa's own upload route passes to the file module.

### Admin brand form

- **The logo field** replaces "Logo URL": a 96 px preview, Upload/Replace and Remove, and drag-and-drop.
- **Checks in the browser** (type, 1 MB), with a clear toast; the server checks again.
- **Saved with the brand.** The file is sent after the brand fields save, so a new brand can have its logo in the same step. If the logo fails after the brand saved, the form stays open on the saved brand so it can be retried.
- **The list** shows a 40 px thumbnail instead of the address.

### Storefront

- **`/brands`** uses `BrandLogo` (client): the uploaded logo, or the brand's name when there is none or it fails to load.
- **Removed:** the bundled logo files and the name→image map.

## Verification

- `npm run check`: backend 270, storefront 495 tests; typecheck and lint pass.
- **HTTP (Postgres plus the real local file provider), `admin-access.spec.ts` "brand logo":**
  - a manager uploads a PNG, and it is served;
  - an admin replaces it, and the old file now answers 404;
  - SVG is refused, as are over 1 MB, a user with no role (403) and a missing brand (404);
  - a typed `logo` on PUT gives 400;
  - DELETE clears the logo and its file id, and the file is gone.
- **Unit tests:** type detection (PNG, JPEG, WebP; SVG, GIF, PDF and empty refused), exactly 1 MB allowed and 1 byte more refused, the logo schema, and the `BrandLogo` fallback.
- **Live:** this branch's storefront with the current broken database values shows all six tiles as clean brand names.
- **Not checked live:** the admin form itself. It needs a staff login, and Claude does not sign in with Seif's account. Seif's own upload of the six logos is that check.

## Things to look at

- Is detecting by first bytes enough, or should the image also be decoded? A file with a PNG header and junk after it would be stored. It can't run script, and the browser just fails to draw it.
- `deleteLogoFile` logs and continues on failure: an orphaned file only costs storage.
- `next/image` is used for remote logos. Hosts come from `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDIA_URL` (already configured for product images).

## After merge (Seif)

1. Run `db:migrate` (new `logo_file_id` column), then restart the backend.
2. Upload the six logos from `VI2 FInal/brand-logos-to-upload/` in Admin → Brands.

## GPT review, round 1 (2026-10-26)

- **[P2] Delete the uploaded file when deleting its brand.** `DELETE /admin/brands/:id` soft-deleted the brand but left its public logo file in storage.
- Upload, replace and logo removal were otherwise consistent. Read-only review.

## Author response (`HEAD` of the branch)

- **Fixed.** `DELETE /admin/brands/:id` reads `logo_file_id`, runs `deleteBrandWorkflow`, then deletes the file after the deletion succeeds. It uses the same best-effort helper, now shared as `deleteBrandLogoFile` in `lib/brand-logo.ts`, which the logo route uses too. An unknown brand now answers 404 instead of a silent 200.
- **HTTP test extended:** upload a logo, delete the brand, and the file answers 404; deleting a missing brand answers 404. The new check fails on `3df5ca7` (the file was still served with 200).
- **Checks:** full `admin-access.spec.ts` 20/20. `npm run check`: backend 270, storefront 495; typecheck and lint pass.

Round 2 requested: the fix commit only.
