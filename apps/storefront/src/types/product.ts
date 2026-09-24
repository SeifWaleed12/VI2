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

  badge?: string;
};
