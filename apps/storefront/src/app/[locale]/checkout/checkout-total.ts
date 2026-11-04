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

type CartTotals = { itemSubtotal?: number, shippingTotal?: number, discountTotal?: number, total?: number } | null | undefined;
type Line = { product: { price: number }, quantity: number };

// Medusa is authoritative for totals; the item sum is used only while the cart initializes.
export function orderTotals(cart: CartTotals, items: Line[], selectedDelivery?: { amount: number }) {
  const cartSubtotal = cart?.itemSubtotal ?? 0;
  const cartShippingTotal = cart?.shippingTotal ?? 0;
  const discountTotal = cart?.discountTotal ?? 0;
  const subtotal = cartSubtotal > 0 ? cartSubtotal : items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const delivery = selectedDelivery ? selectedDelivery.amount : cartShippingTotal;
  return {
    subtotal,
    discountTotal,
    delivery,
    total: checkoutTotal(cart?.total ?? 0, cartShippingTotal, subtotal, discountTotal, delivery),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
