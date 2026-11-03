"use client";

import { useEffect, useState } from "react";
import { ArrowRight, PackageCheck } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useAuth } from "@/context/AuthContext";
import { getCustomerOrders } from "@/lib/medusa";
import { ACCOUNT_ROUTES } from "@/lib/account-navigation";
import { accountMessage, accountStatus } from "@/lib/account-copy";
import { accountAmount, accountDate } from "@/lib/account-format";
import type { Locale } from "@/lib/i18n";
import type { Order } from "@/types/order";
import styles from "./Account.module.css";

export function OrderList({
  orders,
  locale,
}: {
  orders: Order[];
  locale: Locale;
}) {
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  if (!orders.length)
    return (
      <section className={styles.emptyState}>
        <PackageCheck size={36} strokeWidth={1.5} aria-hidden="true" />
        <h2>{msg("ordersEmpty")}</h2>
        <p>{msg("ordersEmptyDescription")}</p>
        <Link href="/shop" className={styles.darkButton}>
          {msg("shop")}
        </Link>
      </section>
    );
  return (
    <>
      <p className={styles.description}>{msg("ordersLimit")}</p>
      <ul className={styles.ordersList}>
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={
                ACCOUNT_ROUTES.orders + "?order=" + encodeURIComponent(order.id)
              }
              className={styles.orderRow}
              aria-label={
                msg("viewOrder") +
                " " +
                (order.reference || order.displayId || order.id)
              }
            >
              <div>
                <strong>
                  {msg("order")}{" "}
                  <bdi>{order.reference || order.displayId || order.id}</bdi>
                </strong>
                <span>{accountDate(order.createdAt, locale)}</span>
              </div>
              <span className={styles.status}>
                {accountStatus(locale, order.status)}
              </span>
              <strong className={styles.amount}>
                <bdi>
                  {accountAmount(order.total, order.currencyCode, locale)}
                </bdi>
              </strong>
              <ArrowRight
                className={styles.taskArrow}
                size={20}
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function OrderDetail({
  order,
  locale,
}: {
  order: Order;
  locale: Locale;
}) {
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  return (
    <section className={styles.orderDetail}>
      <Link className={styles.textLink} href={ACCOUNT_ROUTES.orders}>
        {msg("backToOrders")}
      </Link>
      <h2>
        {msg("order")}{" "}
        <bdi>{order.reference || order.displayId || order.id}</bdi>
      </h2>
      <dl className={styles.orderFacts}>
        <div>
          <dt>{msg("placed")}</dt>
          <dd>{accountDate(order.createdAt, locale)}</dd>
        </div>
        <div>
          <dt>{msg("status")}</dt>
          <dd>{accountStatus(locale, order.status)}</dd>
        </div>
        <div>
          <dt>{msg("payment")}</dt>
          <dd>{accountStatus(locale, order.paymentStatus)}</dd>
        </div>
      </dl>
      <h3>{msg("items")}</h3>
      <ul className={styles.items}>
        {order.items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <p>
                {msg("quantity")}: {item.quantity}
              </p>
              <p>
                {msg("unitPrice")}:{" "}
                <bdi>
                  {accountAmount(item.price, order.currencyCode, locale)}
                </bdi>
              </p>
            </div>
            <div>
              <span>{msg("itemTotal")}</span>
              <strong>
                <bdi>
                  {accountAmount(item.total, order.currencyCode, locale)}
                </bdi>
              </strong>
            </div>
          </li>
        ))}
      </ul>
      <dl className={styles.totals}>
        {(
          [
            ["subtotal", order.itemSubtotal],
            ["shipping", order.shippingTotal],
            ["discount", order.discountTotal],
            ["tax", order.taxTotal],
            ["total", order.total],
          ] as const
        ).map(([key, amount]) => (
          <div key={key}>
            <dt>{msg(key)}</dt>
            <dd>
              <bdi>{accountAmount(amount, order.currencyCode, locale)}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AccountOrders({
  locale,
  selectedOrder,
}: {
  locale: Locale;
  selectedOrder: string;
}) {
  const { customer, isAuthenticated } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    owner: string;
    attempt: number;
    orders: Order[];
    error: boolean;
  } | null>(null);
  const customerId = isAuthenticated ? customer?.id : undefined;
  useEffect(() => {
    if (!customerId) return;
    let active = true;
    getCustomerOrders(20)
      .then((orders) => {
        if (active)
          setResult({ owner: customerId, attempt, orders, error: false });
      })
      .catch(() => {
        if (active)
          setResult({ owner: customerId, attempt, orders: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [customerId, attempt]);
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  if (!customerId) return null;
  if (!result || result.owner !== customerId || result.attempt !== attempt)
    return (
      <p className={styles.notice} role="status">
        {msg("ordersLoading")}
      </p>
    );
  if (result.error)
    return (
      <section className={styles.emptyState}>
        <h2 role="alert">{msg("ordersError")}</h2>
        <button
          type="button"
          className={styles.outlineButton}
          onClick={() => setAttempt((value) => value + 1)}
        >
          {msg("retry")}
        </button>
      </section>
    );
  if (selectedOrder) {
    const order = result.orders.find((item) => item.id === selectedOrder);
    return order ? (
      <OrderDetail order={order} locale={locale} />
    ) : (
      <section className={styles.emptyState}>
        <h2>{msg("orderMissing")}</h2>
        <p>{msg("orderMissingDescription")}</p>
        <Link href={ACCOUNT_ROUTES.orders} className={styles.outlineButton}>
          {msg("backToOrders")}
        </Link>
      </section>
    );
  }
  return <OrderList orders={result.orders} locale={locale} />;
}
