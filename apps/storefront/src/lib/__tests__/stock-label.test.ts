import { getStockLabel, isLowStock, LOW_STOCK_LIMIT } from "../catalogMeta";
import { message, type Locale, type MessageKey } from "../i18n";
import type { Product } from "@/types/product";

const product = (stock: number) => ({ stock, inStock: stock > 0, inventoryKnown: true }) as Product;
const label = (locale: Locale, stock: number) => getStockLabel(product(stock), (key: MessageKey) => message(locale, key));

it("names the Cairo warehouse only when stock is low", () => {
  expect(label("en", 3)).toBe("ONLY 3 LEFT IN CAIRO WAREHOUSE");
  expect(label("en", 9)).toBe("IN STOCK");
  expect(label("en", 0)).toBe("OUT OF STOCK");
});

it("shows the low-stock label in Arabic", () => {
  expect(label("ar", 3)).toBe("متبقي 3 فقط في مخزن القاهرة");
});

it("treats stock from 1 to the limit as low", () => {
  expect([0, 1, LOW_STOCK_LIMIT, LOW_STOCK_LIMIT + 1].map(isLowStock)).toEqual([false, true, true, false]);
});
