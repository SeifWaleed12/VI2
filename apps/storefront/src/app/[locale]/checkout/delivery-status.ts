export type ShippingLoad = "loading" | "loaded" | "failed";
export type DeliveryStatus = "loading" | "no-cart" | "failed" | "empty" | "ready";

// Options need a cart. Without one, the shopper must retry loading the cart,
// not the options; an empty answer from Medusa is not a failed request.
export function deliveryStatus(cartId: string | null, cartLoading: boolean, load: ShippingLoad, optionCount: number): DeliveryStatus {
  if (!cartId) return cartLoading ? "loading" : "no-cart";
  if (load === "loading") return "loading";
  if (load === "failed") return "failed";
  return optionCount > 0 ? "ready" : "empty";
}
