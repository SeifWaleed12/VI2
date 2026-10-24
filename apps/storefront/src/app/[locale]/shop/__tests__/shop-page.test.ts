import ShopView, { getShopMetadata } from "../ShopView";
import { headers } from "next/headers";
import { redirect, permanentRedirect } from "next/navigation";
jest.mock("next/headers", () => ({ headers: jest.fn() }));
import {
  listProducts,
  InvalidCatalogFilterError,
} from "@/lib/medusa/services/products";
import { getBrands } from "@/lib/medusa/services/brands";
import { getTagIds } from "@/lib/medusa/services/tags";
import { searchProducts } from "@/lib/medusa/services/search";
import { loadCategoryDirectory } from "@/lib/medusa/category-directory";
import type { ShopProps } from "../ShopClient";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((href: string) => {
    throw new Error("TEMP_REDIRECT " + href);
  }),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  permanentRedirect: jest.fn((href: string) => {
    throw new Error("REDIRECT " + href);
  }),
}));
jest.mock("../ShopClient", () => ({ __esModule: true, default: () => null }));
jest.mock("@/lib/medusa/services/products", () => ({
  listProducts: jest.fn(),
  InvalidCatalogFilterError: class extends Error {},
}));
jest.mock("@/lib/medusa/services/brands", () => ({ getBrands: jest.fn() }));
jest.mock("@/lib/medusa/services/tags", () => ({ getTagIds: jest.fn() }));
jest.mock("@/lib/medusa/services/search", () => ({ searchProducts: jest.fn() }));
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
afterEach(() => jest.restoreAllMocks());
const render = async (input: Parameters<typeof ShopView>[0]) =>
  (await ShopView(input)).props as ShopProps;
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "development", SITE_URL: "" });
  jest
    .mocked(headers)
    .mockResolvedValue(new Headers({ host: "localhost:3001" }) as never);
  jest
    .mocked(loadCategoryDirectory)
    .mockResolvedValue({ roots: [parent], error: false });
  jest.mocked(getBrands).mockResolvedValue([brand]);
  jest
    .mocked(listProducts)
    .mockResolvedValue({ products: [], count: 137, limit: 24, offset: 120 });
  jest
    .mocked(searchProducts)
    .mockResolvedValue({ products: [], count: 137, limit: 24, offset: 120 });
});
it("combines descendant IDs, brand IDs, search, locale and a page beyond the first 100", async () => {
  const result = await render({
    locale: "ar",
    handle: "vitamins",
    query: { brand_id: brand.id, q: "  بروتين ", page: "6" },
  });
  expect(searchProducts).toHaveBeenCalledWith({
    locale: "ar",
    limit: 24,
    offset: 120,
    category_id: [parent.id, child.id],
    brand_id: [brand.id],
    q: "بروتين",
  });
  expect(listProducts).not.toHaveBeenCalled();
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
  { goal: ["immune-support", "gut-health"] },
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
  expect(searchProducts).toHaveBeenCalledWith({
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
  expect(searchProducts).toHaveBeenCalledWith({
    locale: "en",
    q: "protein",
    limit: 24,
    offset: 0,
  });
  expect(searchProducts).toHaveBeenCalledWith({
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

it("uses temporary redirects for mutable category and brand names, and permanent redirects for IDs", async () => {
  await expect(
    render({ locale: "en", query: { brand: brand.name } }),
  ).rejects.toThrow("TEMP_REDIRECT /en/shop?brand_id=brand_real");
  expect(redirect).toHaveBeenCalledWith("/en/shop?brand_id=brand_real");
  expect(permanentRedirect).not.toHaveBeenCalled();
  await expect(
    render({ locale: "en", query: { category_id: parent.id } }),
  ).rejects.toThrow("REDIRECT /en/shop/vitamins");
  expect(permanentRedirect).toHaveBeenCalledWith("/en/shop/vitamins");
});
it("gives clean localized categories a title and canonical on the served origin", async () => {
  const metadata = await getShopMetadata({
    locale: "ar",
    handle: "vitamins",
    query: { utm: "tracking" },
  });
  expect(metadata).toMatchObject({
    title: parent.name + " | Vi2",
    alternates: { canonical: "/ar/shop/vitamins" },
    robots: { index: true, follow: true },
  });
  expect(String(metadata.metadataBase)).toBe("http://localhost:3001/");
});
it("includes search and page in titles and excludes search and brand variants from indexing", async () => {
  const metadata = await getShopMetadata({
    locale: "en",
    handle: "vitamins",
    query: { q: "protein", page: "6", brand_id: brand.id },
  });
  expect(metadata.title).toBe(
    parent.name + " — Search: protein — Page 6 | Vi2",
  );
  expect(metadata.robots).toEqual({ index: false, follow: true });
  expect(metadata.alternates).toEqual({ canonical: "/en/shop/vitamins" });
  expect(
    (await getShopMetadata({ locale: "en", query: { brand_id: brand.id } }))
      .robots,
  ).toEqual({ index: false, follow: true });
});
it("excludes invalid, past-end and unavailable states from indexing", async () => {
  expect(
    (await getShopMetadata({ locale: "en", query: { page: "0" } })).robots,
  ).toEqual({ index: false, follow: true });
  expect(
    (await getShopMetadata({ locale: "en", query: { page: "6" } })).robots,
  ).toEqual({ index: false, follow: true });
  jest.mocked(listProducts).mockRejectedValueOnce(new Error("offline"));
  expect((await getShopMetadata({ locale: "ar", query: {} })).robots).toEqual({
    index: false,
    follow: true,
  });
});
it("does not turn malformed request-host metadata into a broken shop", async () => {
  jest.mocked(headers).mockResolvedValue(new Headers({ host: "[" }) as never);
  const metadata = await getShopMetadata({ locale: "en", query: {} });
  expect(metadata.title).toBe("Shop | Vi2");
  expect(metadata.alternates).toBeUndefined();
});

it("uses only the configured origin in production despite hostile request headers", async () => {
  jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "production", SITE_URL: "https://store.example" });
  jest.mocked(headers).mockResolvedValue(new Headers({ host: "evil.example", "x-forwarded-proto": "https" }) as never);
  const metadata = await getShopMetadata({ locale: "en", handle: "vitamins", query: {} });
  expect(String(metadata.metadataBase)).toBe("https://store.example/");
  expect(metadata.alternates).toEqual({ canonical: "/en/shop/vitamins" });
  expect(headers).not.toHaveBeenCalled();
});
it.each([undefined, "not a URL", "javascript:alert(1)", "https://user:password@store.example", "https://store.example/path", "https://store.example?host=evil"])(
  "omits production canonical rather than using request headers when SITE_URL is %s", async (SITE_URL) => {
    jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "production", SITE_URL });
    jest.mocked(headers).mockResolvedValue(new Headers({ host: "evil.example" }) as never);
    const metadata = await getShopMetadata({ locale: "ar", query: {} });
    expect(metadata.metadataBase).toBeUndefined();
    expect(metadata.alternates).toBeUndefined();
    expect(headers).not.toHaveBeenCalled();
  },
);
it("gives a populated later page its own canonical while removing tracking parameters", async () => {
  jest.mocked(listProducts).mockResolvedValue({ products: [{ id: "product_121" } as never], count: 137, limit: 24, offset: 120 });
  const metadata = await getShopMetadata({ locale: "en", handle: "vitamins", query: { page: "6", utm: "tracking" } });
  expect(metadata.robots).toEqual({ index: true, follow: true });
  expect(metadata.alternates).toEqual({ canonical: "/en/shop/vitamins?page=6" });
});

it.each(["en", "ar"] as const)("retains search metadata with two selected brands in %s", async locale => {
  const second = { ...brand, id: "brand_second", slug: "second" };
  jest.mocked(getBrands).mockResolvedValue([brand, second]);
  const metadata = await getShopMetadata({ locale, handle: "vitamins", query: {
    q: "whey", brand_id: [brand.id, second.id], utm: "1",
  } });
  expect(metadata.title).toBe(parent.name + (locale === "ar" ? " — بحث: whey | Vi2" : " — Search: whey | Vi2"));
});

it("filters by a health goal through its product tag, with the other filters", async () => {
  jest.mocked(getTagIds).mockResolvedValue({ "immune-support": "ptag_immune" });
  const result = await render({ locale: "en", query: { goal: "immune-support", brand_id: brand.id } });
  expect(getTagIds).toHaveBeenCalledWith(["immune-support"]);
  expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ tag_id: ["ptag_immune"], brand_id: [brand.id] }));
  expect(result.filters.goal).toBe("immune-support");
  expect(result.error).toBeNull();
});
it("shows a goal no product is tagged with yet as empty, and a failed lookup as unavailable", async () => {
  jest.mocked(getTagIds).mockResolvedValueOnce({});
  const empty = await render({ locale: "en", query: { goal: "heart-health" } });
  expect([empty.error, empty.page.count, empty.page.products]).toEqual([null, 0, []]);
  expect(listProducts).not.toHaveBeenCalled();
  jest.mocked(getTagIds).mockRejectedValueOnce(new Error("offline"));
  expect((await render({ locale: "en", query: { goal: "gut-health" } })).error).toBe("unavailable");
});
it("keeps goal-filtered pages out of search results", async () => {
  jest.mocked(getTagIds).mockResolvedValue({ "stress-sleep": "ptag_sleep" });
  const metadata = await getShopMetadata({ locale: "en", query: { goal: "stress-sleep" } });
  expect(metadata.robots).toEqual({ index: false, follow: true });
});

it("browses without search, and ranks a text search through product search with the same filters", async () => {
  jest.mocked(getTagIds).mockResolvedValue({ "immune-support": "ptag_immune" });
  await render({ locale: "en", handle: "vitamins", query: { goal: "immune-support" } });
  expect(listProducts).toHaveBeenCalledTimes(1);
  expect(searchProducts).not.toHaveBeenCalled();
  jest.mocked(searchProducts).mockRejectedValueOnce(new Error("offline"));
  expect((await render({ locale: "en", query: { q: "whey" } })).error).toBe("unavailable");
});
