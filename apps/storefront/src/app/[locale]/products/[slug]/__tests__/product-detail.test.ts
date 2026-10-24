import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import ProductDetailClient from "../ProductDetailClient";
import type { Product } from "@/types/product";

let language: "en" | "ar" = "en";
jest.mock("@/components/CatalogImage.module.css", () => ({}));
jest.mock("../ProductDetail.module.css", () => ({ __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }));
jest.mock("lucide-react", () => new Proxy({}, { get: () => () => null }));
jest.mock("@/components/VariantSelector", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/LocaleLink", () => ({ __esModule: true, default: ({ href, children }: { href: string; children: ReactNode }) => createElement("a", { href }, children) }));
jest.mock("@/context/CartContext", () => ({ useCart: () => ({ addItem: jest.fn() }) }));
jest.mock("@/context/LanguageContext", () => ({ useLanguage: () => ({ language }) }));
jest.mock("@/hooks/use-locale-router", () => ({ useLocaleRouter: () => ({ push: jest.fn() }) }));

const base: Product = {
  id: "prod_1", slug: "whey", name: "Whey", shortName: "Whey", brand: "", category: "", description: "",
  price: 300, rating: 0, reviewCount: 0, image: "", stock: 5, inStock: true,
};
const render = (product: Partial<Product>) =>
  renderToString(createElement(ProductDetailClient, { product: { ...base, ...product }, similar: [] }));

beforeEach(() => { language = "en"; });

it("shows only real product facts, with no serving, form or delivery-threshold claims", () => {
  const html = render({ servings: 30, size: "2kg", flavor: "Vanilla" });
  expect(html).toContain("300 EGP");
  for (const invented of ["serving", "Capsules", "Powder", "See package", "Free over", "Authentic", "Lab data", "Daily Wellness"]) {
    expect(html).not.toContain(invented);
  }
});

it("shows the EDA number, and the approval badge only when approved", () => {
  const approved = render({ eda: { registrationNumber: "12345/2026", approved: true } });
  expect(approved).toContain("12345/2026");
  expect(approved).toContain("EDA approved");
  const pending = render({ eda: { registrationNumber: "999", approved: false } });
  expect(pending).toContain("999");
  expect(pending).not.toContain("EDA approved");
  expect(render({})).not.toContain("EDA registration");
});

it("does not sell a product without a price", () => {
  const html = render({ price: 0 });
  expect(html).toContain("Price unavailable");
  expect(html).not.toContain("0 EGP");
  expect(html).not.toMatch(/<button[^>]*class="buyNow"(?![^>]*disabled)/);
});

it("speaks Arabic on the Arabic store", () => {
  language = "ar";
  const html = render({ eda: { registrationNumber: "1", approved: true }, brand: "Optimum" });
  expect(html).toContain("معتمد من هيئة الدواء");
  expect(html).toContain("300 ج.م");
});

it.each(["en", "ar"] as const)("never displays a SKU in %s", (locale) => {
  language = locale;
  expect(render({ variants: [{ id: "v1", title: "Default", sku: "PRIVATE-SKU-123", price: 300, stock: 2, inStock: true }] })).not.toContain("PRIVATE-SKU-123");
});

it("does not inherit a different variant's comparison price", () => {
  const html = render({ compareAtPrice: 500, variants: [{ id: "v1", title: "Default", price: 300, stock: 2, inStock: true }] });
  expect(html).not.toContain("<s ");
  expect(html).not.toContain("500 EGP");
});

it("renders catalog HTML as escaped text, never executable elements", () => {
  const html = render({ description: '<img src=x onerror=alert(1)><script>alert(1)</script>' });
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img src=x");
});

it("keeps the selected variant unpriced even when the product has a price", () => {
  const html = render({ variants: [{ id: "v1", title: "Default", price: 0, stock: 3, inStock: true }] });
  expect(html).toContain("Price unavailable");
  expect(html).not.toContain("300 EGP");
});

it("uses the same unknown-inventory wording for stock and the disabled action", () => {
  const html = render({ inStock: false, inventoryKnown: false });
  expect(html).toContain("Availability unconfirmed");
  expect(html).not.toContain("Out of stock");
});

it("loads only below-fold related media lazily", () => {
  const html = renderToString(createElement(ProductDetailClient, {
    product: { ...base, image: "/main.jpg" },
    similar: [{ ...base, id: "related", image: "/related.jpg" }],
  }));
  expect(html).toMatch(/<img[^>]*loading="lazy"[^>]*decoding="async"[^>]*src="\/related.jpg"/);
  expect(html).not.toMatch(/<img[^>]*loading="lazy"[^>]*src="\/main.jpg"/);
});

it("renders availability only once, in the visible live region", () => {
  const html = render({ stock: 20 });
  expect(html.match(/In stock/g)).toHaveLength(1);
  expect(html).toMatch(/<p class="stock" role="status" aria-atomic="true">/);
});

it("opens on a purchasable native default variant when no real options are shown", () => {
  const html = render({ variants: [
    { id: "soldout", title: "Default", price: 300, stock: 0, inStock: false },
    { id: "available", title: "Default", price: 450, stock: 4, inStock: true },
  ] });
  expect(html).toContain("450 EGP");
  expect(html).not.toContain("300 EGP");
  expect(html).not.toContain("Out of stock");
});
