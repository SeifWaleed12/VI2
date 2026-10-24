"use client";

import Link from "@/components/LocaleLink";
import { PackageCheck, Truck } from "lucide-react";
import type { Product } from "@/types/product";

import styles from "./Checkout.module.css";
import { formatPrice } from "./checkout-total";
import CatalogImage from "@/components/CatalogImage";
import PromoCode from "./PromoCode";

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
                    <CatalogImage src={item.product.image} alt={item.product.name} />

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

        <PromoCode />

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
            <div className={styles.discountLine}>
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
