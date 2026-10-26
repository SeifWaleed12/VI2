import { logoImage, MAX_LOGO_BYTES } from "../brand-logo"
import { brandLogoSchema, brandSchema } from "../../api/validators"

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)])
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(32)])

it("recognises PNG, JPEG and WebP by their first bytes", () => {
  expect(logoImage(png)).toEqual({ mimeType: "image/png", extension: "png" })
  expect(logoImage(jpeg)).toEqual({ mimeType: "image/jpeg", extension: "jpg" })
  expect(logoImage(webp)).toEqual({ mimeType: "image/webp", extension: "webp" })
})

it("refuses SVG, other files and empty content, whatever their name says", () => {
  expect(logoImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBe("not_an_image")
  expect(logoImage(Buffer.from("GIF89a"))).toBe("not_an_image")
  expect(logoImage(Buffer.from("%PDF-1.7"))).toBe("not_an_image")
  expect(logoImage(Buffer.alloc(0))).toBe("not_an_image")
})

it("allows exactly 1 MB and refuses one byte more", () => {
  const atLimit = Buffer.concat([png, Buffer.alloc(MAX_LOGO_BYTES - png.length)])
  expect(logoImage(atLimit)).toMatchObject({ extension: "png" })
  expect(logoImage(Buffer.concat([atLimit, Buffer.alloc(1)]))).toBe("too_large")
})

it("takes the logo only as base64 content, never as an address typed into the brand", () => {
  expect(brandLogoSchema.safeParse({ content: png.toString("base64") }).success).toBe(true)
  for (const body of [{}, { content: "" }, { content: "not base64!" }, { content: "aGk=", url: "https://evil.test/x.png" }]) {
    expect(brandLogoSchema.safeParse(body).success).toBe(false)
  }
  expect(brandSchema.safeParse({ name: "Brand", slug: "brand", logo: "https://cdn.test/logo.png" }).success).toBe(false)
})
