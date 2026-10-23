import { searchProducts } from "../search";
import { InvalidCatalogFilterError } from "../products";
import { medusa } from "../../client";

jest.mock("../../client", () => ({ medusa: { client: { fetch: jest.fn() }, store: { product: { list: jest.fn() }, region: { list: jest.fn() } } } }));
const egypt = { id: "reg_eg", name: "Egypt", currency_code: "egp", countries: [{ iso_2: "eg" }] };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(medusa.store.region.list).mockResolvedValue({ regions: [egypt] } as never);
});

it("keeps the backend's best-match order and its total, reading only the matched products", async () => {
  jest.mocked(medusa.client.fetch).mockResolvedValueOnce({ ids: ["prod_b", "prod_a"], count: 7 } as never);
  jest.mocked(medusa.store.product.list).mockResolvedValueOnce({ products: [{ id: "prod_a", variants: [] }, { id: "prod_b", variants: [] }], count: 2 } as never);
  const page = await searchProducts({ q: "whey", locale: "ar", limit: 6, brand_id: ["brand_on"], tag_id: [] });
  expect(page.products.map((p) => p.id)).toEqual(["prod_b", "prod_a"]);
  expect(page).toMatchObject({ count: 7, limit: 6, offset: 0 });
  expect(medusa.client.fetch).toHaveBeenCalledWith("/store/product-search", { method: "GET", query: { q: "whey", limit: 6, offset: 0, brand_id: ["brand_on"] } });
  expect(medusa.store.product.list).toHaveBeenCalledWith(expect.objectContaining({ id: ["prod_b", "prod_a"], limit: 2 }), { "x-medusa-locale": "ar-EG" });
});

it("asks for no products when nothing matches", async () => {
  jest.mocked(medusa.client.fetch).mockResolvedValueOnce({ ids: [], count: 0 } as never);
  expect(await searchProducts({ q: "zzz", locale: "en" })).toEqual({ products: [], count: 0, limit: 24, offset: 0 });
  expect(medusa.store.product.list).not.toHaveBeenCalled();
});

it("tells refused filters apart from an outage", async () => {
  jest.mocked(medusa.client.fetch).mockRejectedValueOnce({ status: 400 });
  await expect(searchProducts({ q: "whey", locale: "en" })).rejects.toBeInstanceOf(InvalidCatalogFilterError);
  jest.mocked(medusa.client.fetch).mockRejectedValueOnce(new Error("offline"));
  await expect(searchProducts({ q: "whey", locale: "en" })).rejects.toThrow("Search temporarily unavailable.");
});
