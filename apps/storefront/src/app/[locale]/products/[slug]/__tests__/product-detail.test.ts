import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import ProductDetailClient from "../ProductDetailClient";
import type { Product } from "@/types/product";

let language: "en" | "ar" = "en";
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
