import ProductPage from "../page";
import { getProductByHandle, listProducts } from "@/lib/medusa";
import { notFound } from "next/navigation";

jest.mock("@/lib/medusa", () => ({ getProductByHandle: jest.fn(), listProducts: jest.fn() }));
jest.mock("next/navigation", () => ({ notFound: jest.fn() }));
jest.mock("../ProductDetailClient", () => ({ __esModule: true, default: () => null }));

const product = (id: string, categories?: { id: string; name: string; handle: string }[]) =>
  ({ id, slug: id, name: id, categories } as never);
const render = async (slug = "whey", locale = "ar") =>
  (await ProductPage({ params: Promise.resolve({ slug, locale }) })) as unknown as { props: { product: { id: string }; similar: { id: string }[] } };

beforeEach(() => jest.resetAllMocks());

it("shows up to four similar products from the product's categories, never the product itself", async () => {
  jest.mocked(getProductByHandle).mockResolvedValue(product("p0", [{ id: "pcat_1", name: "Protein", handle: "protein" }, { id: "pcat_2", name: "Whey", handle: "whey" }]));
  jest.mocked(listProducts).mockResolvedValue({ products: ["p1", "p0", "p2", "p3", "p4"].map((id) => product(id)), count: 9, limit: 5, offset: 0 });
  const page = await render();
  expect(page.props.similar.map((item) => item.id)).toEqual(["p1", "p2", "p3", "p4"]);
  expect(listProducts).toHaveBeenCalledWith({ locale: "ar", category_id: ["pcat_1", "pcat_2"], limit: 5 });
});

it("skips similar products for a product without categories", async () => {
  jest.mocked(getProductByHandle).mockResolvedValue(product("p0"));
  expect((await render()).props.similar).toEqual([]);
  expect(listProducts).not.toHaveBeenCalled();
});

it("still shows the product when similar products cannot load", async () => {
  jest.mocked(getProductByHandle).mockResolvedValue(product("p0", [{ id: "pcat_1", name: "Protein", handle: "protein" }]));
  jest.mocked(listProducts).mockRejectedValue(new Error("Catalog temporarily unavailable."));
  const page = await render("whey", "en");
  expect(page.props).toMatchObject({ product: { id: "p0" }, similar: [] });
});

it("answers 404 for an unknown product", async () => {
  jest.mocked(getProductByHandle).mockResolvedValue(null);
  jest.mocked(notFound).mockImplementation(() => { throw new Error("NOT_FOUND"); });
  await expect(render("missing")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled();
});
