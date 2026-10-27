import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CartDrawer from "../CartDrawer";
import { message } from "@/lib/i18n";

let items: { id: string; quantity: number; product: { id: string; variantId: string; name: string; price: number; image: string } }[] = [];
let limits: Record<string, number> = {};
jest.mock("@/context/CartContext", () => ({ useCart: () => ({ items, isCartOpen: true, subtotal: 0, closeCart: jest.fn(), updateQuantity: jest.fn(), removeItem: jest.fn() }) }));
jest.mock("@/hooks/use-stock-limits", () => ({ useStockLimits: () => limits }));
jest.mock("@/hooks/use-drawer-focus", () => ({ useDrawerFocus: () => undefined }));
jest.mock("@/context/LanguageContext", () => ({
  LegacyTranslations: ({ children }: { children: ReactNode }) => children,
  useLanguage: () => ({ language: "en", msg: (key: Parameters<typeof message>[1]) => message("en", key) }),
}));
jest.mock("@/components/LocaleLink", () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => createElement("a", {}, children) }));
jest.mock("@/components/CatalogImage", () => ({ __esModule: true, default: () => null }));
jest.mock("lucide-react", () => new Proxy({}, { get: () => () => null }));

const line = (variantId: string, quantity: number) => ({ id: `line_${variantId}`, quantity, product: { id: `prod_${variantId}`, variantId, name: variantId, price: 100, image: "" } });
const increase = (html: string) => html.match(/<button[^>]*aria-label="Increase quantity"[^>]*>/g) ?? [];

it("stops + at the stock limit and says why, and leaves unlimited lines alone", () => {
  items = [line("at", 2), line("under", 1), line("free", 5)];
  limits = { at: 2, under: 3 };
  const html = renderToStaticMarkup(createElement(CartDrawer));
  const [at, under, free] = increase(html);
  expect(at).toContain("disabled");
  expect(under).not.toContain("disabled");
  expect(free).not.toContain("disabled");
  expect(html).toContain("Only 2 available.");
  expect(html.match(/Only \d+ available/g)).toHaveLength(1);
});

it("tells the shopper to lower or remove a line that stock no longer covers", () => {
  items = [line("over", 3), line("gone", 1)];
  limits = { over: 1, gone: 0 };
  const html = renderToStaticMarkup(createElement(CartDrawer));
  expect(html).toContain("Only 1 available now. Lower the quantity to check out.");
  expect(html).toContain("Sold out. Remove it to check out.");
});
