"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./Checkout.module.css";
import type { CheckoutForm } from "./checkout-details";
import { CHECKOUT_DISABLED } from "./prepare-order";
import type { useDeliveryOptions } from "./use-delivery-options";
import { useMoney } from "./use-money";

type Props = {
  form: CheckoutForm;
  deliveryOptions: ReturnType<typeof useDeliveryOptions>;
  total: number;
  error: string;
  submitting: boolean;
  recovering: boolean;
  onEdit: () => void;
  onPlaceOrder: () => void;
};

// Step 2: payment notice, order review and placing the order.
export default function ConfirmStep({ form, deliveryOptions, total, error, submitting, recovering, onEdit, onPlaceOrder }: Props) {
  const { msg, t } = useLanguage();
  const { money, deliveryPrice } = useMoney();
  const { options, selectedId, select, status, retry } = deliveryOptions;
  return (
    <>
      <section className={styles.confirmIntro}>
        <div className={styles.confirmKicker}>
          <span>{msg("checkout.step2")}</span>
          <i />
          <span>{msg("checkout.reviewKicker")}</span>
        </div>
        <h1>{msg("checkout.confirmTitle")}</h1>
        <p>{msg("checkout.confirmIntro")}</p>
      </section>

      <section className={styles.confirmSection}>
        <div className={styles.confirmSectionHeader}>
          <h2>{msg("checkout.paymentMethod")}</h2>
          <span>{msg("checkout.paymentAvailability")}</span>
        </div>
        <p role="status">{msg(CHECKOUT_DISABLED ? "checkout.unavailable" : "checkout.devProvider")}</p>
      </section>

      <section className={styles.confirmSection}>
        <div className={styles.confirmSectionHeader}>
          <h2>{msg("checkout.orderReview")}</h2>
          <span>{msg("checkout.verify")}</span>
        </div>

        <div className={styles.reviewGrid}>
          <div className={styles.reviewCard}>
            <span>{msg("checkout.addressTitle")}</span>
            <strong>{form.name}</strong>
            <p>{form.address}<br />{form.area}, {form.governorate}</p>
            <button type="button" onClick={onEdit}>{msg("checkout.edit")}</button>
          </div>

          <div className={styles.reviewCard}>
            <span>{msg("checkout.deliveryOption")}</span>
            {status === "ready" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {options.map((option) => (
                  <label
                    key={option.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      border: selectedId === option.id ? "1.5px solid #111" : "1px solid #e5e5e5",
                      background: selectedId === option.id ? "#fafafa" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input type="radio" name="shippingOption" checked={selectedId === option.id} onChange={() => select(option.id)} />
                      <span style={{ fontSize: "var(--text-body)", fontWeight: 600 }}>{t(option.name)}</span>
                    </div>
                    <strong style={{ fontSize: "var(--text-body)" }}>{deliveryPrice(option.amount)}</strong>
                  </label>
                ))}
              </div>
            ) : (
              <p role="status">
                {status === "loading" && msg("checkout.loadingDelivery")}
                {status === "empty" && msg("checkout.noDelivery")}
                {(status === "failed" || status === "no-cart") && (
                  <>
                    {msg(status === "failed" ? "checkout.deliveryFailed" : "checkout.cartFailed")}{" "}
                    <button type="button" onClick={retry} style={{ textDecoration: "underline", fontWeight: 600 }}>
                      {msg("checkout.tryAgain")}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          <div className={styles.reviewCard}>
            <span>{msg("checkout.payment")}</span>
            <strong>{msg("checkout.manualProvider")}</strong>
            <p>{msg("checkout.paymentByMedusa")}</p>
          </div>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button type="button" className={styles.primaryButton} disabled={submitting || (CHECKOUT_DISABLED && !recovering)} onClick={onPlaceOrder}>
        {submitting ? msg("checkout.placing") : recovering ? msg("checkout.retry") : `${msg("checkout.placeOrder")} · ${money(total)}`}
        {!submitting && <ArrowRight size={16} strokeWidth={1.5} />}
      </button>

      <div className={styles.secureFooter}>
        <ShieldCheck size={15} strokeWidth={1.4} />
        <span>{msg("checkout.secureFooter")}</span>
      </div>
    </>
  );
}
