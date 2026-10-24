import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DealsPage, { generateMetadata } from "../page";
import { getDeals } from "@/lib/medusa";

jest.mock("@/lib/medusa", () => ({ getDeals: jest.fn() }));
jest.mock("../../shop/Shop.module.css", () => ({}));
jest.mock("../Deals.module.css", () => ({}));
jest.mock("@/components/LocaleLink", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: never }) => createElement("a", { href }, children),
}));
jest.mock("@/components/ProductCard", () => ({
  __esModule: true,
  default: ({ product }: { product: { id: string } }) => createElement("article", {}, product.id),
}));

const page = async (locale: string) => renderToStaticMarkup(await DealsPage({ params: Promise.resolve({ locale }) }));

it("shows bundles first, then the products on sale, each under its heading", async () => {
  jest.mocked(getDeals).mockResolvedValue({ bundles: [{ id: "prod_set" }], deals: [{ id: "prod_sale" }] } as never);
  const html = await page("en");
  expect(html.indexOf("Bundles")).toBeLessThan(html.indexOf("<article>prod_set</article>"));
  expect(html.indexOf("<article>prod_set</article>")).toBeLessThan(html.indexOf("On sale"));
  expect(html.indexOf("On sale")).toBeLessThan(html.indexOf("<article>prod_sale</article>"));
  expect(html).not.toContain("No deals right now");
});

it("hides an empty section", async () => {
  jest.mocked(getDeals).mockResolvedValue({ bundles: [], deals: [{ id: "prod_sale" }] } as never);
  const html = await page("ar");
  expect(html).not.toContain("الباقات");
  expect(html).toContain("تخفيضات");
});

it("says there are no deals instead of showing ordinary products, and keeps it out of search results", async () => {
  jest.mocked(getDeals).mockResolvedValue({ bundles: [], deals: [] });
  const html = await page("ar");
  expect(html).toContain("لا توجد عروض حالياً");
  expect(html).not.toContain("<article>");
  expect((await generateMetadata({ params: Promise.resolve({ locale: "ar" }) })).robots).toEqual({ index: false, follow: true });
});

it("tells the shopper when deals could not be loaded and offers a retry", async () => {
  jest.mocked(getDeals).mockRejectedValue(new Error("offline"));
  const html = await page("en");
  expect(html).toContain("Deals could not be loaded");
  expect(html).toContain('href="/en/deals"');
});
