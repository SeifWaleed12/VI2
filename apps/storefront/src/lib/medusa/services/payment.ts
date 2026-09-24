import { medusa } from "../client";
import { CART_FIELDS } from "./cart";

export async function initiatePaymentSession(
  cartId: string,
  providerId = "pp_system_default",
) {
  try {
    const { cart } = await medusa.store.cart.retrieve(cartId, {
      fields: CART_FIELDS,
    });

    const paymentCollection =
      await medusa.store.payment.initiatePaymentSession(cart, {
        provider_id: providerId,
      });

    return { ok: true as const, paymentCollection };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to initiate payment session";
    return { ok: false as const, error: message };
  }
}
