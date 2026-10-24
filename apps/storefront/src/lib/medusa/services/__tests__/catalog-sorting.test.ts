import { listCatalog } from "../catalog";
import { listProducts, InvalidCatalogFilterError } from "../products";
import { medusa } from "../../client";
jest.mock("../../client", () => ({ medusa: { client: { fetch: jest.fn() } } }));
jest.mock("../regions", () => ({ resolveRegionId: async () => "reg_egypt" }));
jest.mock("../products", () => ({ listProducts: jest.fn(), InvalidCatalogFilterError: class extends Error {} }));
const params = { locale: "ar" as const, sort: "price_asc" as const, limit: 24, offset: 96 };
beforeEach(() => jest.clearAllMocks());
it("keeps native default browsing usable without the index", async () => {
  jest.mocked(listProducts).mockResolvedValue({ products: [], count: 5, limit: 24, offset: 0 });
  expect((await listCatalog({ locale: "en", sort: "default", limit: 24 })).count).toBe(5);
  expect(medusa.client.fetch).not.toHaveBeenCalled();
});
it("preserves global order/count and hydrates the backend-selected variant with fresh localized prices", async () => {
  jest.mocked(medusa.client.fetch).mockResolvedValue({ ids: ["b", "a"], count: 107, variants: { b: "vb", a: "va" } });
  jest.mocked(listProducts).mockResolvedValue({ products: [
    { id: "a", name: "A", shortName: "A", variants: [{ id: "va", price: 20, inStock: true }] },
    { id: "b", name: "B", shortName: "B", variants: [{ id: "wrong_first", price: 999 }, { id: "vb", price: 10, inStock: false }] },
  ] as never, count: 2, limit: 2, offset: 0 });
  const result = await listCatalog({ ...params, deals: true, category_id: ["pcat"] });
  expect(result.products.map(p => p.id)).toEqual(["b", "a"]);
  expect(result.count).toBe(107);
  expect(result.products[0]).toMatchObject({ variantId: "vb", price: 10, inStock: false });
  expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ fresh: true, locale: "ar", regionId: "reg_egypt" }));
  expect(medusa.client.fetch).toHaveBeenCalledWith("/store/catalog", expect.objectContaining({
    cache: "no-store", headers: { "x-medusa-locale": "ar-EG" },
    query: expect.objectContaining({ offset: 96, deals: "true", category_id: ["pcat"] }),
  }));
});
it("distinguishes invalid input, outages and a product disappearing during hydration", async () => {
  jest.mocked(medusa.client.fetch).mockRejectedValueOnce({ status: 400 });
  await expect(listCatalog(params)).rejects.toBeInstanceOf(InvalidCatalogFilterError);
  jest.mocked(medusa.client.fetch).mockRejectedValueOnce({ status: 409 });
  await expect(listCatalog(params)).rejects.toThrow("unavailable");
  jest.mocked(medusa.client.fetch).mockRejectedValueOnce({ status: 503 });
  await expect(listCatalog(params)).rejects.toThrow("unavailable");
  jest.mocked(medusa.client.fetch).mockResolvedValueOnce({ ids: ["gone"], count: 1, variants: {} });
  jest.mocked(listProducts).mockResolvedValueOnce({ products: [], count: 0, limit: 1, offset: 0 });
  await expect(listCatalog(params)).rejects.toThrow("changed");
});

it("keeps a product without variants browsable without inventing a price or purchasable variant", async () => {
  jest.mocked(medusa.client.fetch).mockResolvedValueOnce({ ids: ["empty"], count: 1, variants: { empty: "" } });
  jest.mocked(listProducts).mockResolvedValueOnce({ products: [{ id: "empty", variants: [] }] as never, count: 1, limit: 1, offset: 0 });
  expect((await listCatalog(params)).products[0]).toMatchObject({ id: "empty", price: 0, inStock: false, variantId: undefined });
});
