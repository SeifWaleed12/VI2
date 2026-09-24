import type { CartAddress, CartItem, ShippingMethod } from "./cart";

export type OrderStatus =
  | "pending"
  | "completed"
  | "canceled"
  | "archived"
  | "requires_action";

export type OrderPaymentStatus =
  | "not_paid"
  | "awaiting"
  | "captured"
  | "partially_refunded"
  | "refunded"
  | "canceled"
  | "requires_action";

export type Order = {
  id: string;
  displayId?: number;
  reference?: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currencyCode: string;
  email: string;
  items: CartItem[];
  shippingAddress?: CartAddress;
  shippingMethods?: ShippingMethod[];
  itemSubtotal: number;
  shippingTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
};
