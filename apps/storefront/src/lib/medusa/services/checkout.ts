import { medusa } from "../client";
import { initiatePaymentSession } from "./payment";

export type CheckoutResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string; unknown: boolean };
const pending = "We could not confirm your order. Payment status may be unknown. Retry confirmation for this cart; do not start another checkout.";

// Recovery reuses Medusa's cart completion workflow and the same cart.
export async function completeCheckout(cartId: string, resume = false): Promise<CheckoutResult> {
  try {
    if (!resume) {
      if (process.env.NODE_ENV === "production") {
        return { ok: false, unknown: false, error: "Checkout is unavailable until payment methods are configured." };
      }
      const payment = await initiatePaymentSession(cartId, "pp_system_default");
      if (!payment.ok) return { ok: false, unknown: true, error: pending };
    }
    const result = await medusa.store.cart.complete(cartId);
    if (result.type === "order" && typeof result.order?.id === "string" && result.order.id.startsWith("order_")) {
      return { ok: true, orderId: result.order.id };
    }
    if (result.type === "cart" && result.error) {
      return { ok: false, unknown: false, error: "Checkout was not completed. Review your cart, delivery details, and payment status before trying again." };
    }
    return { ok: false, unknown: true, error: pending };
  } catch {
    return { ok: false, unknown: true, error: pending };
  }
}
