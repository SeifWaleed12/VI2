import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Home, { generateMetadata } from "../page";
import { getProducts, getBrands } from "@/lib/medusa";
import { message } from "@/lib/i18n";

jest.mock("@/lib/medusa", () => ({ getProducts: jest.fn(), getBrands: jest.fn() }));
jest.mock("../HomeRecovery.module.css", () => ({}));
jest.mock("@/context/LanguageContext", () => ({ LegacyTranslations: ({ children }: { children: never }) => children }));
jest.mock("@/components/HomeHeroSlider", () => ({ __esModule: true, default: () => createElement("h1", {}, "Healthy home") }));
jest.mock("@/components/TrendingNow", () => ({ __esModule: true, default: ({ products }: { products: { name: string }[] }) => createElement("div", {}, products.map(p => p.name).join(" ")) }));
jest.mock("@/components/HomeBestSellers", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/BrandUniverse", () => ({ __esModule: true, default: ({ brands }: { brands: string[] }) => createElement("div", {}, brands.join(" ")) }));
jest.mock("@/components/HomeDiscovery", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ValueSets", () => ({ __esModule: true, default: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getProducts).mockResolvedValue([{ id: "real-product", name: "Real product" }] as never);
  jest.mocked(getBrands).mockResolvedValue([{ name: "Real brand" }] as never);
});
const render = async (locale: "en" | "ar") => renderToStaticMarkup(await Home({ params: Promise.resolve({ locale }) }));

it.each(["en", "ar"] as const)("renders a localized recovery page when products fail in %s", async locale => {
  jest.mocked(getProducts).mockRejectedValueOnce(new Error("backend unavailable"));
  const html = await render(locale);
  expect(html).toContain(message(locale, "catalog.error"));
  expect(html).toContain(message(locale, "home.catalogErrorDescription"));
  expect(html).toContain(`href="/${locale}"`);
  expect(html).toContain(`href="/${locale}/shop"`);
  expect(html).toContain("data-no-translate");
  expect(html).not.toContain("Real product");
  expect(html).not.toContain("Real brand");
  expect(getProducts).toHaveBeenCalledWith({ locale });
});
it.each(["en", "ar"] as const)("recovers normally after a brand failure in %s", async locale => {
  jest.mocked(getBrands).mockRejectedValueOnce(new Error("brand directory unavailable"));
  const unavailable = await render(locale);
  expect(unavailable).not.toContain(message(locale, "catalog.error"));
  expect(unavailable).toContain("Real product");
  expect(unavailable).not.toContain("Real brand");
  const recovered = await render(locale);
  expect(recovered).not.toContain(message(locale, "catalog.error"));
  expect(recovered).toContain("Real product");
  expect(recovered).toContain("Real brand");
});
it("distinguishes a legitimately empty catalog from a failed request", async () => {
  jest.mocked(getProducts).mockResolvedValue([]);
  jest.mocked(getBrands).mockResolvedValue([]);
  const html = await render("en");
  expect(html).toContain("Healthy home");
  expect(html).not.toContain(message("en", "catalog.error"));
});

it.each(["en", "ar"] as const)("prevents indexing only on a product outage in %s", async locale => {
  jest.mocked(getProducts).mockRejectedValueOnce(new Error("unavailable"));
  expect(await generateMetadata({ params: Promise.resolve({ locale }) })).toEqual({
    title: `${message(locale, "catalog.error")} | Vi2`,
    robots: { index: false, follow: true },
  });
  expect(await generateMetadata({ params: Promise.resolve({ locale }) })).toEqual({});
});
it("limits the recovery live region to the status text", async () => {
  jest.mocked(getProducts).mockRejectedValueOnce(new Error("unavailable"));
  const html = await render("en");
  expect(html).toContain('aria-labelledby="home-recovery-title"');
  expect(html).toContain('<p role="status">');
  expect(html).not.toMatch(/<section[^>]*role="status"/);
});
