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
      it("deletes tracked images no product uses after 7 days, and keeps images and thumbnails in use", async () => {
        const container = getContainer()
        const media = container.resolve<UploadedMediaService>(UPLOADED_MEDIA_MODULE)
        const upload = async (name: string) => {
          const file = await container.resolve(Modules.FILE).createFiles({ filename: `products/${name}.png`, mimeType: "image/png", content: PIXEL, access: "public" })
          await media.createUploadedMedias({ id: file.id, url: file.url })
          return file
        }
        const [unused, image, thumbnail] = await Promise.all([upload("unused"), upload("image"), upload("thumbnail")])
        await container.resolve(Modules.PRODUCT).createProducts({ title: "Whey", thumbnail: thumbnail.url, images: [{ url: image.url }] })

        expect(await removeUnusedProductImages(container, days(6))).toBe(0)
        expect(stored(unused.id)).toBe(true)

        expect(await removeUnusedProductImages(container, days(8))).toBe(1)
        expect([stored(unused.id), stored(image.id), stored(thumbnail.id)]).toEqual([false, true, true])
        expect((await media.listUploadedMedias({})).map((upload) => upload.id).sort()).toEqual([image.id, thumbnail.id].sort())
      })
    })
  },
})
