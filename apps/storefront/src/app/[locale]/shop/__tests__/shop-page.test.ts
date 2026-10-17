import ShopView from "../ShopView";
import {
  listProducts,
  InvalidCatalogFilterError,
} from "@/lib/medusa/services/products";
import { getBrands } from "@/lib/medusa/services/brands";
import { loadCategoryDirectory } from "@/lib/medusa/category-directory";
import type { ShopProps } from "../ShopClient";

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  permanentRedirect: (href: string) => {
    throw new Error("REDIRECT " + href);
  },
}));
jest.mock("../ShopClient", () => ({ __esModule: true, default: () => null }));
jest.mock("@/lib/medusa/services/products", () => ({
  listProducts: jest.fn(),
  InvalidCatalogFilterError: class extends Error {},
}));
jest.mock("@/lib/medusa/services/brands", () => ({ getBrands: jest.fn() }));
jest.mock("@/lib/medusa/category-directory", () => ({
  loadCategoryDirectory: jest.fn(),
}));

const child = {
  id: "pcat_child",
  name: "فيتامين C",
  handle: "vitamin-c",
  parent_category_id: "pcat_parent",
  children: [],
};
const parent = {
  id: "pcat_parent",
  name: "الفيتامينات والمعادن",
  handle: "vitamins",
  parent_category_id: null,
  children: [child],
};
const brand = {
  id: "brand_real",
  name: "Actual brand",
  slug: "actual",
  status: "active",
};
const render = async (input: Parameters<typeof ShopView>[0]) =>
  (await ShopView(input)).props as ShopProps;
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [parent], error: false });
  jest.mocked(getBrands).mockResolvedValue([brand]);
  jest
    .mocked(listProducts)
    .mockResolvedValue({ products: [], count: 137, limit: 24, offset: 120 });
});
it("combines descendant IDs, brand IDs, search, locale and a page beyond the first 100", async () => {
  const result = await render({
    locale: "ar",
    handle: "vitamins",
    query: { brand_id: brand.id, q: "  بروتين ", page: "6" },
  });
  expect(listProducts).toHaveBeenCalledWith({
    locale: "ar",
    limit: 24,
    offset: 120,
    category_id: [parent.id, child.id],
    brand_id: [brand.id],
    q: "بروتين",
  });
  expect(result.page.count).toBe(137);
  expect(result.error).toBeNull();
});
it("redirects legacy category IDs to the localized handle and preserves all other parameters", async () => {
  await expect(
    render({
      locale: "ar",
      query: {
        category_id: parent.id,
        brand_id: brand.id,
        q: "C",
        page: "2",
        utm: ["one", "two"],
      },
    }),
  ).rejects.toThrow(
    "REDIRECT /ar/shop/vitamins?q=C&page=2&utm=one&utm=two&brand_id=brand_real",
  );
  expect(listProducts).not.toHaveBeenCalled();
});
it("resolves old category and brand names once, then uses stable IDs", async () => {
  await expect(
    render({
      locale: "ar",
      query: { category: child.name, brand: brand.name },
    }),
  ).rejects.toThrow("REDIRECT /ar/shop/vitamin-c?brand_id=brand_real");
});
it("answers 404 for an unknown handle, but an outage never becomes a 404", async () => {
  await expect(
    render({ locale: "en", handle: "missing", query: {} }),
  ).rejects.toThrow("NOT_FOUND");
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [], error: true });
  expect(
    (await render({ locale: "en", handle: "missing", query: {} })).error,
  ).toBe("unavailable");
});
it.each([
  { category_id: "unknown" },
  { brand_id: "brand_missing" },
  { page: "0" },
  { q: ["a", "b"] },
  { goal: "muscle" },
])(
  "rejects invalid filters without silently showing all products: %j",
  async (query) => {
    expect((await render({ locale: "en", query })).error).toBe("invalid");
    expect(listProducts).not.toHaveBeenCalled();
  },
);
it("does not hide API failures as empty results or a filter-validation failure", async () => {
  jest.mocked(listProducts).mockRejectedValueOnce(new Error("offline"));
  expect((await render({ locale: "en", query: {} })).error).toBe("unavailable");
  jest
    .mocked(listProducts)
    .mockRejectedValueOnce(new InvalidCatalogFilterError());
  expect((await render({ locale: "en", query: {} })).error).toBe("invalid");
});
it("keeps search and ID-based brand filtering usable when their directories fail", async () => {
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [], error: true });
  jest.mocked(getBrands).mockRejectedValue(new Error("offline"));
  const result = await render({
    locale: "en",
    query: { q: "protein", brand_id: brand.id },
  });
  expect(listProducts).toHaveBeenCalledWith({
    locale: "en",
    limit: 24,
    offset: 0,
    q: "protein",
    brand_id: [brand.id],
  });
  expect(result).toMatchObject({
    categoryError: true,
    brandError: true,
    error: null,
  });
});
it("keeps EN and AR requests separate when they run concurrently", async () => {
  await Promise.all([
    render({ locale: "en", query: { q: "protein" } }),
    render({ locale: "ar", query: { q: "بروتين" } }),
  ]);
  expect(listProducts).toHaveBeenCalledWith({
    locale: "en",
    q: "protein",
    limit: 24,
    offset: 0,
  });
  expect(listProducts).toHaveBeenCalledWith({
    locale: "ar",
    q: "بروتين",
    limit: 24,
    offset: 0,
  });
});
it("keeps an empty backend answer and a page past the end distinct", async () => {
  jest
    .mocked(listProducts)
    .mockResolvedValueOnce({ products: [], count: 0, limit: 24, offset: 0 });
  const empty = await render({ locale: "en", query: {} });
  expect(empty.page.count).toBe(0);
  expect(empty.error).toBeNull();
  const pastEnd = await render({ locale: "en", query: { page: "6" } });
  expect(pastEnd.page.count).toBe(137);
  expect(pastEnd.error).toBeNull();
});
