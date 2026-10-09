import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CategoriesClient from "@/app/categories/CategoriesClient"
import DesktopMegaMenu from "../DesktopMegaMenu"
import Navbar from "../Navbar"
import CategoryStatus from "../category-status"
import { useCategories } from "@/providers/category-provider"
import { useLanguage } from "@/context/LanguageContext"
import { buildCategoryTree } from "@/lib/category-navigation"

jest.mock("@/providers/category-provider", () => ({ useCategories: jest.fn() }))
jest.mock("@/context/LanguageContext", () => ({ useLanguage: jest.fn() }))
jest.mock("@/lib/medusa/services/brands", () => ({ getBrands: jest.fn() }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href, ...props }: { children: unknown; href: string }) => {
  return createElement("a", { href, ...props }, children as never)
} }))
jest.mock("@/app/categories/Categories.module.css", () => ({}))
jest.mock("../DesktopMegaMenu.module.css", () => ({}))
jest.mock("../Navbar.module.css", () => ({}))
jest.mock("@/context/CartContext", () => ({ useCart: () => ({ itemCount: 0, openCart: jest.fn() }) }))
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ customer: null, isAuthenticated: false, signOut: jest.fn() }) }))
jest.mock("../GlobalSearch", () => ({ __esModule: true, default: () => null }))
jest.mock("../MobileBottomNav", () => ({ __esModule: true, default: () => null }))
jest.mock("../AccountDropdown", () => ({ __esModule: true, default: () => null }))

const tree = buildCategoryTree([
  { id: "pcat_root", name: "Live category", handle: "live", description: "Live description" },
  { id: "pcat_child", name: "Live child", handle: "child", parent_category_id: "pcat_root" },
  { id: "pcat_nested", name: "Live grandchild", handle: "grandchild", parent_category_id: "pcat_child" },
])

beforeEach(() => {
  jest.mocked(useCategories).mockReturnValue({ categories: tree, status: "ready", retry: jest.fn() })
  jest.mocked(useLanguage).mockReturnValue({ isArabic: false, t: <T,>(value: T) => value } as never)
})

it("renders only live category names and ID links in the directory", () => {
  const html = renderToStaticMarkup(createElement(CategoriesClient))
  expect(html).toContain("Live description")
  expect(html).toContain('href="/shop?category_id=pcat_root"')
  expect(html).toContain('href="/shop?category_id=pcat_nested"')
  expect(html).not.toContain("VITAMINS &amp; MINERALS")
  expect(html).not.toContain("/shop?q=")
})

it("renders the same hierarchy in the selected mega menu", () => {
  const html = renderToStaticMarkup(createElement(DesktopMegaMenu, { active: "pcat_root", onClose: jest.fn() }))
  expect(html).toContain("Live category")
  expect(html).toContain("Live grandchild")
  expect(html).toContain('href="/shop?category_id=pcat_child"')
  expect(html).not.toContain("/shop?q=")
})

it.each([
  ["loading", "Loading categories…"],
  ["error", "Categories are temporarily unavailable."],
  ["ready", "No categories are available yet."],
] as const)("shows a distinct %s state without fallback categories", (status, message) => {
  jest.mocked(useCategories).mockReturnValue({ categories: [], status, retry: jest.fn() })
  const html = renderToStaticMarkup(createElement(CategoriesClient))
  expect(html).toContain(message)
  expect(html).not.toContain("/shop?category_id=")
  if (status === "error") expect(html).toContain("Try again")
})

it("renders Arabic loading feedback", () => {
  jest.mocked(useCategories).mockReturnValue({ categories: [], status: "loading", retry: jest.fn() })
  jest.mocked(useLanguage).mockReturnValue({ isArabic: true, t: <T,>(value: T) => value } as never)
  expect(renderToStaticMarkup(createElement(CategoriesClient))).toContain("جارٍ تحميل الفئات")
})

it("uses live roots in desktop and mobile navigation without fixed catalog headings", () => {
  const html = renderToStaticMarkup(createElement(Navbar))
  expect(html.match(/Live category/g)).toHaveLength(2)
  expect(html.match(/href="\/categories"/g)).toHaveLength(2)
  expect(html).not.toContain("Vitamins &amp; Minerals")
})

it("connects the error button to the shared retry action", () => {
  const retry = jest.fn()
  jest.mocked(useCategories).mockReturnValue({ categories: [], status: "error", retry })
  const state = CategoryStatus()
  if (!state) throw new Error("Missing error state")
  state.props.children[1].props.onClick()
  expect(retry).toHaveBeenCalledTimes(1)
})
