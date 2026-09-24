import type { Product } from "@/types/product";

export type CartAddress = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  countryCode: string;
  postalCode?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
};

export type CartItem = {
  id: string; // Line item ID
  productId: string;
  variantId: string;
  name: string;
  brand?: string;
  image?: string;
  slug?: string;
  price: number; // Unit price in major currency (e.g. EGP)
  quantity: number;
  total: number;
  product?: Product;
};

export type CartPromotion = {
  id?: string;
  code: string;
  isAutomatic?: boolean;
};

export type ShippingMethod = {
  id: string;
  shippingOptionId: string;
  name: string;
  amount: number;
};

export type Cart = {
  id: string;
  regionId: string;
  currencyCode: string;
  email?: string;
  customerId?: string;
  items: CartItem[];
  shippingAddress?: CartAddress;
  billingAddress?: CartAddress;
  shippingMethods: ShippingMethod[];
  promotions: CartPromotion[];
  itemSubtotal: number;
  shippingTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
};
