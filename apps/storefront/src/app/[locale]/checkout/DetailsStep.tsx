"use client";

import { ArrowRight, Truck } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { governorates } from "@/lib/egypt-address";
import styles from "./Checkout.module.css";
import type { CheckoutForm } from "./checkout-details";
import { useMoney } from "./use-money";

type Props = {
  form: CheckoutForm;
  phoneError: string;
  error: string;
  delivery: number;
  onChange: (key: keyof CheckoutForm, value: string) => void;
  onContinue: () => void;
};

// Step 1: contact, address and the delivery price.
export default function DetailsStep({ form, phoneError, error, delivery, onChange, onContinue }: Props) {
  const { msg } = useLanguage();
  const { deliveryPrice } = useMoney();
  const { customer, isLoading: customerLoading } = useAuth();
  const field = (key: keyof CheckoutForm) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => onChange(key, event.target.value),
  });
  return (
    <>
      <section className={styles.intro}>
        <div>
          <span>{msg("checkout.title")}</span>
          <h1>{msg("checkout.fast")}<br />{msg("checkout.simple")}</h1>
        </div>
        <p>{msg("checkout.intro")}</p>
      </section>

      <section className={styles.formCard}>
        <div className={styles.cardHeader}>
          <div>
            <span>{msg("checkout.step1")}</span>
            <h2>{msg("checkout.contactTitle")}</h2>
          </div>
          <small>{msg("checkout.contactHint")}</small>
        </div>

        {!customerLoading && !customer && (
          <p className={styles.signInHint}>
            <span>{msg("checkout.haveAccount")}</span>{" "}
            <Link href="/account/sign-in?next=/checkout">{msg("checkout.signInHint")}</Link>
          </p>
        )}

        <div className={styles.fields}>
          <label className={styles.fullField}>
            <span>{msg("checkout.fullName")}</span>
            <input type="text" autoComplete="name" placeholder={msg("checkout.namePlaceholder")} {...field("name")} />
          </label>
          <label>
            <span>{msg("checkout.phone")}</span>
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="01012345678" {...field("phone")} />
            {phoneError && <small className={styles.fieldError}>{phoneError}</small>}
          </label>
          <label>
            <span>{msg("checkout.email")}</span>
            <input type="email" autoComplete="email" placeholder="you@email.com" {...field("email")} />
          </label>
        </div>
      </section>

      <section className={styles.formCard}>
        <div className={styles.cardHeader}>
          <div>
            <span>{msg("checkout.step2")}</span>
            <h2>{msg("checkout.addressTitle")}</h2>
          </div>
          <small>{msg("checkout.addressHint")}</small>
        </div>

        <div className={styles.fields}>
          <label>
            <span>{msg("checkout.governorate")}</span>
            <select {...field("governorate")}>
              <option value="" disabled>{msg("checkout.selectGovernorate")}</option>
              {governorates.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
            </select>
          </label>
          <label>
            <span>{msg("checkout.area")}</span>
            <input type="text" autoComplete="address-level2" placeholder={msg("checkout.areaPlaceholder")} {...field("area")} />
          </label>
          <label className={styles.fullField}>
            <span>{msg("checkout.address")}</span>
            <input type="text" autoComplete="street-address" placeholder={msg("checkout.addressPlaceholder")} {...field("address")} />
          </label>
          <label className={styles.fullField}>
            <span>{msg("checkout.notes")}</span>
            <input type="text" placeholder={msg("checkout.notesPlaceholder")} {...field("notes")} />
          </label>
        </div>
      </section>

      <section className={`${styles.formCard} ${styles.deliveryCard}`}>
        <div className={styles.cardHeader}>
          <div>
            <span>{msg("checkout.delivery")}</span>
            <h2>{msg("checkout.standardTitle")}</h2>
          </div>
          <Truck size={22} strokeWidth={1.4} />
        </div>
        <div className={styles.deliveryMethod}>
          <div>
            <strong>{msg("checkout.standardName")}</strong>
            <span>{msg("checkout.acrossEgypt")}</span>
          </div>
          <strong>{deliveryPrice(delivery)}</strong>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button type="button" className={styles.primaryButton} onClick={onContinue}>
        {msg("checkout.continueToConfirm")}
        <ArrowRight size={16} strokeWidth={1.5} />
      </button>
    </>
  );
}
