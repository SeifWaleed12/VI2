import type { Product } from "@/types/product";

// At or below this, the shop warns that stock is running out.
export const LOW_STOCK_LIMIT = 8;

export const isLowStock = (stock: number) => stock > 0 && stock <= LOW_STOCK_LIMIT;

export function getStockLabel(
  product: Product,
) {
  if (product.inventoryKnown === false) return product.inStock ? "AVAILABLE" : "AVAILABILITY UNCONFIRMED";
  if (product.stock <= 0) {
    return "OUT OF STOCK";
  }

  if (isLowStock(product.stock)) {
    return `ONLY ${product.stock} LEFT IN CAIRO WAREHOUSE`;
  }

  return "IN STOCK";
}
