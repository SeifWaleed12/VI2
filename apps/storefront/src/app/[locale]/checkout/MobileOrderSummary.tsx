"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./Checkout.module.css";
import type { CheckoutItem } from "./OrderSummary";
import PromoCode from "./PromoCode";
import { useMoney } from "./use-money";

type Props = {
  items: CheckoutItem[];
  itemCount: number;
  discountTotal: number;
  delivery: number;
  total: number;
};

export default function MobileOrderSummary({ items, itemCount, discountTotal, delivery, total }: Props) {
  const { msg, t } = useLanguage();
  const { money, deliveryPrice } = useMoney();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.mobileSummary}>
      <button type="button" onClick={() => setOpen((current) => !current)}>
        <div>
          <span>{msg("checkout.summary")}</span>
          <strong>{itemCount} {msg(itemCount === 1 ? "checkout.item" : "checkout.items")}</strong>
        </div>
        <div>
          <strong>{money(total)}</strong>
          <ChevronDown size={17} className={open ? styles.summaryChevronOpen : ""} />
        </div>
      </button>

      <div className={styles.mobilePromo}>
        <PromoCode collapsible />
      </div>

      {open && (
        <div className={styles.mobileSummaryBody}>
          {items.map((item) => (
            <div key={item.product.id} className={styles.mobileOrderItem}>
              <div className={styles.mobileImage}>
                <CatalogImage src={item.product.image} alt={item.product.name} />
                <span>{item.quantity}</span>
              </div>
              <div>
                <span>{t(item.product.brand)}</span>
                <strong>{t(item.product.shortName)}</strong>
                <small>{money(item.product.price * item.quantity)}</small>
              </div>
            </div>
          ))}

          <div className={styles.mobileTotals}>
            {discountTotal > 0 && (
              <div className={styles.discountLine}>
                <span>{msg("checkout.discount")}</span>
                <strong>-{money(discountTotal)}</strong>
              </div>
            )}
            <div>
              <span>{msg("checkout.delivery")}</span>
              <strong>{deliveryPrice(delivery)}</strong>
            </div>
            <div>
              <span>{msg("checkout.total")}</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
