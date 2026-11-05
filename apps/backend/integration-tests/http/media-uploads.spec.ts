import { existsSync } from "node:fs"
import { join } from "node:path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { removeUnusedProductImages } from "../../src/jobs/remove-unused-product-images"
import { UPLOADED_MEDIA_MODULE } from "../../src/modules/uploaded-media"
import type UploadedMediaService from "../../src/modules/uploaded-media/service"

jest.setTimeout(240 * 1000)

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
const PIXEL = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6K2AAAAAASUVORK5CYII="
// The test storage is Medusa's local provider: public files live in static/<file id>.
const stored = (fileId: string) => existsSync(join(process.cwd(), "static", fileId))

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("unused product image cleanup", () => {
      it("deletes tracked images no product uses after 7 days, and keeps images, product thumbnails and variant thumbnails in use", async () => {
        const container = getContainer()
        const media = container.resolve<UploadedMediaService>(UPLOADED_MEDIA_MODULE)
        const upload = async (name: string) => {
          const file = await container.resolve(Modules.FILE).createFiles({ filename: `products/${name}.png`, mimeType: "image/png", content: PIXEL, access: "public" })
          await media.createUploadedMedias({ id: file.id, url: file.url })
          return file
        }
        const [unused, image, thumbnail, variantThumbnail] = await Promise.all([upload("unused"), upload("image"), upload("thumbnail"), upload("variant-thumbnail")])
        const products = container.resolve(Modules.PRODUCT)
        const [product] = await products.createProducts([{
          title: "Whey", thumbnail: thumbnail.url, images: [{ url: image.url }],
          options: [{ title: "Size", values: ["1kg"] }],
          variants: [{ title: "1kg", options: { Size: "1kg" } }],
        }])
        // A variant thumbnail has no product image row of its own.
        const [variant] = await products.listProductVariants({ product_id: product.id })
        await products.updateProductVariants(variant.id, { thumbnail: variantThumbnail.url })

        expect(await removeUnusedProductImages(container, days(6))).toBe(0)
        expect(stored(unused.id)).toBe(true)

        expect(await removeUnusedProductImages(container, days(8))).toBe(1)
        expect([stored(unused.id), stored(image.id), stored(thumbnail.id), stored(variantThumbnail.id)]).toEqual([false, true, true, true])
        expect((await media.listUploadedMedias({})).map((upload) => upload.id).sort()).toEqual([image.id, thumbnail.id, variantThumbnail.id].sort())
      })
    })
  },
})
