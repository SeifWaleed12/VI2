import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DesktopMegaMenu from "../DesktopMegaMenu";
import ShopPage from "@/app/[locale]/shop/page";
import CategoryShopPage from "@/app/[locale]/shop/[handle]/page";
import { listProducts } from "@/lib/medusa/services/products";
import { loadCategoryDirectory } from "@/lib/medusa/category-directory";
import { getBrands } from "@/lib/medusa/services/brands";
import { message } from "@/lib/i18n";
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: never; href: string }) =>
    createElement("a", { href }, children),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((href: string) => { throw new Error("TEMP_REDIRECT " + href); }),
  useRouter: () => ({ refresh: jest.fn() }),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  permanentRedirect: (href: string) => {
    throw new Error("REDIRECT " + href);
  },
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
  default: ({ error, locale }: { error: string; locale: "en" | "ar" }) =>
    createElement(
      "div",
      {},
      error === "invalid"
        ? message(locale, "shop.invalidTitle")
        : error
          ? message(locale, "catalog.retry")
          : "ready",
    ),
}));
jest.mock("@/lib/medusa/services/products", () => ({
  listProducts: jest.fn(),
  InvalidCatalogFilterError: class extends Error {},
}));
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
  jest.mocked(getBrands).mockResolvedValue([]);
  jest
    .mocked(listProducts)
    .mockResolvedValue({ products: [], count: 0, limit: 24, offset: 0 });
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
  expect(html).toContain("/ar/shop/vitamins");
  expect(html).toContain("/ar/shop/vitamin-c");
  expect(html).toContain("data-no-translate");
  expect(html).not.toContain("/categories");
  expect(html).not.toContain(message("ar", "nav.shop"));
  expect(html).not.toContain(message("ar", "nav.bundles"));
  expect(html).not.toContain("#value-sets");
});
it("scopes a parent through Medusa using descendants and the requested locale", async () => {
  await CategoryShopPage({
    params: Promise.resolve({ locale: "ar", handle: parent.handle }),
    searchParams: Promise.resolve({}),
  });
  expect(listProducts).toHaveBeenCalledWith({
    locale: "ar",
    category_id: [parent.id, child.id],
    limit: 24,
    offset: 0,
  });
});
it("fails closed for invalid category IDs", async () => {
  const page = await ShopPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({ category_id: "unknown" }),
  });
  expect(listProducts).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(page)).toContain("These filters are unavailable");
});
it("keeps unfiltered products available during a category-directory outage", async () => {
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [], error: true });
  await ShopPage({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({}),
  });
  expect(listProducts).toHaveBeenCalledWith({
    locale: "en",
    limit: 24,
    offset: 0,
  });
});
it("offers recovery when a scoped directory or the product API fails", async () => {
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValueOnce({ roots: [], error: true });
  const props = {
    params: Promise.resolve({ locale: "ar", handle: parent.handle }),
    searchParams: Promise.resolve({}),
  };
  expect(renderToStaticMarkup(await CategoryShopPage(props))).toContain(
    "حاول مرة أخرى",
  );
  expect(listProducts).not.toHaveBeenCalled();
  jest.mocked(listProducts).mockRejectedValueOnce(new Error("offline"));
  expect(renderToStaticMarkup(await CategoryShopPage(props))).toContain(
    "حاول مرة أخرى",
  );
});
