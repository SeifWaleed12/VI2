import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProductCard from "../ProductCard";
import { message, type Locale } from "@/lib/i18n";
let mockLocale: Locale = "en";
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: never }) =>
    createElement("a", { ...props, href }, children),
}));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));
jest.mock("../ProductCard.module.css", () => ({}));
jest.mock("@/context/CartContext", () => ({
  useCart: () => ({ addItem: jest.fn() }),
}));
jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: mockLocale,
    t: <T>(value: T) => value,
    msg: (key: Parameters<typeof message>[1]) => message(mockLocale, key),
  }),
}));
const product = {
  id: "real-product",
  slug: "real-product",
  name: "Native product name",
  shortName: "Native product name",
  brand: "Actual Brand",
  price: 123,
  stock: 12,
  inventoryKnown: true,
  inStock: true,
  rating: 0,
  reviewCount: 0,
} as never;
afterEach(() => {
  mockLocale = "en";
});
it.each(["en", "ar"] as const)(
  "renders product-card controls in %s before hydration while preserving catalog names and prices",
  (locale) => {
    mockLocale = locale;
    const html = renderToStaticMarkup(createElement(ProductCard, { product }));
    expect(html).toContain(message(locale, "product.noImage"));
    expect(html).toContain(message(locale, "product.add"));
    expect(html).toContain(message(locale, "product.view"));
    expect(html).toContain(locale === "ar" ? "متوفر" : "IN STOCK");
    expect(html).toContain(message(locale, "nav.egp"));
    expect(html).toContain("123");
    expect(html).toContain("Native product name");
    expect(html).toContain("Actual Brand");
    expect(html).toContain("data-no-translate");
  },
);
it("localizes unknown availability without pretending it is in stock", () => {
  mockLocale = "ar";
  const html = renderToStaticMarkup(
    createElement(ProductCard, {
      product: {
        ...(product as object),
        inventoryKnown: false,
        inStock: false,
      } as never,
    }),
  );
  expect(html).toContain("التوفر غير مؤكد");
  expect(html).not.toContain(">متوفر<");
});
