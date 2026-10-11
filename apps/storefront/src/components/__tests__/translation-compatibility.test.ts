import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { LanguageProvider, LegacyTranslations, useLanguage } from "@/context/LanguageContext"
jest.mock("next/navigation", () => ({ usePathname: () => "/ar/shop" }))
function CompatibilityScreen() { return LegacyTranslations({children:createElement("main",{},"SHOP")}) }
function ArabicScreen() { return LanguageProvider({locale:"ar",children:createElement(Screen)}) }
function Screen() {
  const { msg } = useLanguage()
  return createElement("div", {}, createElement("nav", {"data-no-translate":true},msg("nav.categories")), createElement(CompatibilityScreen))
}
it("renders keyed Arabic navigation on the server while deferring compatibility text until the screen hydrates", () => {
  const html=renderToStaticMarkup(createElement(ArabicScreen))
  expect(html).toContain("الأقسام")
  expect(html).toContain("<main>SHOP</main>")
  expect(html).toContain("data-legacy-translation")
  expect(html).not.toMatch(/opacity|visibility:hidden/)
})
