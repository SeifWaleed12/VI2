import sharp from "sharp"

// Each kind of upload has its own folder in the bucket, so it can be counted,
// audited and cleaned up on its own. An R2 lifecycle rule deletes `imports/`
// after 7 days (set in Cloudflare, see docs/reviews/image-uploads.md).
export const MEDIA_FOLDER = { products: "products", brands: "brands", imports: "imports" } as const

export const PRODUCT_IMAGE_MAX_SIDE = 2000
export const BRAND_LOGO_MAX_SIDE = 1000
// Smaller product photos look blurry on the product page.
export const MIN_PRODUCT_IMAGE_SIDE = 600
const WEBP_QUALITY = 80
// Refused before decoding, so a small file cannot expand into a huge image in memory.
const MAX_INPUT_PIXELS = 50_000_000

export type OptimizedImage = { content: Buffer, extension: "webp", mimeType: "image/webp" }

// Re-encodes an image as WebP no larger than maxSide, turned upright, with its
// metadata removed (EXIF can hold the GPS location a photo was taken at).
export async function optimizeImage(bytes: Buffer, { maxSide, minShortSide = 0 }: { maxSide: number, minShortSide?: number }): Promise<OptimizedImage | "too_small" | "unreadable"> {
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).rotate()
    const { width, height } = await image.metadata()
    if (!width || !height) return "unreadable"
    if (Math.min(width, height) < minShortSide) return "too_small"
    const content = await image
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
    return { content, extension: "webp", mimeType: "image/webp" }
  } catch {
    return "unreadable"
  }
}
