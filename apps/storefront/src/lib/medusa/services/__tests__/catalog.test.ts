import { mapMedusaProduct, getProducts, listProducts, InvalidCatalogFilterError } from "../products";
import { mapMedusaCart } from "../cart";
import { selectRegion } from "../regions";
import { medusa } from "../../client";

jest.mock("../../client", () => ({ medusa: { store: { product: { list: jest.fn() }, region: { list: jest.fn() } } } }));
const egypt = { id: "reg_eg", name: "Egypt", currency_code: "egp", countries: [{ iso_2: "eg" }] };
beforeEach(() => { jest.resetAllMocks(); jest.mocked(medusa.store.region.list).mockResolvedValue({ regions: [egypt] } as never); });

it("never invents inventory, reviews, or metadata brand ownership", () => {
  const product = mapMedusaProduct({ id: "prod_1", metadata: { stock: 99, rating: 5, reviewCount: 100, brand: "Wrong" }, variants: [{ id: "variant_1", manage_inventory: true }] } as never);
  expect(product).toMatchObject({ stock: 0, inventoryKnown: false, inStock: false, rating: 0, reviewCount: 0, brand: "" });
});
it("reads brand from the active linked record", () => {
  expect(mapMedusaProduct({ id: "prod_1", brand: { name: "Confirmed", status: "active" }, variants: [] } as never).brand).toBe("Confirmed");
});
it.each([{ manage_inventory: false }, { manage_inventory: true, allow_backorder: true }, { manage_inventory: true, inventory_quantity: 2 }])("respects explicit Medusa availability %j", (variant) => {
  expect(mapMedusaProduct({ id: "prod_1", variants: [{ id: "variant_1", ...variant }] } as never).inStock).toBe(true);
});
it("distinguishes an empty catalog from a backend outage", async () => {
  jest.mocked(medusa.store.product.list).mockResolvedValueOnce({ products: [] } as never).mockRejectedValueOnce(new Error("offline"));
  expect(await getProducts()).toEqual([]);
  await expect(getProducts()).rejects.toThrow("temporarily unavailable");
});
it("selects a real Egyptian EGP region and rejects stale or ambiguous configuration", () => {
  expect(selectRegion([egypt]).id).toBe("reg_eg");
  expect(() => selectRegion([egypt], "reg_stale")).toThrow();
  expect(() => selectRegion([egypt, { ...egypt, id: "reg_other" }])).toThrow();
  expect(() => selectRegion([{ ...egypt, currency_code: "usd" }])).toThrow();
  expect(() => selectRegion([])).toThrow();
});

it("never surfaces metadata ratings for cart line products", () => {
  const cart = mapMedusaCart({ id: "cart_1", items: [{ id: "item_1", quantity: 1, unit_price: 100, product: { id: "prod_1", metadata: { rating: 5, reviewCount: 999 } }, variant: { id: "variant_1" } }] });
  expect(cart.items[0].product).toMatchObject({ rating: 0, reviewCount: 0 });
});

it("retains the authoritative category ID for product breadcrumbs", () => {
 expect(mapMedusaProduct({ id: "prod_1", categories: [{id:"pcat_1",name:"Translated name"}], variants: [] } as never).categoryId).toBe("pcat_1");
});
it("sends category IDs and locale in each isolated product request", async () => {
 jest.mocked(medusa.store.product.list).mockResolvedValue({products:[]} as never);
 await Promise.all([getProducts({locale:"ar",category_id:["parent","child"]}), getProducts({locale:"en"})]);
 expect(medusa.store.product.list).toHaveBeenCalledWith(expect.objectContaining({category_id:["parent","child"]}), {"x-medusa-locale":"ar-EG"});
 expect(medusa.store.product.list).toHaveBeenCalledWith(expect.anything(), {"x-medusa-locale":"en-US"});
});

