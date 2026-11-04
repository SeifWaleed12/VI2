"use client";
import { useLanguage } from "@/context/LanguageContext";

import Link from "@/components/LocaleLink";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOrder } from "@/lib/medusa/services/orders";
import type { Order } from "@/types/order";
import styles from "./Success.module.css";

export default function SuccessClient() {
  const { msg } = useLanguage();
  const id = useSearchParams().get("order") || "";
  const [result, setResult] = useState<{ id: string; order: Order | null; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    try { window.localStorage.removeItem("vi2-last-order"); } catch { /* legacy cleanup */ }
    getOrder(id).then((order) => {
      if (active) setResult({ id, order });
    }).catch(() => {
      if (active) setResult({ id, order: null, error: msg("order.confirmUnavailable") });
    });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the message only changes with a full page load
  }, [id, attempt]);

  if (!result || result.id !== id) return <main className={styles.page}><p role="status">{msg("order.checkingYourOrderWithMedusa")}</p></main>;
  if (!result.order) return <main className={styles.page}>
    <h1>{msg("order.orderNotConfirmed")}</h1>
    <p role="alert">{result.error || msg("order.notVerified")}</p>
    <button onClick={() => setAttempt((value) => value + 1)}>{msg("order.retryConfirmation")}</button>
    <Link href="/account">{msg("order.viewYourAccount")}</Link>
  </main>;

  const order = result.order;
  const money = (amount: number) => new Intl.NumberFormat("en-EG", { style: "currency", currency: order.currencyCode }).format(amount);
  return <main className={styles.page}>
    <header className={styles.header}><strong>VI2</strong><span>{msg("order.orderConfirmation")}</span></header>
    <div className={styles.layout}>
      <section className={styles.main}>
        <h1>{msg("order.orderReceived")}</h1>
        <div className={styles.reference}><span>{msg("order.orderReference")}</span><strong>{order.displayId ?? order.id}</strong></div>
        <div className={styles.statusCard}>
          <p>{msg("order.orderStatus")}{" "}{order.status}</p>
          <p>{msg("order.paymentStatus")}{" "}{order.paymentStatus.replaceAll("_", " ")}</p>
        </div>
        <p>{msg("order.keepThisConfirmationLinkPrivate")}</p>
        <Link href="/shop" className={styles.primary}>{msg("order.continueShopping")}</Link>
      </section>
      <aside className={styles.summary}>
        <h2>{msg("order.orderSummary")}</h2>
        {order.items.map((item) => <div key={item.id} className={styles.item}>
          <span>{item.name} × {item.quantity}</span><strong>{money(item.total)}</strong>
        </div>)}
        <div className={styles.total}><span>{msg("order.total")}</span><strong>{money(order.total)}</strong></div>
      </aside>
    </div>
  </main>;
}
