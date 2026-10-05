export type ProductVariant = {
  id: string;
  title: string;
  sku?: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  inventoryKnown?: boolean;
  inStock?: boolean;
  options?: Record<string, string>; // e.g. { "Flavor": "Caramel", "Size": "2.27 KG" }
  image?: string;
};

export type ProductOption = {
  id: string;
  title: string;
  values: string[];
};

export type Product = {
  id: string;
  slug: string;

  // Medusa variant ID — used when adding to Medusa cart
  variantId?: string;

  brand: string;
  name: string;
  shortName: string;

  category: string;
  description: string;

  price: number;
  compareAtPrice?: number;

  rating: number;
  reviewCount: number;

  image: string;

  flavor?: string;
  size?: string;
  servings?: number;

  stock: number;
  inventoryKnown?: boolean;

  inStock?: boolean;
  badge?: string;

  options?: ProductOption[];
  variants?: ProductVariant[];
};
