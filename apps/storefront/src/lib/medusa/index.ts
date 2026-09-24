export * from "./client";
export * from "./services/products";
export * from "./services/categories";
export * from "./services/cart";
export * from "./services/customer";
export * from "./services/orders";
export * from "./services/shipping";
export * from "./services/payment";
export * from "./services/checkout";
export * from "./services/regions";
export * from "./services/brands";

import * as productService from "./services/products";
import * as categoryService from "./services/categories";
import * as cartService from "./services/cart";
import * as customerService from "./services/customer";
import * as orderService from "./services/orders";
import * as shippingService from "./services/shipping";
import * as paymentService from "./services/payment";
import * as checkoutService from "./services/checkout";
import * as regionService from "./services/regions";
import * as brandService from "./services/brands";

/**
 * Backward-compatible facade for legacy callers.
 * Direct function imports from `@/lib/medusa` are preferred.
 */
export const services = {
  products: productService,
  categories: categoryService,
  cart: cartService,
  customer: customerService,
  orders: orderService,
  shipping: shippingService,
  payment: paymentService,
  checkout: checkoutService,
  regions: regionService,
  brands: brandService,

  // Compatibility aliases for legacy service interfaces
  cartService: {
    getCart: cartService.getCart,
    createCart: cartService.createCart,
    addItem: cartService.addCartItem,
    updateItem: cartService.updateCartItem,
    removeItem: cartService.removeCartItem,
    setAddress: cartService.setCartAddress,
    setShippingMethod: cartService.setCartShippingMethod,
    applyPromotion: cartService.applyCartPromotion,
    removePromotion: cartService.removeCartPromotion,
    completeCart: checkoutService.completeCheckout,
  },
  authService: {
    signIn: customerService.loginCustomer,
    register: customerService.registerCustomer,
    signOut: customerService.logoutCustomer,
    getCurrentCustomer: customerService.getCustomer,
    isAuthenticated: () => false, // UI relies on customer state from CustomerProvider
  },
  shippingService: {
    getShippingOptionsForCart: shippingService.getShippingOptions,
  },
  orderService: {
    getCustomerOrders: orderService.getCustomerOrders,
    getOrder: orderService.getOrder,
  },
};
