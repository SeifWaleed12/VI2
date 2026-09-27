import { medusa } from "../client";
import { initiatePaymentSession } from "./payment";

/**
 * Completes a Medusa cart checkout.
 *
 * Uses Medusa native store capabilities:
 * 1. Ensures payment session is active on the cart
 * 2. Invokes Medusa cart completion (completeCartWorkflow on backend)
 */
export async function completeCheckout(
  cartId: string,
  providerId = "pp_system_default",
): Promise<{ ok: true; orderId: string; order?: unknown } | { ok: false; error: string }> {
  try {
    // 1. Ensure payment session is active on the cart
    const paymentResult = await initiatePaymentSession(cartId, providerId);
    if (!paymentResult.ok) {
      return {
        ok: false,
        error: paymentResult.error || "Failed to initiate payment session.",
      };
    }

    // 2. Authoritative cart completion on Medusa backend
    const result = await medusa.store.cart.complete(cartId);

    if (result.type === "order" && result.order) {
      return { ok: true, orderId: result.order.id, order: result.order };
    }

    if (result.type === "cart" && result.error) {
      return {
        ok: false,
        error: result.error.message || "Failed to complete checkout in Medusa.",
      };
    }

    return { ok: true, orderId: cartId };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to complete order in Medusa.";
    return { ok: false, error: msg };
  }
}
