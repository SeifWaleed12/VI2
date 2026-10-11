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
