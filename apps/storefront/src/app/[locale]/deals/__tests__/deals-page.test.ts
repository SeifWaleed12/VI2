import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DealsPage from "../page";
import { Bundles } from "../Bundles";
import ShopView from "../../shop/ShopView";
import { getBundles } from "@/lib/medusa";

jest.mock("@/lib/medusa", () => ({ getBundles: jest.fn() }));
jest.mock("../../shop/ShopView", () => ({ __esModule: true, default: jest.fn(() => null), getShopMetadata: jest.fn() }));
jest.mock("../../shop/Shop.module.css", () => ({}));
jest.mock("../Deals.module.css", () => ({}));
jest.mock("@/components/ProductCard", () => ({
  __esModule: true,
  default: ({ product }: { product: { id: string } }) => createElement("article", {}, product.id),
}));

const bundles = async (locale: string, query: Record<string, string | undefined> = {}) => {
  const element = await Bundles({ locale, query });
  return element ? renderToStaticMarkup(element) : "";
};

it("is the sortable shop limited to products on sale, with bundles on top", async () => {
  const element = await DealsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ sort: "price_asc" }) }) as ReactElement<{ query: unknown; lead: ReactElement }>;
  expect(element.type).toBe(ShopView);
  expect(element.props.query).toEqual({ sort: "price_asc", deals: "1" });
  expect(element.props.lead.type).toBe(Bundles);
});

it("shows bundles under their heading in each language", async () => {
  jest.mocked(getBundles).mockResolvedValue([{ id: "prod_set" }] as never);
  const html = await bundles("ar");
  expect(html.indexOf("الباقات")).toBeLessThan(html.indexOf("<article>prod_set</article>"));
  expect(getBundles).toHaveBeenCalledWith("ar");
});

it("leaves bundles out of searches, filters and later pages, and when there are none or they fail", async () => {
  jest.mocked(getBundles).mockResolvedValue([{ id: "prod_set" }] as never);
  for (const query of [{ q: "whey" }, { brand_id: "brand_1" }, { category_id: "pcat_1" }, { goal: "gut-health" }, { page: "2" }]) {
    expect(await bundles("en", query)).toBe("");
  }
  expect(await bundles("en", { page: "1", sort: "newest" })).toContain("prod_set");
  jest.mocked(getBundles).mockResolvedValueOnce([]);
  expect(await bundles("en")).toBe("");
  jest.mocked(getBundles).mockRejectedValueOnce(new Error("offline"));
  expect(await bundles("en")).toBe("");
});
