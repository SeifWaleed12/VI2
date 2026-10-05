"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOrder } from "@/lib/medusa/services/orders";
import type { Order } from "@/types/order";
import styles from "./Success.module.css";

export default function SuccessClient() {
  const id = useSearchParams().get("order") || "";
  const [result, setResult] = useState<{ id: string; order: Order | null; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    try { window.localStorage.removeItem("vi2-last-order"); } catch { /* legacy cleanup */ }
    getOrder(id).then((order) => {
      if (active) setResult({ id, order });
    }).catch(() => {
      if (active) setResult({ id, order: null, error: "Order confirmation is temporarily unavailable. No payment outcome can be inferred from this error." });
    });
    return () => { active = false; };
  }, [id, attempt]);

  if (!result || result.id !== id) return <main className={styles.page}><p role="status">Checking your order with Medusa…</p></main>;
  if (!result.order) return <main className={styles.page}>
    <h1>Order not confirmed</h1>
    <p role="alert">{result.error || "No order could be verified from this link. Check the reference or contact support before placing another order."}</p>
    <button onClick={() => setAttempt((value) => value + 1)}>Retry confirmation</button>
    <Link href="/account">View your account</Link>
  </main>;

  const order = result.order;
  const money = (amount: number) => new Intl.NumberFormat("en-EG", { style: "currency", currency: order.currencyCode }).format(amount);
  return <main className={styles.page}>
    <header className={styles.header}><strong>VI2</strong><span>ORDER CONFIRMATION</span></header>
    <div className={styles.layout}>
      <section className={styles.main}>
        <h1>ORDER RECEIVED.</h1>
        <div className={styles.reference}><span>ORDER REFERENCE</span><strong>{order.displayId ?? order.id}</strong></div>
        <div className={styles.statusCard}>
          <p>Order status: {order.status}</p>
          <p>Payment status: {order.paymentStatus.replaceAll("_", " ")}</p>
        </div>
        <p>Keep this confirmation link private. It provides access to your order.</p>
        <Link href="/shop" className={styles.primary}>CONTINUE SHOPPING</Link>
      </section>
      <aside className={styles.summary}>
        <h2>ORDER SUMMARY</h2>
        {order.items.map((item) => <div key={item.id} className={styles.item}>
          <span>{item.name} × {item.quantity}</span><strong>{money(item.total)}</strong>
        </div>)}
        <div className={styles.total}><span>TOTAL</span><strong>{money(order.total)}</strong></div>
      </aside>
    </div>
  </main>;
}