describe("catalog contract (docs/CATALOG-CONTRACT.md)", () => {
  const list = () => jest.mocked(medusa.store.product.list);
  const sentQuery = () => list().mock.calls[0][0] as Record<string, unknown>;

  it("maps the brand ID, every category and the EDA registration", () => {
    const product = mapMedusaProduct({
      id: "prod_1", variants: [],
      brand: { id: "brand_1", name: "Optimum", status: "active" },
      categories: [{ id: "pcat_1", name: "Vitamins", handle: "vitamins" }, { id: "pcat_2", name: "Vitamin C", handle: "vitamin-c" }],
      eda_registration: { registration_number: "EDA-1", is_approved: false },
    } as never);
    expect(product).toMatchObject({
      brand: "Optimum", brandId: "brand_1",
      categories: [{ id: "pcat_1", name: "Vitamins", handle: "vitamins" }, { id: "pcat_2", name: "Vitamin C", handle: "vitamin-c" }],
      eda: { registrationNumber: "EDA-1", approved: false },
    });
  });

  it("omits an inactive brand and an absent EDA registration", () => {
    const product = mapMedusaProduct({ id: "prod_1", variants: [], brand: { id: "brand_1", name: "Old", status: "inactive" }, eda_registration: null } as never);
    expect(product).not.toHaveProperty("brandId");
    expect(product).not.toHaveProperty("eda");
    expect(product).not.toHaveProperty("categories");
    expect(product.brand).toBe("");
  });

  it("sends locale, filters and page to Medusa and returns the total", async () => {
    list().mockResolvedValue({ products: [{ id: "prod_1", variants: [] }], count: 240 } as never);
    const page = await listProducts({ locale: "ar", category_id: ["pcat_1", "pcat_2"], brand_id: ["brand_1"], q: "  whey ", limit: 24, offset: 120 });
    expect(page).toMatchObject({ count: 240, limit: 24, offset: 120, products: [{ id: "prod_1" }] });
    expect(sentQuery()).toMatchObject({ category_id: ["pcat_1", "pcat_2"], brand_id: ["brand_1"], q: "whey", limit: 24, offset: 120, region_id: "reg_eg" });
    expect(String(sentQuery().fields)).toContain("eda_registration.is_approved");
    expect(list().mock.calls[0][1]).toEqual({ "x-medusa-locale": "ar-EG" });
  });

  it.each([
    [{ limit: 0, offset: -5 }, { limit: 1, offset: 0 }],
    [{ limit: 500, offset: 3.7 }, { limit: 100, offset: 3 }],
    [{ limit: Number.NaN }, { limit: 50, offset: 0 }],
  ])("keeps the page within bounds %j", async (input, bounded) => {
    list().mockResolvedValue({ products: [], count: 0 } as never);
    expect(await listProducts({ locale: "en", ...input })).toMatchObject({ ...bounded, count: 0, products: [] });
    expect(sentQuery()).toMatchObject(bounded);
  });

  it("leaves out empty filters", async () => {
    list().mockResolvedValue({ products: [], count: 0 } as never);
    await listProducts({ locale: "en", category_id: [], brand_id: [], q: "   " });
    expect(sentQuery()).not.toHaveProperty("category_id");
    expect(sentQuery()).not.toHaveProperty("brand_id");
    expect(sentQuery()).not.toHaveProperty("q");
  });

  it("reports an outage instead of an empty page", async () => {
    list().mockRejectedValue(Object.assign(new Error("Service Unavailable"), { status: 503 }));
    await expect(listProducts({ locale: "en" })).rejects.toThrow("temporarily unavailable");
  });

  it("reports filters Medusa refuses as invalid filters, not an outage", async () => {
    list().mockRejectedValue(Object.assign(new Error("brand_id must be 1 to 50 brand IDs."), { status: 400 }));
    await expect(listProducts({ locale: "en", brand_id: ["not an id"] })).rejects.toBeInstanceOf(InvalidCatalogFilterError);
  });

  it("keeps getProducts as the first page of up to 100 products in English by default", async () => {
    list().mockResolvedValue({ products: [{ id: "prod_1", variants: [] }], count: 900 } as never);
    expect(await getProducts()).toEqual([expect.objectContaining({ id: "prod_1" })]);
    expect(sentQuery()).toMatchObject({ limit: 100, offset: 0 });
    expect(list().mock.calls[0][1]).toEqual({ "x-medusa-locale": "en-US" });
  });
});
