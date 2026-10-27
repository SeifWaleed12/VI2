import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import HomeBestSellers from "../HomeBestSellers"
import TrendingNow from "../TrendingNow"
import HomeHeroSlider from "../HomeHeroSlider"
import HomeDiscovery from "../HomeDiscovery"
jest.mock("../HomeDiscovery.module.css", () => ({}))
import { message } from "@/lib/i18n"
import type { Product } from "@/types/product"
let mockHeroLocale: "en" | "ar" = "en"
beforeEach(() => { mockHeroLocale = "en" })

jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href, ...props }: { children: unknown; href: string }) => createElement("a", { href, ...props }, children as never) }))
jest.mock("next/image", () => ({ __esModule: true, default: (props: { src: string; alt: string }) => createElement("img", { src: props.src, alt: props.alt }) }))
jest.mock("@/context/LanguageContext", () => ({ useLanguage: () => ({ language: mockHeroLocale, isArabic: mockHeroLocale === "ar", msg: (key: Parameters<typeof message>[1]) => message(mockHeroLocale, key), t: <T,>(value: T) => value }) }))
jest.mock("../BestSellerCard", () => ({ __esModule: true, default: ({ product, rank }: { product: Product; rank?: number }) => createElement("div", { "data-rank": rank }, product.name) }))
jest.mock("../HomeBestSellers.module.css", () => ({}))
jest.mock("../TrendingNow.module.css", () => ({}))
jest.mock("../CatalogImage.module.css", () => ({}))
jest.mock("../HomeHeroSlider.module.css", () => ({}))
const product = { id: "p1", slug: "protein", name: "Protein", shortName: "Protein", category: "Protein", description: "", image: "/protein.png" } as Product

it("links the collection action to the shop without claiming sales rank", () => {
  const html = renderToStaticMarkup(createElement(HomeBestSellers, { initialProducts: [product] }))
  expect(html).toContain('href="/en/shop"')
  expect(html).toContain("SHOP PRODUCTS")
  expect(html).not.toContain("BEST SELLERS")
  expect(html).not.toContain("data-rank")
  expect(html).not.toContain('aria-pressed=')
})

it("renders each discovery product once for keyboard browsing with its visible name", () => {
  const html = renderToStaticMarkup(createElement(() => TrendingNow({ products: [product] })))
  expect(html.match(/<a(?![^>]*tabindex="-1")[^>]*href="\/en\/products\/protein"/g)).toHaveLength(1)
  expect(html).toContain("TRENDING PRODUCTS")
  expect(html).toContain(">Protein</span>")
})

it("keeps four manual slide controls and one active slide", () => {
  const html = renderToStaticMarkup(createElement(HomeHeroSlider))
  expect(html.match(/aria-label="Show slide/g)).toHaveLength(4)
  expect(html.match(/aria-current="true"/g)).toHaveLength(1)
})

jest.mock("react", () => ({ ...jest.requireActual("react"), useState: jest.fn((...args: unknown[]) => jest.requireActual("react").useState(...args)) }))

it("shows supplied Arabic products without an English keyword taxonomy", () => {
  const html = renderToStaticMarkup(createElement(HomeBestSellers, { initialProducts: [{ ...product, name: "فيتامين", category: "", description: "" }] }))
  expect(html).toContain("فيتامين")
  expect(html).not.toContain("No products in this category yet.")
  expect(html).not.toContain("VITAMINS &amp; MINERALS")
})
it.each(["en", "ar"] as const)("renders the whole localized hero statement before hydration in %s", (locale) => {
  mockHeroLocale = locale
  const html = renderToStaticMarkup(createElement(HomeHeroSlider))
  expect(html).toContain(message(locale, "hero.statement"))
  expect(html).toContain("data-no-translate")
  expect(html).toContain("data-preserve-language")
  expect(html).not.toContain("<br")
})

it.each(["en", "ar"] as const)("takes the highlighted health goal to the shop filtered by it in %s", locale => {
  mockHeroLocale = locale;
  const html = renderToStaticMarkup(createElement(HomeDiscovery));
  expect(html).toContain('href="/' + locale + '/shop?goal=muscle-recovery"');
  expect(html).toContain(message(locale, "home.shopGoal").replace("{goal}", message(locale, "goal.muscle-recovery")).replace("&", "&amp;"));
  // "View all" stays unfiltered.
  expect(html).toContain('href="/' + locale + '/shop"');
  expect(html).not.toContain("SHOP NOW");
});
