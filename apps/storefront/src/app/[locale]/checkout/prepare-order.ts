import { addCartItem, createCart, setCartAddress, setCartShippingMethod } from "@/lib/medusa";
import { normalizeEgyptPhone } from "@/lib/egypt-address";
import type { CheckoutForm } from "./checkout-details";
import type { CheckoutItem } from "./OrderSummary";

// Remove this gate only when an approved production payment flow exists; the
// backend refuses production completion as well.
export const CHECKOUT_DISABLED = process.env.NODE_ENV === "production";

type OrderDraft = {
  cartId: string | null | undefined;
  items: CheckoutItem[];
  form: CheckoutForm;
  shippingOptionId: string;
};

// Puts the cart in the state Medusa needs to complete it, and returns its id.
export async function prepareOrder({ cartId, items, form, shippingOptionId }: OrderDraft) {
  let activeCartId = cartId;
  if (!activeCartId) {
    const created = await createCart();
    activeCartId = created.id;
    for (const item of items) {
      if (!item.product.variantId) throw new Error("Variant unavailable");
      await addCartItem(activeCartId, item.product.variantId, item.quantity);
    }
  }
  const [firstName, ...rest] = form.name.trim().split(/\s+/);
  await setCartAddress(activeCartId, form.email.trim(), {
    firstName, lastName: rest.join(" "),
    address1: `${form.area.trim()}, ${form.address.trim()}`,
    city: form.governorate, countryCode: "eg",
    phone: normalizeEgyptPhone(form.phone),
  });
  if (!shippingOptionId) throw new Error("Select a shipping method");
  await setCartShippingMethod(activeCartId, shippingOptionId);
  return activeCartId;
}
