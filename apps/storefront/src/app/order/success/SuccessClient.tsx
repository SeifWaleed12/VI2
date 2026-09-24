"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

import styles from "./Success.module.css";
import { arabicUi } from "@/lib/arabicLocalization";

type StoredOrder = {
  reference?: string;
  total?: number;
  delivery?: number;
  paymentMethod?: string;
  orderStatus?: string;
  paymentStatus?: string;

  customer?: {
    name?: string;
    phone?: string;
    governorate?: string;
    area?: string;
    address?: string;
  };

  items?: Array<{
    name?: string;
    brand?: string;
    image?: string;
    price?: number;
    quantity?: number;
  }>;
};

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
  ).format(value);
}

function paymentLabel(
  value?: string,
) {
  if (
    value === "instapay"
  ) {
    return "InstaPay / Bank Transfer";
  }

  if (
    value === "card"
  ) {
    return "Debit / Credit Card";
  }

  return "Cash on Delivery";
}

export default function SuccessClient() {
  const searchParams =
    useSearchParams();

  const reference =
    searchParams.get("order") ||
    searchParams.get("ref") ||
    "VI2";

  const [
    order,
    setOrder,
  ] =
    useState<StoredOrder | null>(
      null,
    );

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          "vi2-last-order",
        );

      if (raw) {
        setOrder(
          JSON.parse(
            raw,
          ) as StoredOrder,
        );
      }
    } catch {
      setOrder(null);
    }
  }, []);

  const customerName =
    order?.customer?.name
      ?.trim()
      .split(/\s+/)[0] ??
    "";

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <strong>
          VI2
        </strong>

        <div
          className={
            styles.progress
          }
        >
          <span>
            01 DETAILS
          </span>

          <i />

          <span>
            02 CONFIRM
          </span>

          <i />

          <b>
            03 COMPLETE
          </b>
        </div>
      </header>

      <div
        className={
          styles.successBand
        }
      >
        <Check
          size={15}
          strokeWidth={
            1.6
          }
        />

        <span>
          ORDER RECEIVED
        </span>

        <strong>
          {reference}
        </strong>
      </div>

      <div
        className={
          styles.layout
        }
      >
        <section
          className={
            styles.main
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            STAGE 03 /
            COMPLETE
          </span>

          <h1>
            ORDER
            <br />
            RECEIVED.
          </h1>

          <h2
            data-arabic-text={`شكراً لك${customerName ? `، ${customerName}.` : "."}`}
          >
            THANK YOU
            {customerName
              ? `, ${customerName.toUpperCase()}.`
              : "."}
          </h2>

          <div
            className={
              styles.reference
            }
          >
            <span>
              ORDER
              REFERENCE
            </span>

            <strong>
              {
                reference
              }
            </strong>
          </div>

          <div
            className={
              styles.statusCard
            }
          >
            <div>
              <PackageCheck
                size={20}
                strokeWidth={
                  1.45
                }
              />

              <div>
                <strong>
                  ORDER
                  REGISTERED
                </strong>

                <span>
                  Your order
                  has been
                  saved and is
                  ready for
                  the next
                  fulfillment
                  step.
                </span>
              </div>
            </div>

            <div>
              <Truck
                size={20}
                strokeWidth={
                  1.45
                }
              />

              <div>
                <strong>
                  DELIVERY
                  ACROSS EGYPT
                </strong>

                <span>
                  We’ll use
                  the delivery
                  details you
                  entered at
                  checkout.
                </span>
              </div>
            </div>
          </div>

          {order && (
            <div
              className={
                styles.detailGrid
              }
            >
              <div>
                <span>
                  DESTINATION
                </span>

                <strong>
                  {order
                    .customer
                    ?.name ??
                    "Customer"}
                </strong>

                <p
                  data-arabic-text={`${order.customer?.area ?? ""}${order.customer?.governorate ? `، ${arabicUi[order.customer.governorate] ?? order.customer.governorate}` : ""}`}
                >
                  {order
                    .customer
                    ?.area}
                  {order
                    .customer
                    ?.governorate
                    ? `, ${order.customer.governorate}`
                    : ""}
                </p>
              </div>

              <div>
                <span>
                  CONTACT
                </span>

                <strong>
                  {order
                    .customer
                    ?.phone ??
                    "—"}
                </strong>

                <p>
                  We’ll use
                  this number
                  for order
                  updates.
                </p>
              </div>

              <div>
                <span>
                  PAYMENT
                </span>

                <strong>
                  {paymentLabel(
                    order.paymentMethod,
                  )}
                </strong>

                <p>
                  {order.paymentStatus ===
                  "pending"
                    ? "Payment pending"
                    : "Payment due according to selected method"}
                </p>
              </div>
            </div>
          )}

          <div
            className={
              styles.actions
            }
          >
            <Link
              href="/shop"
              className={
                styles.primary
              }
            >
              CONTINUE
              SHOPPING
              <ArrowRight
                size={16}
                strokeWidth={
                  1.5
                }
              />
            </Link>

            <Link
              href="/"
              className={
                styles.secondary
              }
            >
              BACK HOME
            </Link>
          </div>

          <div
            className={
              styles.secureNote
            }
          >
            <ShieldCheck
              size={14}
              strokeWidth={
                1.4
              }
            />

            <span>
              Keep your order
              reference for
              your records.
            </span>
          </div>
        </section>

        <aside
          className={
            styles.summary
          }
        >
          <span>
            RECEIPT SUMMARY
          </span>

          <h2>
            ORDER
            <br />
            SUMMARY
          </h2>

          {order?.items &&
            order.items
              .slice(
                0,
                3,
              )
              .map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={`${item.name}-${index}`}
                    className={
                      styles.item
                    }
                  >
                    <div>
                      {item.image ? (
                        <img
                          src={
                            item.image
                          }
                          alt={
                            item.name ??
                            ""
                          }
                        />
                      ) : null}
                    </div>

                    <section>
                      <span>
                        {
                          item.brand
                        }
                      </span>

                      <strong>
                        {
                          item.name
                        }
                      </strong>
                    </section>

                    <strong>
                      {formatPrice(
                        (item.price ??
                          0) *
                          (item.quantity ??
                            1),
                      )}{" "}
                      EGP
                    </strong>
                  </div>
                ),
              )}

          <div
            className={
              styles.total
            }
          >
            <span>
              TOTAL
            </span>

            <strong>
              {formatPrice(
                order?.total ??
                  0,
              )}{" "}
              EGP
            </strong>
          </div>

          <div
            className={
              styles.summaryNote
            }
          >
            <Truck
              size={17}
              strokeWidth={
                1.4
              }
            />

            <span>
              Delivery across
              Egypt.
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
