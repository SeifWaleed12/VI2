import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { UPLOADED_MEDIA_MODULE } from "../modules/uploaded-media"
import type UploadedMediaService from "../modules/uploaded-media/service"

// An uploaded image no product uses is deleted after 7 days, long enough for
// any half-finished product edit to be saved (Seif, 2026-11-04).
export const KEEP_UNUSED_DAYS = 7
const BATCH = 200

// Deletes product images this server uploaded that no product or variant uses:
// removed from a product, never saved, or left by a deleted product. Images
// uploaded before tracking began are not touched.
export async function removeUnusedProductImages(container: MedusaContainer, now = new Date()) {
  const media = container.resolve<UploadedMediaService>(UPLOADED_MEDIA_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const files = container.resolve(Modules.FILE)
  const cutoff = new Date(now.getTime() - KEEP_UNUSED_DAYS * 24 * 60 * 60 * 1000)
  let removed = 0
  let skip = 0
  for (;;) {
    const batch = await media.listUploadedMedias({ created_at: { $lt: cutoff } }, { take: BATCH, skip, order: { id: "ASC" } })
    if (!batch.length) break
    const urls = batch.map((upload) => upload.url)
    const [{ data: images }, { data: products }] = await Promise.all([
      query.graph({ entity: "product_image", fields: ["url"], filters: { url: urls } }),
      query.graph({ entity: "product", fields: ["thumbnail"], filters: { thumbnail: urls } }),
    ])
    const used = new Set<string>([...images.map((image) => image.url), ...products.map((product) => product.thumbnail ?? "")])
    const unused = batch.filter((upload) => !used.has(upload.url)).map((upload) => upload.id)
    if (unused.length) {
      await files.deleteFiles(unused)
      await media.deleteUploadedMedias(unused)
    }
    removed += unused.length
    // Images still in use stay tracked, so they are checked again once removed.
    skip += batch.length - unused.length
    if (batch.length < BATCH) break
  }
  return removed
}

export default async function removeUnusedProductImagesJob(container: MedusaContainer) {
  let entered = false
  const removed = await container.resolve(Modules.LOCKING).execute("job:remove-unused-product-images", () => {
    entered = true
    return removeUnusedProductImages(container)
  }, { timeout: 1, expire: 300 }).catch((error: unknown) => {
    if (!entered && error instanceof MedusaError && error.type === MedusaError.Types.CONFLICT && error.message === "Timed-out acquiring lock.") return
    throw error
  })
  if (removed) container.resolve(ContainerRegistrationKeys.LOGGER).info(`Removed ${removed} unused product images`)
}

export const config = {
  name: "remove-unused-product-images",
  schedule: "45 3 * * *", // every night at 03:45
}
