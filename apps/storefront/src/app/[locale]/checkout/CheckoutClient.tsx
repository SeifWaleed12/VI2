"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { pendingCartId } from "@/lib/pending-checkout";
import styles from "./Checkout.module.css";
import CheckoutHeader from "./CheckoutHeader";
import ConfirmStep from "./ConfirmStep";
import { detailsProblem, type CheckoutForm } from "./checkout-details";
import { orderTotals } from "./checkout-total";
import DetailsStep from "./DetailsStep";
import MobileOrderSummary from "./MobileOrderSummary";
import OrderSummary from "./OrderSummary";
import { useCheckoutDetails } from "./use-checkout-details";
import { useDeliveryOptions } from "./use-delivery-options";
import { useMoney } from "./use-money";
import { useOrderPlacement } from "./use-order-placement";

export default function CheckoutClient() {
  const { msg } = useLanguage();
  const { money } = useMoney();
  const { items, cart } = useCart();
  const deliveryOptions = useDeliveryOptions();
  const { form, setField } = useCheckoutDetails();
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneError, setPhoneError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const { subtotal, discountTotal, delivery, total, itemCount } = orderTotals(cart, items, deliveryOptions.selected);

  const order = useOrderPlacement({
    items,
    form,
    shippingOptionId: deliveryOptions.selectedId,
    detailsAreValid,
    onInvalidDetails: () => { setStep(1); scrollToTop(); },
  });

  function detailsAreValid() {
    order.clearError();
    setPhoneError("");
    const problem = detailsProblem(form, items.length);
    if (problem === "bad_phone") setPhoneError(msg("checkout.badPhone"));
    else if (problem) order.showError(msg(problem === "empty_order" ? "checkout.emptyOrder" : "checkout.incomplete"));
    return !problem;
  }

  // Resume a submitted-but-unconfirmed checkout. Runs after hydration because
  // sessionStorage is unavailable during server render.
  useEffect(() => {
    if (!pendingCartId()) return;
    order.resume();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage exists only after hydration
    setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on arrival
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    topRef.current?.focus({ preventScroll: true });
  }

  function updateField(key: keyof CheckoutForm, value: string) {
    setField(key, value);
    if (key === "phone") setPhoneError("");
    order.clearError();
  }

  function continueToConfirm() {
    if (!detailsAreValid()) return;
    setStep(2);
    scrollToTop();
  }

  function returnToDetails() {
    setStep(1);
    order.clearError();
    scrollToTop();
  }

  return (
    <>
      <main className={styles.page}>
        <div ref={topRef} tabIndex={-1} className={styles.topAnchor} />
        <CheckoutHeader step={step} onBackToDetails={returnToDetails} />
        <MobileOrderSummary items={items} itemCount={itemCount} discountTotal={discountTotal} delivery={delivery} total={total} />

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {step === 1 ? (
              <DetailsStep form={form} phoneError={phoneError} error={order.error} delivery={delivery} onChange={updateField} onContinue={continueToConfirm} />
            ) : (
              <ConfirmStep
                form={form}
                deliveryOptions={deliveryOptions}
                total={total}
                error={order.error}
                submitting={order.submitting}
                recovering={order.recovering}
                onEdit={returnToDetails}
                onPlaceOrder={order.placeOrder}
              />
            )}
          </div>
          <OrderSummary items={items} subtotal={subtotal} discountTotal={discountTotal} delivery={delivery} total={total} />
        </div>
      </main>

      <div className={styles.mobileAction}>
        <div>
          <span>{msg("checkout.total")}</span>
          <strong>{money(total)}</strong>
        </div>
        <button
          type="button"
          disabled={order.submitting || (!order.recovering && items.length === 0)}
          onClick={step === 1 ? continueToConfirm : order.placeOrder}
        >
          {order.submitting ? msg("checkout.placingShort")
            : step === 1 ? msg("checkout.continue")
            : order.recovering ? msg("checkout.retry") : msg("checkout.placeOrder")}
        </button>
      </div>
    </>
  );
}
