import sharp from "sharp"
import { BRAND_LOGO_MAX_SIDE, MIN_PRODUCT_IMAGE_SIDE, optimizeImage, PRODUCT_IMAGE_MAX_SIDE } from "../media"

const photo = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#4a7a3b" } })

it("re-encodes a large photo as WebP within the size limit, without its metadata", async () => {
  const input = await photo(3000, 1200).withMetadata({ exif: { IFD0: { Copyright: "private camera data" } } }).jpeg().toBuffer()
  const result = await optimizeImage(input, { maxSide: PRODUCT_IMAGE_MAX_SIDE, minShortSide: MIN_PRODUCT_IMAGE_SIDE })
  if (typeof result === "string") throw new Error(result)
  const output = await sharp(result.content).metadata()
  expect([result.mimeType, result.extension, output.format, output.width, output.height]).toEqual(["image/webp", "webp", "webp", 2000, 800])
  expect(output.exif).toBeUndefined()
})

it("never enlarges a smaller image", async () => {
  const result = await optimizeImage(await photo(800, 700).png().toBuffer(), { maxSide: BRAND_LOGO_MAX_SIDE })
  if (typeof result === "string") throw new Error(result)
  expect((await sharp(result.content).metadata()).width).toBe(800)
})

it("turns a photo upright from its orientation tag", async () => {
  const sideways = await photo(900, 600).withMetadata({ orientation: 6 }).jpeg().toBuffer()
  const result = await optimizeImage(sideways, { maxSide: PRODUCT_IMAGE_MAX_SIDE })
  if (typeof result === "string") throw new Error(result)
  const output = await sharp(result.content).metadata()
  expect([output.width, output.height]).toEqual([600, 900])
})

it("refuses product images shorter than the minimum, and unreadable data", async () => {
  expect(await optimizeImage(await photo(1200, 599).png().toBuffer(), { maxSide: PRODUCT_IMAGE_MAX_SIDE, minShortSide: MIN_PRODUCT_IMAGE_SIDE })).toBe("too_small")
  expect(await optimizeImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]), { maxSide: PRODUCT_IMAGE_MAX_SIDE })).toBe("unreadable")
})
