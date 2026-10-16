import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DesktopMegaMenu from "../DesktopMegaMenu";
import ShopPage from "@/app/[locale]/shop/page";
import { getProducts } from "@/lib/medusa";
import { loadCategoryDirectory } from "@/lib/medusa/category-directory";
import { message } from "@/lib/i18n";
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: never; href: string }) =>
    createElement("a", { href }, children),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "ar",
    msg: (key: Parameters<typeof message>[1]) => message("ar", key),
  }),
}));
jest.mock("../DesktopMegaMenu.module.css", () => ({}));
jest.mock("@/lib/medusa/services/brands", () => ({ getBrands: jest.fn() }));
jest.mock("@/app/[locale]/shop/ShopClient", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/lib/medusa", () => ({ getProducts: jest.fn() }));
jest.mock("@/lib/medusa/category-directory", () => ({
  loadCategoryDirectory: jest.fn(),
}));
const child = {
  id: "child-id",
  name: "فيتامين C",
  handle: "vitamin-c",
  parent_category_id: "parent-id",
  rank: 0,
  children: [],
};
const parent = {
  id: "parent-id",
  name: "الفيتامينات والمعادن",
  handle: "vitamins",
  parent_category_id: null,
  rank: 0,
  children: [child],
};
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [parent], error: false });
  jest.mocked(getProducts).mockResolvedValue([]);
});
it("renders Arabic native names and stable localized parent and child destinations", () => {
  const html = renderToStaticMarkup(
    createElement(DesktopMegaMenu, {
      active: parent.id,
      categories: [parent],
      onClose: jest.fn(),
    }),
  );
  expect(html).toContain(parent.name);
  expect(html).toContain(child.name);
  expect(html).toContain("/ar/shop?category_id=parent-id");
  expect(html).toContain("/ar/shop?category_id=child-id");
  expect(html).toContain("data-no-translate");
  expect(html).not.toContain("/categories");
  expect(html).not.toContain(message("ar", "nav.shop"));
  expect(html).not.toContain(message("ar", "nav.bundles"));
  expect(html).not.toContain("#value-sets");
});
it("scopes a parent through Medusa using descendants and the requested locale", async () => {
  await ShopPage({
    params: Promise.resolve({ locale: "ar" }),
    searchParams: Promise.resolve({ category_id: parent.id }),
  });
  expect(getProducts).toHaveBeenCalledWith({
    locale: "ar",
    category_id: [parent.id, child.id],
  });
});
it("fails closed for invalid category IDs", async () => {
  const page = await ShopPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({ category_id: "unknown" }),
  });
  expect(getProducts).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(page)).toContain("This category is unavailable.");
});
it("keeps unfiltered products available during a category-directory outage", async () => {
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [], error: true });
  await ShopPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({}),
  });
  expect(getProducts).toHaveBeenCalledWith({ locale: "en" });
});
it("offers recovery when a scoped directory or the product API fails", async () => {
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValueOnce({ roots: [], error: true });
  const props = {
    params: Promise.resolve({ locale: "ar" }),
    searchParams: Promise.resolve({ category_id: parent.id }),
  };
  const html = renderToStaticMarkup(await ShopPage(props));
  expect(html).toContain("حاول مرة أخرى");
  expect(getProducts).not.toHaveBeenCalled();
  jest.mocked(getProducts).mockRejectedValueOnce(new Error("offline"));
  expect(renderToStaticMarkup(await ShopPage(props))).toContain(
    "حاول مرة أخرى",
  );
});
