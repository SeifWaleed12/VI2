"use client";

import { useEffect, useReducer, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { completeCheckout } from "@/lib/medusa";
import { forgetDetails, forgetPendingCart, pendingCartId, rememberPendingCart } from "@/lib/pending-checkout";
import type { CheckoutForm } from "./checkout-details";
import type { CheckoutItem } from "./OrderSummary";
import { initialSubmission, submissionReducer } from "./order-submission";
import { CHECKOUT_DISABLED, prepareOrder } from "./prepare-order";

type Order = {
  items: CheckoutItem[];
  form: CheckoutForm;
  shippingOptionId: string;
  // False sends the customer back to fix their details.
  detailsAreValid: () => boolean;
  onInvalidDetails: () => void;
};

export function useOrderPlacement({ items, form, shippingOptionId, detailsAreValid, onInvalidDetails }: Order) {
  const router = useLocaleRouter();
  const { msg, t } = useLanguage();
  const { cartId, clearCart } = useCart();
  const [submission, dispatch] = useReducer(submissionReducer, initialSubmission);
  const submissionLock = useRef(false);

  // Sign-out removes the pending checkout and its details.
  useEffect(() => {
    const onSignedOut = () => dispatch({ type: "abandoned" });
    window.addEventListener("vi2-signed-out", onSignedOut);
    return () => window.removeEventListener("vi2-signed-out", onSignedOut);
  }, []);

  // A confirmed cart change drops the pending retry (cart provider); show
  // "Place order" again instead of offering a retry that no longer exists.
  useEffect(() => {
    if (submission.recovering && !pendingCartId()) dispatch({ type: "abandoned" });
  }, [items, submission.recovering]);

  async function placeOrder() {
    if (submissionLock.current) return;
    const recoveryId = pendingCartId();
    if (!recoveryId && !detailsAreValid()) return onInvalidDetails();
    submissionLock.current = true;
    dispatch({ type: "started" });
    let completionAttempted = false;
    try {
      let activeCartId = recoveryId || cartId;
      if (!recoveryId) {
        if (CHECKOUT_DISABLED) return dispatch({ type: "failed", error: msg("checkout.unavailable") });
        activeCartId = await prepareOrder({ cartId, items, form, shippingOptionId });
        // Store only the cart capability before completion, for refresh recovery.
        rememberPendingCart(activeCartId);
        dispatch({ type: "completion_pending" });
      }
      if (!activeCartId) throw new Error("Cart unavailable");
      completionAttempted = true;
      const completion = await completeCheckout(activeCartId, Boolean(recoveryId));
      if (!completion.ok) {
        if (!completion.unknown) forgetPendingCart();
        return dispatch({ type: "refused", error: t(completion.error), retryable: completion.unknown });
      }
      forgetPendingCart();
      forgetDetails();
      try { window.localStorage.removeItem("vi2-last-order"); } catch { /* confirmed order remains authoritative */ }
      // The order exists in Medusa now. A local cart-reset failure must not be
      // reported as a checkout failure, or the customer may order twice.
      await clearCart().catch(() => {});
      router.push(`/order/success?order=${encodeURIComponent(completion.orderId)}`);
    } catch {
      dispatch({ type: "failed", error: msg(completionAttempted ? "checkout.confirmFailed" : "checkout.prepareFailed") });
    } finally {
      submissionLock.current = false;
      dispatch({ type: "finished" });
    }
  }

  return {
    ...submission,
    placeOrder,
    resume: () => dispatch({ type: "resumed" }),
    showError: (error: string) => dispatch({ type: "failed", error }),
    clearError: () => dispatch({ type: "error_cleared" }),
  };
}
