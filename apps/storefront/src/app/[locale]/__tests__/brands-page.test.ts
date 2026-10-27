import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import BrandsPage from "../brands/page"
import { getBrands, getProducts } from "@/lib/medusa"

jest.mock("@/lib/medusa", () => ({ getBrands: jest.fn(), getProducts: jest.fn() }))
jest.mock("../brands/Brands.module.css", () => ({}))
jest.mock("@/context/LanguageContext", () => ({ LegacyTranslations: ({ children }: { children: unknown }) => children, useLanguage: () => ({ language: "en" }) }))
jest.mock("next/image", () => ({ __esModule: true, default: ({ alt }: { alt: string }) => createElement("img", { alt }) }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children }: { href: string, children: unknown }) => createElement("a", { href }, children as never) }))
jest.mock("@/assets/brands/nutri-nations.png", () => ({}))
jest.mock("@/assets/brands/doctors-best.png", () => ({}))
jest.mock("@/assets/brands/now-foods.png", () => ({}))
jest.mock("@/assets/brands/california-gold.png", () => ({}))
jest.mock("@/assets/brands/optimum-nutrition.png", () => ({}))
jest.mock("@/assets/brands/big-ramy-labs.png", () => ({}))

it("keeps equal display names distinct and does not infer counts from a product page", async () => {
  jest.mocked(getBrands).mockResolvedValue([{ id: "brand_a", name: "Same", slug: "same-a" }, { id: "brand_b", name: "Same", slug: "same-b" }] as never)
  const html = renderToStaticMarkup(await BrandsPage())
  expect(html).toContain("brand_id=brand_a")
  expect(html).toContain("brand_id=brand_b")
  expect(html).not.toContain("0 products")
  expect(getProducts).not.toHaveBeenCalled()
})
