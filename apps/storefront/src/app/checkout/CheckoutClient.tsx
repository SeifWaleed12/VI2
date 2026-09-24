"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  PackageCheck,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useCart } from "@/context/CartContext";
import {
  getShippingOptions,
  getProductByHandle,
  setCartAddress,
  setCartShippingMethod,
  completeCheckout,
  createCart,
  addCartItem,
} from "@/lib/medusa";
import type { ShippingOption } from "@/types/shipping";
import type { Product } from "@/types/product";

import styles from "./Checkout.module.css";

type CheckoutItem = {
  product: Product;
  quantity: number;
};

type PaymentMethod =
  | "cod"
  | "card"
  | "instapay";

type CheckoutStep =
  | 1
  | 2;

type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  governorate: string;
  area: string;
  address: string;
  notes: string;
};

const governorates = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Qalyubia",
  "Sharqia",
  "Dakahlia",
  "Gharbia",
  "Monufia",
  "Beheira",
  "Fayoum",
  "Beni Suef",
  "Minya",
  "Assiut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea",
  "Suez",
  "Ismailia",
  "Port Said",
];

const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  governorate: "",
  area: "",
  address: "",
  notes: "",
};

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
  ).format(value);
}

function normalizeEgyptPhone(
  value: string,
) {
  return value.replace(
    /[\s\-()]/g,
    "",
  );
}

function isValidEgyptPhone(
  value: string,
) {
  const phone =
    normalizeEgyptPhone(value);

  return (
    /^01[0125]\d{8}$/.test(phone) ||
    /^\+201[0125]\d{8}$/.test(phone) ||
    /^00201[0125]\d{8}$/.test(phone)
  );
}

