"use client";

import { ArrowLeft } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./Checkout.module.css";

type Props = { step: 1 | 2; onBackToDetails: () => void };

export default function CheckoutHeader({ step, onBackToDetails }: Props) {
  const { msg } = useLanguage();
  return (
    <header className={styles.checkoutHeader}>
      <Link
        href={step === 1 ? "/shop" : "#"}
        onClick={step === 2 ? (event) => { event.preventDefault(); onBackToDetails(); } : undefined}
        className={styles.backLink}
      >
        <ArrowLeft size={15} strokeWidth={1.5} />
        {step === 1 ? msg("checkout.back") : msg("checkout.details")}
      </Link>

      <div className={styles.checkoutBrand}>
        <strong>VI2</strong>
        <span>{msg("checkout.secure")}</span>
      </div>

      <div className={styles.progress} aria-label={msg("checkout.progress")}>
        <div className={step === 1 ? styles.progressActive : styles.progressDone}>
          <span>01</span>
          <strong>{msg("checkout.details")}</strong>
        </div>
        <i />
        <div className={step === 2 ? styles.progressActive : ""}>
          <span>02</span>
          <strong>{msg("checkout.confirm")}</strong>
        </div>
        <i />
        <div>
          <span>03</span>
          <strong>{msg("checkout.complete")}</strong>
        </div>
      </div>
    </header>
  );
}
