import { mapMedusaProduct, getProducts } from "../products";
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
