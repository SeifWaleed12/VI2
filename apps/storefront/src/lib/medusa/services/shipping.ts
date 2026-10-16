import { medusa } from "../client";
import type { ShippingOption } from "@/types/shipping";

// Only Medusa's options for this cart. No made-up fallback: an option that
// does not exist in Medusa cannot be added to the cart, so showing one would
// offer a price the shopper can never order at. Failures throw to the caller.
export async function getShippingOptions(
  cartId: string,
): Promise<ShippingOption[]> {
  const response = await medusa.store.fulfillment.listCartOptions({
    cart_id: cartId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (response.shipping_options || []).map((opt: any) => ({
    id: opt.id,
    name: opt.name || "Delivery",
    amount: opt.amount ?? 0,
    isCalculatedPrice: opt.is_calculated_price,
    data: opt.data,
  }));
}
