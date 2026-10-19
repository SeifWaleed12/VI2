import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CatalogImage, { showsPhoto } from "../CatalogImage"

jest.mock("../CatalogImage.module.css", () => ({ __esModule: true, default: { placeholder: "placeholder" } }))

it("shows the product's first letter instead of an image with an empty address", () => {
  for (const src of [undefined, ""]) {
    const html = renderToStaticMarkup(createElement(CatalogImage, { src, alt: "whey protein" }))
    expect(html).not.toContain("<img")
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="whey protein"')
    expect(html).toContain(">w</div>")
  }
})

it("shows the photo when there is one", () => {
  const html = renderToStaticMarkup(createElement(CatalogImage, { src: "https://cdn.test/whey.jpg", alt: "Whey", loading: "lazy" }))
  expect(html).toContain('<img loading="lazy" src="https://cdn.test/whey.jpg" alt="Whey"')
})

it("tries a new photo URL after an earlier one failed to load", () => {
  // CatalogImage remembers the URL that failed (onError), not just "failed".
  expect(showsPhoto("/missing-photo.jpg", undefined)).toBe(true)
  expect(showsPhoto("/missing-photo.jpg", "/missing-photo.jpg")).toBe(false)
  expect(showsPhoto("/photo.svg", "/missing-photo.jpg")).toBe(true)
  expect(showsPhoto("", undefined)).toBe(false)
})
