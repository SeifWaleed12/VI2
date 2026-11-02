import type { MessageKey } from "@/lib/i18n";
import type { Product } from "@/types/product";

// At or below this, the shop warns that stock is running out.
export const LOW_STOCK_LIMIT = 8;

export const isLowStock = (stock: number) => stock > 0 && stock <= LOW_STOCK_LIMIT;

export function getStockLabel(product: Product, msg: (key: MessageKey) => string) {
  if (product.inventoryKnown === false) return msg(product.inStock ? "stock.available" : "stock.unconfirmed");
  if (product.stock <= 0) return msg("stock.out");
  if (isLowStock(product.stock)) return msg("stock.low").replace("{count}", String(product.stock));
  return msg("stock.in");
}
