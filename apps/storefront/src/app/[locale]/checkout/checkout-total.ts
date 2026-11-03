// Medusa's cart total includes delivery only once a delivery method is on the
// cart, so the delivery shown is swapped in for the cart's own.
export function checkoutTotal(cartTotal: number, cartShippingTotal: number, subtotal: number, discountTotal: number, delivery: number) {
  const beforeDelivery = cartTotal > 0 ? cartTotal - cartShippingTotal : subtotal - discountTotal;
  return Math.max(0, beforeDelivery + delivery);
}

export function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
  ).format(value);
}