function getPaymentLabel(
  value: PaymentMethod,
) {
  if (value === "instapay") {
    return "InstaPay / Bank Transfer";
  }

  if (value === "card") {
    return "Debit / Credit Card";
  }

  return "Cash on Delivery";
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const topRef =
    useRef<HTMLDivElement>(null);

  const {
    items,
    clearCart,
    cartId,
    cart,
    promotions,
    applyPromotion,
    removePromotion,
  } = useCart();

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string>("");
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    if (!cartId) return;
    getShippingOptions(cartId)
      .then((opts) => {
        setShippingOptions(opts);
        if (opts.length > 0) {
          setSelectedShippingOptionId((prev) => prev || opts[0].id);
        }
      })
      .catch(() => {});
  }, [cartId]);

  const buyNowSlug =
    searchParams.get("buyNow");

  const requestedQuantity =
    Number(
      searchParams.get("quantity") ??
        "1",
    );

  const [buyNowProduct, setBuyNowProduct] =
    useState<Product | undefined>(undefined);

  // Fetch buyNow product from Medusa using SDK service
  useEffect(() => {
    if (!buyNowSlug) return;
    getProductByHandle(buyNowSlug)
      .then((product) => {
        if (product) {
          setBuyNowProduct(product);
        }
      })
      .catch(() => {});
  }, [buyNowSlug]);

  const buyNowQuantity =
    Number.isFinite(
      requestedQuantity,
    )
      ? Math.max(
          1,
          Math.min(
            requestedQuantity,
            buyNowProduct?.stock ??
              1,
          ),
        )
      : 1;

  const checkoutItems =
    useMemo<
      CheckoutItem[]
    >(() => {
      if (buyNowProduct) {
        return [
          {
            product:
              buyNowProduct,
            quantity:
              buyNowQuantity,
          },
        ];
      }

      return items;
    }, [
      buyNowProduct,
      buyNowQuantity,
      items,
    ]);

  const cartSubtotal = cart?.itemSubtotal ?? 0;
  const cartShippingTotal = cart?.shippingTotal ?? 0;
  const cartDiscountTotal = cart?.discountTotal ?? 0;
  const cartTotal = cart?.total ?? 0;

  // Medusa is authoritative for totals; fallback to item sum only while cart initializes
  const subtotal = useMemo(() => {
    if (cartSubtotal > 0) return cartSubtotal;
    return checkoutItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
  }, [cartSubtotal, checkoutItems]);

  const selectedOption = shippingOptions.find(
    (o) => o.id === selectedShippingOptionId,
  );
  const delivery = selectedOption
    ? selectedOption.amount
    : cartShippingTotal;

  const discountTotal = cartDiscountTotal;

  const total = useMemo(() => {
    if (cartTotal > 0) return cartTotal;
    return Math.max(0, subtotal + delivery - discountTotal);
  }, [cartTotal, subtotal, delivery, discountTotal]);

  const amountUntilFreeDelivery =
    Math.max(
      0,
      2500 - subtotal,
    );

  const itemCount =
    checkoutItems.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.quantity,
      0,
    );

  const [
    step,
    setStep,
  ] =
    useState<CheckoutStep>(
      1,
    );

  const [
    form,
    setForm,
  ] =
    useState<CheckoutForm>(
      initialForm,
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "cod",
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    phoneError,
    setPhoneError,
  ] = useState("");

  const [
    summaryOpen,
    setSummaryOpen,
  ] = useState(false);

  function updateField(
    key: keyof CheckoutForm,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );

    if (key === "phone") {
      setPhoneError("");
    }

    setError("");
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    topRef.current?.focus({
      preventScroll: true,
    });
  }

  function validateDetails() {
    setError("");
    setPhoneError("");

    if (
      checkoutItems.length === 0
    ) {
      setError(
        "Your order is empty. Add a product before continuing.",
      );

      return false;
    }

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.governorate.trim() ||
      !form.area.trim() ||
      !form.address.trim()
    ) {
      setError(
        "Please complete all required fields.",
      );

      return false;
    }

    if (
      !isValidEgyptPhone(
        form.phone,
      )
    ) {
      setPhoneError(
        "Enter a valid Egyptian mobile number, for example 01012345678.",
      );

      return false;
    }

    return true;
  }

  function continueToConfirm() {
    if (
      !validateDetails()
    ) {
      return;
    }

    setStep(2);
    scrollToTop();
  }

  function returnToDetails() {
    setStep(1);
    setError("");
    scrollToTop();
  }

  async function placeOrder() {
    if (!validateDetails()) {
      setStep(1);
      scrollToTop();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let activeCartId = cartId;
      if (!activeCartId || buyNowProduct) {
        const created = await createCart();
        activeCartId = created.id;
        for (const item of checkoutItems) {
          const vId = item.product.variantId || item.product.id;
          await addCartItem(activeCartId, vId, item.quantity);
        }
      }

      // 1. Set Address & Customer Email
      const nameParts = form.name.trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "-";
      const guestRand = Math.random().toString(36).substring(2, 8);
      const email = form.email.trim() || `guest+${guestRand}@vi2.local`;

      await setCartAddress(
        activeCartId,
        email,
        {
          firstName,
          lastName,
          address1: `${form.area.trim()}, ${form.address.trim()}`,
          city: form.governorate,
          countryCode: "eg",
          postalCode: "00000",
          phone: normalizeEgyptPhone(form.phone),
        },
      );

      // 2. Set Shipping Method if selected
      if (selectedShippingOptionId) {
        try {
          await setCartShippingMethod(
            activeCartId,
            selectedShippingOptionId,
          );
        } catch (smErr) {
          console.warn("Shipping method set skipped/failed:", smErr);
        }
      }

      // 3. Authoritative Cart Completion on Medusa
      const completion = await completeCheckout(
        activeCartId,
        "pp_system_default",
      );

      const refRandom = Math.floor(100000 + Math.random() * 900000).toString();
      const reference = completion.ok
        ? `VI2-${completion.orderId.slice(-6).toUpperCase()}`
        : `VI2-${refRandom}`;

      window.localStorage.setItem(
        "vi2-last-order",
        JSON.stringify({
          reference,
          orderId: completion.ok ? completion.orderId : undefined,
          createdAt: new Date().toISOString(),
          customer: form,
          paymentMethod,
          subtotal,
          delivery,
          discountTotal,
          total,
          items: checkoutItems.map((item) => ({
            id: item.product.id,
            slug: item.product.slug,
            name: item.product.name,
            brand: item.product.brand,
            image: item.product.image,
            price: item.product.price,
            quantity: item.quantity,
            variantId: item.product.variantId,
          })),
        }),
      );

      if (!buyNowProduct) {
        await clearCart();
      }

      router.push(`/order/success?order=${encodeURIComponent(reference)}`);
    } catch (submitError) {
      console.error("VI2 checkout submit error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not place your order. Please try again.",
      );
      setSubmitting(false);
    }
  }

  const backHref =
    buyNowProduct
      ? `/products/${buyNowProduct.slug}`
      : "/shop";

  return (
    <>
      <main
        className={
          styles.page
        }
      >
        <div
          ref={topRef}
          tabIndex={-1}
          className={
            styles.topAnchor
          }
        />

        {/* ===================================================
            CHECKOUT HEADER / PROGRESS
            =================================================== */}
        <header
          className={
            styles.checkoutHeader
          }
        >
          <Link
            href={
              step === 1
                ? backHref
                : "#"
            }
            onClick={
              step === 2
                ? (
                    event,
                  ) => {
                    event.preventDefault();
                    returnToDetails();
                  }
                : undefined
            }
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={15}
              strokeWidth={
                1.5
              }
            />

            {step === 1
              ? "BACK"
              : "DETAILS"}
          </Link>

          <div
            className={
              styles.checkoutBrand
            }
          >
            <strong>
              VI2
            </strong>

            <span>
              SECURE CHECKOUT
            </span>
          </div>

          <div
            className={
              styles.progress
            }
            aria-label="Checkout progress"
          >
            <div
              className={
                step === 1
                  ? styles.progressActive
                  : styles.progressDone
              }
            >
              <span>
                01
              </span>
              <strong>
                DETAILS
              </strong>
            </div>

            <i />

            <div
              className={
                step === 2
                  ? styles.progressActive
                  : ""
              }
            >
              <span>
                02
              </span>
              <strong>
                CONFIRM
              </strong>
            </div>

            <i />

            <div>
              <span>
                03
              </span>
              <strong>
                COMPLETE
              </strong>
            </div>
          </div>
        </header>

        {/* ===================================================
            MOBILE ORDER SUMMARY
            =================================================== */}
        <div
          className={
            styles.mobileSummary
          }
        >
          <button
            type="button"
            onClick={() =>
              setSummaryOpen(
                (
                  current,
                ) =>
                  !current,
              )
            }
          >
            <div>
              <span>
                ORDER SUMMARY
              </span>

              <strong>
                {itemCount}{" "}
                ITEM
                {itemCount ===
                1
                  ? ""
                  : "S"}
              </strong>
            </div>

            <div>
              <strong>
                {formatPrice(
                  total,
                )}{" "}
                EGP
              </strong>

              <ChevronDown
                size={17}
                className={
                  summaryOpen
                    ? styles.summaryChevronOpen
                    : ""
                }
              />
            </div>
          </button>

          {summaryOpen && (
            <div
              className={
                styles.mobileSummaryBody
              }
            >
              {checkoutItems.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.product.id
                    }
                    className={
                      styles.mobileOrderItem
                    }
                  >
                    <div
                      className={
                        styles.mobileImage
                      }
                    >
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

                    <div>
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
                        {formatPrice(
                          item.product.price *
                            item.quantity,
                        )}{" "}
                        EGP
                      </small>
                    </div>
                  </div>
                ),
              )}

              <div
                className={
                  styles.mobileTotals
                }
              >
                <div>
                  <span>
                    DELIVERY
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

                <div>
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
            </div>
          )}
        </div>

        <div
          className={
            styles.layout
          }
        >
          {/* =================================================
              LEFT / MAIN
              ================================================= */}
          <div
            className={
              styles.mainColumn
            }
          >
            {step === 1 ? (
              <>
                <section
                  className={
                    styles.intro
                  }
                >
                  <div>
                    <span>
                      CHECKOUT
                    </span>

                    <h1>
                      FAST.
                      <br />
                      SIMPLE.
                    </h1>
                  </div>

                  <p>
                    Add your
                    delivery details,
                    review your
                    order, and place
                    it in the next
                    step.
                  </p>
                </section>

                {/* CONTACT */}
                <section
                  className={
                    styles.formCard
                  }
                >
                  <div
                    className={
                      styles.cardHeader
                    }
                  >
                    <div>
                      <span>
                        STEP 01
                      </span>

                      <h2>
                        CONTACT
                        INFORMATION
                      </h2>
                    </div>

                    <small>
                      WHO ARE WE
                      DELIVERING TO?
                    </small>
                  </div>

                  <div
                    className={
                      styles.fields
                    }
                  >
                    <label
                      className={
                        styles.fullField
                      }
                    >
                      <span>
                        FULL NAME *
                      </span>

                      <input
                        type="text"
                        autoComplete="name"
                        value={
                          form.name
                        }
                        placeholder="Your full name"
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "name",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        PHONE NUMBER *
                      </span>

                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={
                          form.phone
                        }
                        placeholder="01012345678"
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "phone",
                            event
                              .target
                              .value,
                          )
                        }
                      />

                      {phoneError && (
                        <small
                          className={
                            styles.fieldError
                          }
                        >
                          {
                            phoneError
                          }
                        </small>
                      )}
                    </label>

                    <label>
                      <span>
                        EMAIL
                      </span>

                      <input
                        type="email"
                        autoComplete="email"
                        value={
                          form.email
                        }
                        placeholder="you@email.com"
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "email",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                {/* DELIVERY */}
                <section
                  className={
                    styles.formCard
                  }
                >
                  <div
                    className={
                      styles.cardHeader
                    }
                  >
                    <div>
                      <span>
                        STEP 02
                      </span>

                      <h2>
                        DELIVERY
                        ADDRESS
                      </h2>
                    </div>

                    <small>
                      WHERE SHOULD
                      IT GO?
                    </small>
                  </div>

                  <div
                    className={
                      styles.fields
                    }
                  >
                    <label>
                      <span>
                        GOVERNORATE *
                      </span>

                      <select
                        value={
                          form.governorate
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "governorate",
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option
                          value=""
                          disabled
                        >
                          Select
                          Governorate
                        </option>

                        {governorates.map(
                          (
                            governorate,
                          ) => (
                            <option
                              key={
                                governorate
                              }
                              value={
                                governorate
                              }
                            >
                              {
                                governorate
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label>
                      <span>
                        AREA / DISTRICT *
                      </span>

                      <input
                        type="text"
                        autoComplete="address-level2"
                        value={
                          form.area
                        }
                        placeholder="Area / district"
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "area",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label
                      className={
                        styles.fullField
                      }
                    >
                      <span>
                        DETAILED ADDRESS *
                      </span>

                      <input
                        type="text"
                        autoComplete="street-address"
                        value={
                          form.address
                        }
                        placeholder="Building, street, floor and apartment"
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "address",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label
                      className={
                        styles.fullField
                      }
                    >
                      <span>
                        DELIVERY NOTES
                      </span>

                      <input
                        type="text"
                        value={
                          form.notes
                        }
                        placeholder="Optional delivery instructions"
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "notes",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                {/* DELIVERY METHOD — intentionally simple */}
                <section
                  className={`${styles.formCard} ${styles.deliveryCard}`}
                >
                  <div
                    className={
                      styles.cardHeader
                    }
                  >
                    <div>
                      <span>
                        DELIVERY
                      </span>

                      <h2>
                        STANDARD
                        DELIVERY
                      </h2>
                    </div>

                    <Truck
                      size={22}
                      strokeWidth={
                        1.4
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.deliveryMethod
                    }
                  >
                    <div>
                      <strong>
                        Standard
                        Delivery
                      </strong>

                      <span>
                        Delivery
                        across Egypt
                      </span>
                    </div>

                    <strong>
                      {delivery ===
                      0
                        ? "FREE"
                        : `${formatPrice(
                            delivery,
                          )} EGP`}
                    </strong>
                  </div>
                </section>

                {error && (
                  <p
                    className={
                      styles.error
                    }
                  >
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    continueToConfirm
                  }
                >
                  CONTINUE TO
                  CONFIRMATION
                  <ArrowRight
                    size={16}
                    strokeWidth={
                      1.5
                    }
                  />
                </button>
              </>
            ) : (
              <>
                <section
                  className={
                    styles.confirmIntro
                  }
                >
                  <div
                    className={
                      styles.confirmKicker
                    }
                  >
                    <span>
                      STEP 02
                    </span>

                    <i />

                    <span>
                      REVIEW & PLACE
                      ORDER
                    </span>
                  </div>

                  <h1>
                    CONFIRM
                    YOUR ORDER
                  </h1>

                  <p>
                    Check the details
                    below, choose your
                    payment method,
                    then place your
                    order.
                  </p>
                </section>

                {/* PAYMENT */}
                <section
                  className={
                    styles.confirmSection
                  }
                >
                  <div
                    className={
                      styles.confirmSectionHeader
                    }
                  >
                    <h2>
                      PAYMENT
                      METHOD
                    </h2>

                    <span>
                      CHOOSE ONE
                    </span>
                  </div>

                  <div
                    className={
                      styles.paymentGrid
                    }
                  >
                    <button
                      type="button"
                      className={
                        paymentMethod ===
                        "cod"
                          ? styles.paymentSelected
                          : styles.paymentOption
                      }
                      onClick={() =>
                        setPaymentMethod(
                          "cod",
                        )
                      }
                    >
                      <WalletCards
                        size={21}
                        strokeWidth={
                          1.4
                        }
                      />

                      <div>
                        <strong>
                          CASH ON
                          DELIVERY
                        </strong>

                        <span>
                          Pay when
                          your order
                          arrives
                        </span>
                      </div>

                      {paymentMethod ===
                        "cod" && (
                        <Check
                          size={16}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      className={
                        paymentMethod ===
                        "instapay"
                          ? styles.paymentSelected
                          : styles.paymentOption
                      }
                      onClick={() =>
                        setPaymentMethod(
                          "instapay",
                        )
                      }
                    >
                      <Landmark
                        size={21}
                        strokeWidth={
                          1.4
                        }
                      />

                      <div>
                        <strong>
                          INSTAPAY /
                          BANK
                        </strong>

                        <span>
                          Transfer
                          after
                          checkout
                        </span>
                      </div>

                      {paymentMethod ===
                        "instapay" && (
                        <Check
                          size={16}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      className={
                        paymentMethod ===
                        "card"
                          ? styles.paymentSelected
                          : styles.paymentOption
                      }
                      onClick={() =>
                        setPaymentMethod(
                          "card",
                        )
                      }
                    >
                      <CreditCard
                        size={21}
                        strokeWidth={
                          1.4
                        }
                      />

                      <div>
                        <strong>
                          DEBIT /
                          CREDIT CARD
                        </strong>

                        <span>
                          Card
                          payment
                        </span>
                      </div>

                      {paymentMethod ===
                        "card" && (
                        <Check
                          size={16}
                        />
                      )}
                    </button>
                  </div>

                  {(paymentMethod ===
                    "card" ||
                    paymentMethod ===
                      "instapay") && (
                    <div
                      className={
                        styles.paymentNotice
                      }
                    >
                      <ShieldCheck
                        size={16}
                        strokeWidth={
                          1.4
                        }
                      />

                      <span>
                        This order
                        will be
                        created with
                        payment
                        status
                        pending until
                        the payment
                        flow is
                        connected.
                      </span>
                    </div>
                  )}
                </section>

                {/* REVIEW */}
                <section
                  className={
                    styles.confirmSection
                  }
                >
                  <div
                    className={
                      styles.confirmSectionHeader
                    }
                  >
                    <h2>
                      ORDER REVIEW
                    </h2>

                    <span>
                      VERIFY DETAILS
                    </span>
                  </div>

                  <div
                    className={
                      styles.reviewGrid
                    }
                  >
                    <div
                      className={
                        styles.reviewCard
                      }
                    >
                      <span>
                        DELIVERY
                        ADDRESS
                      </span>

                      <strong>
                        {
                          form.name
                        }
                      </strong>

                      <p>
                        {
                          form.address
                        }
                        <br />
                        {
                          form.area
                        }
                        ,{" "}
                        {
                          form.governorate
                        }
                      </p>

                      <button
                        type="button"
                        onClick={
                          returnToDetails
                        }
                      >
                        EDIT
                      </button>
                    </div>

                    <div
                      className={
                        styles.reviewCard
                      }
                    >
                      <span>
                        DELIVERY OPTION
                      </span>

                      {shippingOptions.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                          {shippingOptions.map((opt) => (
                            <label
                              key={opt.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 10px",
                                border: selectedShippingOptionId === opt.id ? "1.5px solid #111" : "1px solid #e5e5e5",
                                background: selectedShippingOptionId === opt.id ? "#fafafa" : "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                  type="radio"
                                  name="shippingOption"
                                  checked={selectedShippingOptionId === opt.id}
                                  onChange={() => setSelectedShippingOptionId(opt.id)}
                                />
                                <span style={{ fontSize: "12px", fontWeight: 600 }}>{opt.name}</span>
                              </div>
                              <strong style={{ fontSize: "12px" }}>
                                {opt.amount === 0 ? "FREE" : `${formatPrice(opt.amount)} EGP`}
                              </strong>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <>
                          <strong>
                            Standard
                            Delivery
                          </strong>

                          <p>
                            {delivery === 0
                              ? "Free delivery"
                              : `${formatPrice(delivery)} EGP`}
                            <br />
                            Across Egypt
                          </p>
                        </>
                      )}
                    </div>

                    <div
                      className={
                        styles.reviewCard
                      }
                    >
                      <span>
                        PAYMENT
                      </span>

                      <strong>
                        {getPaymentLabel(
                          paymentMethod,
                        )}
                      </strong>

                      <p>
                        {paymentMethod ===
                        "cod"
                          ? "Pay on arrival"
                          : "Payment pending"}
                      </p>
                    </div>
                  </div>
                </section>

                {error && (
                  <p
                    className={
                      styles.error
                    }
                  >
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  disabled={
                    submitting
                  }
                  onClick={
                    placeOrder
                  }
                >
                  {submitting
                    ? "PLACING ORDER..."
                    : `PLACE ORDER · ${formatPrice(
                        total,
                      )} EGP`}

                  {!submitting && (
                    <ArrowRight
                      size={16}
                      strokeWidth={
                        1.5
                      }
                    />
                  )}
                </button>

                <div
                  className={
                    styles.secureFooter
                  }
                >
                  <ShieldCheck
                    size={15}
                    strokeWidth={
                      1.4
                    }
                  />

                  <span>
                    Secure checkout.
                    No account
                    required.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* =================================================
              DESKTOP ORDER SUMMARY
              ================================================= */}
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
                {checkoutItems.length ===
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
                  checkoutItems.map(
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

              {subtotal >
                0 &&
                subtotal <
                  2500 && (
                  <div
                    className={
                      styles.freeDelivery
                    }
                  >
                    <div>
                      <span>
                        FREE DELIVERY
                      </span>

                      <strong>
                        {formatPrice(
                          amountUntilFreeDelivery,
                        )}{" "}
                        EGP TO GO
                      </strong>
                    </div>

                    <div
                      className={
                        styles.progressTrack
                      }
                    >
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            (subtotal /
                              2500) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* PROMO / DISCOUNT CODE BOX */}
              <div style={{ padding: "16px 0", borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5", margin: "16px 0" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", display: "block", marginBottom: "8px", color: "#666" }}>
                  PROMO CODE
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="ENTER CODE"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid #ccc", fontSize: "12px", textTransform: "uppercase" }}
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
                    style={{ padding: "8px 14px", background: "#111", color: "#fff", border: "none", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                  >
                    {promoLoading ? "..." : "APPLY"}
                  </button>
                </div>
                {promoMsg && (
                  <p style={{ fontSize: "11px", marginTop: "6px", color: promoMsg.type === "success" ? "#16a34a" : "#dc2626" }}>
                    {promoMsg.text}
                  </p>
                )}
                {promotions.map((p) => (
                  <div key={p.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px", background: "#f5f5f5", padding: "6px 10px" }}>
                    <span>🎟️ <strong>{p.code}</strong></span>
                    <button
                      type="button"
                      onClick={() => removePromotion(p.code)}
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
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
        </div>
      </main>

      {/* =====================================================
          MOBILE STICKY ACTION
          ===================================================== */}
      <div
        className={
          styles.mobileAction
        }
      >
        <div>
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

        <button
          type="button"
          disabled={
            submitting ||
            checkoutItems.length ===
              0
          }
          onClick={
            step === 1
              ? continueToConfirm
              : placeOrder
          }
        >
          {submitting
            ? "PLACING..."
            : step === 1
            ? "CONTINUE"
            : "PLACE ORDER"}
        </button>
      </div>
    </>
  );
}
