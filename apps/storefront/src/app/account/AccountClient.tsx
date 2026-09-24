"use client";

import Link from "next/link";
import {
  ArrowRight,
  PackageCheck,
  Plus,
  RotateCcw,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/lib/medusa";
import type { Order } from "@/types/order";

import styles from "./Account.module.css";

type StoredItem = {
  id?: string;
  slug?: string;
  name?: string;
  brand?: string;
  image?: string;
  price?: number;
  quantity?: number;
  variantId?: string;
};

type StoredOrder = {
  reference?: string;
  createdAt?: string;
  total?: number;
  subtotal?: number;
  delivery?: number;
  paymentMethod?: string;
  items?: StoredItem[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-EG").format(value);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AccountClient() {
  const { addItem } = useCart();

  const { customer, isAuthenticated, signOut } = useAuth();
  const [lastOrder, setLastOrder] = useState<StoredOrder | null>(null);
  const [medusaOrders, setMedusaOrders] = useState<Order[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("vi2-last-order");
      if (raw) setLastOrder(JSON.parse(raw) as StoredOrder);
    } catch {
      setLastOrder(null);
    }

    if (isAuthenticated) {
      services.orderService
        .getCustomerOrders()
        .then(setMedusaOrders)
        .catch(() => {});
    } else {
      setMedusaOrders([]);
    }
  }, [isAuthenticated]);

  const points = Math.floor(Number(lastOrder?.total ?? 0) / 10);

  // Derive reorder items from stored order items directly (no need to look up local products)
  const reorderItems = (lastOrder?.items ?? []).map((item) => ({
    product: {
      id: item.id ?? item.slug ?? "",
      slug: item.slug ?? "",
      variantId: item.variantId,
      brand: item.brand ?? "Vi2",
      name: item.name ?? "Product",
      shortName: item.name ?? "Product",
      category: "",
      description: "",
      price: item.price ?? 0,
      rating: 0,
      reviewCount: 0,
      image: item.image ?? "",
      stock: 99,
    } as Product,
    quantity: Math.max(1, Number(item.quantity) || 1),
  }));

  function handleSignOut() {
    signOut();
    setMedusaOrders([]);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span>VI2 ACCOUNT</span>

          <h1 data-arabic-text="عافيتك.">
            YOUR
            <br />
            WELLNESS.
          </h1>

          <p>
            {isAuthenticated && customer
              ? `Welcome back, ${customer.firstName}.`
              : "Accounts add points, order history, faster reordering and personalized benefits — while guest checkout stays available."}
          </p>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              style={{ marginTop: "1rem", textDecoration: "underline", cursor: "pointer", background: "none", border: "none", fontSize: "0.75rem", letterSpacing: "0.1em" }}
            >
              SIGN OUT
            </button>
          ) : (
            <Link href="/account/sign-in" style={{ marginTop: "1rem", display: "inline-block", textDecoration: "underline", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
              SIGN IN / CREATE ACCOUNT
            </Link>
          )}
        </div>

        <div className={styles.pointsCard}>
          <Sparkles
            size={24}
            strokeWidth={1.35}
          />

          <span>VI2 POINTS</span>

          <strong>
            {new Intl.NumberFormat("en-EG").format(points)}
          </strong>

          <p>
            Points preview based on eligible orders.
          </p>
        </div>
      </section>

      <section className={styles.quickGrid}>
        <div>
          <UserRound size={20} />
          <strong>ACCOUNT BENEFITS</strong>
          <span>Saved details, points and a faster return visit.</span>
        </div>

        <div>
          <PackageCheck size={20} />
          <strong>ORDER HISTORY</strong>
          <span>Keep purchases organized in one place.</span>
        </div>

        <div>
          <RotateCcw size={20} />
          <strong>BUY IT AGAIN</strong>
          <span>Reorder routine products with fewer steps.</span>
        </div>
      </section>

      {/* ── Last Order ─────────────────────────────────────────────── */}
      {lastOrder?.reference && (
        <section className={styles.reorder} style={{ paddingBottom: "1rem" }}>
          <div className={styles.sectionHeading}>
            <div>
              <span>LAST ORDER</span>
              <h2>{lastOrder.reference}</h2>
            </div>
            {lastOrder.createdAt && (
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                {formatDate(lastOrder.createdAt)}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", opacity: 0.7, flexWrap: "wrap", paddingTop: "0.5rem" }}>
            {lastOrder.items?.map((item, i) => (
              <span key={i}>
                {item.name} × {item.quantity}
              </span>
            ))}
          </div>

          {lastOrder.total !== undefined && (
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Total: <strong>{formatPrice(lastOrder.total)} EGP</strong>
              {lastOrder.paymentMethod && ` · ${lastOrder.paymentMethod.toUpperCase()}`}
            </p>
          )}
        </section>
      )}

      {/* ── Medusa Orders (logged-in) ───────────────────────────────── */}
      {isAuthenticated && medusaOrders.length > 0 && (
        <section className={styles.reorder}>
          <div className={styles.sectionHeading}>
            <div>
              <span>ORDER HISTORY</span>
              <h2>ALL ORDERS</h2>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {medusaOrders.map((order) => (
              <div key={order.id} style={{ padding: "0.75rem", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "4px" }}>
                <strong style={{ fontSize: "0.8rem" }}>{order.displayId ? `#${order.displayId}` : order.reference || order.id}</strong>
                <span style={{ marginLeft: "1rem", fontSize: "0.75rem", opacity: 0.6 }}>
                  {order.createdAt ? formatDate(order.createdAt) : ""}
                </span>
                <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  Status: {order.status} · {order.items?.length ?? 0} item(s) · {formatPrice(order.total)} EGP
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Buy It Again ───────────────────────────────────────────── */}
      <section className={styles.reorder}>
        <div className={styles.sectionHeading}>
          <div>
            <span>QUICK REPLENISH</span>
            <h2>BUY IT AGAIN</h2>
          </div>

          <Link href="/shop">
            SHOP ALL
            <ArrowRight size={16} />
          </Link>
        </div>

        {reorderItems.length > 0 ? (
          <div className={styles.reorderGrid}>
            {reorderItems.map(({ product, quantity }) => (
              <article
                key={product.id}
                className={styles.reorderCard}
              >
                {product.image ? (
                  <Link
                    href={`/products/${product.slug}`}
                    className={styles.imageArea}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </Link>
                ) : (
                  <Link href={`/products/${product.slug}`} className={styles.imageArea} />
                )}

                <div className={styles.reorderContent}>
                  <span>{product.brand}</span>
                  <h3>{product.shortName}</h3>

                  <div className={styles.reorderMeta}>
                    <span>LAST QTY: {quantity}</span>
                    <strong>{formatPrice(product.price)} EGP</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => addItem(product, quantity)}
                  >
                    <Plus size={16} />
                    ADD AGAIN
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.recommended}>
            <div className={styles.emptyOrder}>
              <span>NO ORDERS YET</span>
              <h3>YOUR NEXT ROUTINE STARTS HERE.</h3>
              <p>
                Once an order is placed, its products appear here for quick reordering.
              </p>
              <Link href="/shop" style={{ display: "inline-block", marginTop: "1rem", textDecoration: "underline", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
                SHOP NOW <ArrowRight size={14} style={{ display: "inline" }} />
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
