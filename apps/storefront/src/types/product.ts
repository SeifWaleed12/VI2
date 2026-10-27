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
  // The most one cart may hold; unset when Medusa sets no limit (stock not
  // tracked, or backorders allowed). Medusa still refuses what it can't fulfil.
  maxQuantity?: number;
  options?: Record<string, string>; // e.g. { "Flavor": "Caramel", "Size": "2.27 KG" }
  image?: string;
};

export type ProductOption = {
  id: string;
  title: string;
  values: string[];
};

export type ProductCategoryRef = {
  id: string;
  name: string;
  handle: string;
};

// Registration with Egypt's Drug Authority; approval never blocks buying.
export type EdaRegistration = {
  registrationNumber: string;
  approved: boolean;
};

export type Product = {
  id: string;
  slug: string;

  // Medusa variant ID — used when adding to Medusa cart
  variantId?: string;

  brand: string;
  // Set only for an active brand, like `brand`.
  brandId?: string;
  name: string;
  shortName: string;

  category: string;
  categoryId?: string;
  // Every category the product is assigned to, as Medusa returns them.
  categories?: ProductCategoryRef[];
  description: string;

  price: number;
  compareAtPrice?: number;

  rating: number;
  reviewCount: number;

  image: string;
  // Every photo, the main one first; set only when there is more than one.
  images?: string[];

  flavor?: string;
  size?: string;
  servings?: number;

  stock: number;
  inventoryKnown?: boolean;

  inStock?: boolean;
  // The default variant's limit; see ProductVariant.maxQuantity.
  maxQuantity?: number;
  badge?: string;

  eda?: EdaRegistration;

  options?: ProductOption[];
  variants?: ProductVariant[];
};
