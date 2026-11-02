"use client";

import Link from "@/components/LocaleLink";
import { PackageCheck, Truck } from "lucide-react";
import type { Product } from "@/types/product";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./Checkout.module.css";
import CatalogImage from "@/components/CatalogImage";
import PromoCode from "./PromoCode";
import { useMoney } from "./use-money";

export type CheckoutItem = {
  product: Product;
  quantity: number;
};

type Props = {
  items: CheckoutItem[];
  subtotal: number;
  discountTotal: number;
  delivery: number;
  total: number;
};

// The desktop order summary: items, promo code and totals.
export default function OrderSummary({ items, subtotal, discountTotal, delivery, total }: Props) {
  const { msg } = useLanguage();
  const { money, deliveryPrice } = useMoney();
  return (
    <aside className={styles.summary}>
      <div className={styles.summaryInner}>
        <span className={styles.summaryEyebrow}>{msg("checkout.summary")}</span>
        <h2>{msg("checkout.orderWord")}<br />{msg("checkout.summaryWord")}</h2>

        <div className={styles.orderItems}>
          {items.length === 0 ? (
            <div className={styles.emptyOrder}>
              <PackageCheck size={26} strokeWidth={1.3} />
              <p>{msg("checkout.empty")}</p>
              <Link href="/shop">{msg("checkout.returnToShop")}</Link>
            </div>
          ) : (
            items.map((item) => (
              <article key={item.product.id} className={styles.orderItem}>
                <div className={styles.orderImage}>
                  <CatalogImage src={item.product.image} alt={item.product.name} />
                  <span>{item.quantity}</span>
                </div>
                <div className={styles.orderItemInfo}>
                  <span>{item.product.brand}</span>
                  <strong>{item.product.shortName}</strong>
                  <small>{item.product.size}</small>
                </div>
                <strong className={styles.orderItemPrice}>{money(item.product.price * item.quantity)}</strong>
              </article>
            ))
          )}
        </div>

        <PromoCode />

        <div className={styles.totals}>
          <div>
            <span>{msg("checkout.subtotal")}</span>
            <strong>{money(subtotal)}</strong>
          </div>
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
          <div className={styles.grandTotal}>
            <span>{msg("checkout.total")}</span>
            <strong>{money(total)}</strong>
          </div>
        </div>

        <div className={styles.deliveryNote}>
          <Truck size={18} strokeWidth={1.4} />
          <span>{msg("checkout.acrossEgyptNote")}</span>
        </div>
      </div>
    </aside>
  );
}
