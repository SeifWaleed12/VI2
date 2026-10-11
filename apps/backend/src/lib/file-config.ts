import { MedusaError } from "@medusajs/framework/utils"

const REQUIRED = ["S3_FILE_URL", "S3_BUCKET", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const

// Uploads (product images, import and export files) go to an S3-compatible
// bucket, Cloudflare R2 by owner decision, once all S3_* variables are set.
// Without them Medusa keeps its local disk provider, which a redeploy wipes, so
// production refuses to start without a bucket. Tests always use the disk.
export function fileModules(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test") return []
  const values = REQUIRED.map((name) => env[name]?.trim())
  const setCount = values.filter(Boolean).length
  if (setCount === 0 && env.NODE_ENV !== "production") return []
  if (setCount !== REQUIRED.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Set all of ${REQUIRED.join(", ")}${env.NODE_ENV === "production" ? "" : ", or none"}.`)
  }
  const [fileUrl, bucket, endpoint, accessKeyId, secretAccessKey] = values as string[]
  return [{
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [{
        resolve: "@medusajs/medusa/file-s3",
        id: "s3",
        options: {
          file_url: fileUrl.replace(/\/+$/, ""),
          bucket,
          endpoint,
          region: env.S3_REGION?.trim() || "auto",
          access_key_id: accessKeyId,
          secret_access_key: secretAccessKey,
          // R2 has no per-file permissions (x-amz-acl), and new AWS buckets
          // disable them; the bucket itself is public instead.
          // Product and stock import/export CSVs share the bucket; they hold
          // only catalog data. Order export, which holds customer details, is
          // turned off in api/middlewares.ts.
          acl: false,
        },
      }],
    },
  }]
}
