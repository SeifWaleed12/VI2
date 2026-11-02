import { translateArabicUi } from "../arabicLocalization";
import { getStockLabel, isLowStock, LOW_STOCK_LIMIT } from "../catalogMeta";
import type { Product } from "@/types/product";

const product = (stock: number) => ({ stock, inStock: stock > 0, inventoryKnown: true }) as Product;

it("names the Cairo warehouse only when stock is low", () => {
  expect(getStockLabel(product(3))).toBe("ONLY 3 LEFT IN CAIRO WAREHOUSE");
  expect(getStockLabel(product(9))).toBe("IN STOCK");
  expect(getStockLabel(product(0))).toBe("OUT OF STOCK");
});

it("shows the low-stock label in Arabic", () => {
  expect(translateArabicUi(getStockLabel(product(3)))).toBe("متبقي 3 فقط في مخزن القاهرة");
});

it("treats stock from 1 to the limit as low", () => {
  expect([0, 1, LOW_STOCK_LIMIT, LOW_STOCK_LIMIT + 1].map(isLowStock)).toEqual([false, true, true, false]);
});
