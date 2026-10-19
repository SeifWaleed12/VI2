"use client";

import Link from "@/components/LocaleLink";
import { PackageCheck, Truck } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";

import styles from "./Checkout.module.css";
import { formatPrice } from "./checkout-total";

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
  const { promotions, applyPromotion, removePromotion } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  return (
    <aside
      className={
        styles.summary
      }
    >
      <div
        className={
          styles.summaryInner
        }
      >
        <span
          className={
            styles.summaryEyebrow
          }
        >
          ORDER SUMMARY
        </span>

        <h2>
          ORDER
          <br />
          SUMMARY
        </h2>

        <div
          className={
            styles.orderItems
          }
        >
          {items.length ===
          0 ? (
            <div
              className={
                styles.emptyOrder
              }
            >
              <PackageCheck
                size={26}
                strokeWidth={
                  1.3
                }
              />

              <p>
                Your order is
                empty.
              </p>

              <Link href="/shop">
                RETURN TO SHOP
              </Link>
            </div>
          ) : (
            items.map(
              (
                item,
              ) => (
                <article
                  key={
                    item.product.id
                  }
                  className={
                    styles.orderItem
                  }
                >
                  <div
                    className={
                      styles.orderImage
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- catalog images come from any configured host */}
                    <img
                      src={
                        item.product.image
                      }
                      alt={
                        item.product.name
                      }
                    />

                    <span>
                      {
                        item.quantity
                      }
                    </span>
                  </div>

                  <div
                    className={
                      styles.orderItemInfo
                    }
                  >
                    <span>
                      {
                        item.product.brand
                      }
                    </span>

                    <strong>
                      {
                        item.product.shortName
                      }
                    </strong>

                    <small>
                      {
                        item.product.size
                      }
                    </small>
                  </div>

                  <strong
                    className={
                      styles.orderItemPrice
                    }
                  >
                    {formatPrice(
                      item.product.price *
                        item.quantity,
                    )}{" "}
                    EGP
                  </strong>
                </article>
              ),
            )
          )}
        </div>

        {/* PROMO / DISCOUNT CODE BOX */}
        <div style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5", margin: "16px 0" }}>
          <span style={{ fontSize: "var(--text-ui)", fontWeight: 800, letterSpacing: "var(--tracking-ui)", display: "block", marginBottom: "8px", color: "#666" }}>
            PROMO CODE
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="ENTER CODE"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              style={{ flex: 1, padding: "8px 10px", border: "1px solid #ccc", fontSize: "var(--text-body)", textTransform: "uppercase" }}
            />
            <button
              type="button"
              disabled={promoLoading || !promoInput.trim()}
              onClick={async () => {
                if (!promoInput.trim()) return;
                setPromoLoading(true);
                setPromoMsg(null);
                const res = await applyPromotion(promoInput.trim());
                setPromoLoading(false);
                if (res.ok) {
                  setPromoMsg({ type: "success", text: "Promotion applied!" });
                  setPromoInput("");
                } else {
                  setPromoMsg({ type: "error", text: res.message || "Invalid promotion code." });
                }
              }}
              style={{ padding: "8px 14px", background: "#111", color: "#fff", border: "none", fontSize: "var(--text-ui)", fontWeight: 800, cursor: "pointer" }}
            >
              {promoLoading ? "..." : "APPLY"}
            </button>
          </div>
          {promoMsg && (
            <p style={{ fontSize: "var(--text-ui)", marginTop: "6px", color: promoMsg.type === "success" ? "#16a34a" : "#dc2626" }}>
              {promoMsg.text}
            </p>
          )}
          {promotions.map((p) => (
            <div key={p.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "var(--text-body)", background: "#f5f5f5", padding: "6px 10px" }}>
              <span>🎟️ <strong>{p.code}</strong></span>
              <button
                type="button"
                onClick={() => removePromotion(p.code)}
                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "var(--text-ui)", fontWeight: 700 }}
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>

        <div
          className={
            styles.totals
          }
        >
          <div>
            <span>
              Subtotal
            </span>

            <strong>
              {formatPrice(
                subtotal,
              )}{" "}
              EGP
            </strong>
          </div>

          {discountTotal > 0 && (
            <div style={{ color: "#16a34a" }}>
              <span>
                Discount
              </span>

              <strong>
                -{formatPrice(
                  discountTotal,
                )}{" "}
                EGP
              </strong>
            </div>
          )}

          <div>
            <span>
              Delivery
            </span>

            <strong>
              {delivery ===
              0
                ? "FREE"
                : `${formatPrice(
                    delivery,
                  )} EGP`}
            </strong>
          </div>

          <div
            className={
              styles.grandTotal
            }
          >
            <span>
              TOTAL
            </span>

            <strong>
              {formatPrice(
                total,
              )}{" "}
              EGP
            </strong>
          </div>
        </div>

        <div
          className={
            styles.deliveryNote
          }
        >
          <Truck
            size={18}
            strokeWidth={
              1.4
            }
          />

          <span>
            Delivery across
            Egypt.
          </span>
        </div>
      </div>
    </aside>
  );
}
