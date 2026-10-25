"use client";
import { LegacyTranslations } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";

import Link from "@/components/LocaleLink";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { forgetDetails, forgetPendingCart, pendingCartId, rememberPendingCart, saveDetails, savedDetails } from "@/lib/pending-checkout";
import {
  getShippingOptions,
  setCartAddress,
  setCartShippingMethod,
  completeCheckout,
  createCart,
  addCartItem,
  listAddresses,
} from "@/lib/medusa";
import type { ShippingOption } from "@/types/shipping";

import styles from "./Checkout.module.css";
import { deliveryStatus, type ShippingLoad } from "./delivery-status";
import { checkoutTotal, formatPrice } from "./checkout-total";
import { governorates, initialForm, isValidEgyptPhone, normalizeEgyptPhone, type CheckoutForm } from "./checkout-details";
import OrderSummary, { type CheckoutItem } from "./OrderSummary";
import PromoCode from "./PromoCode";
import CatalogImage from "@/components/CatalogImage";

type CheckoutStep =
  | 1
  | 2;


export default function CheckoutClient() {
  const router = useLocaleRouter();

  const submissionLock = useRef(false);
  const topRef =
    useRef<HTMLDivElement>(null);

  const {
    items,
    clearCart,
    cartId,
    cart,
    loading: cartLoading,
    refreshCart,
  } = useCart();

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string>("");

  const [shippingLoad, setShippingLoad] = useState<ShippingLoad>("loading");

  const loadShippingOptions = useCallback((id: string) => {
    setShippingLoad("loading");
    getShippingOptions(id)
      .then((opts) => {
        setShippingOptions(opts);
        if (opts.length > 0) {
          setSelectedShippingOptionId((prev) => prev || opts[0].id);
        }
        setShippingLoad("loaded");
      })
      // An outage leaves no options; the order step then refuses to continue.
      .catch(() => {
        setShippingOptions([]);
        setShippingLoad("failed");
      });
  }, []);
  const deliveryCard = deliveryStatus(cartId, cartLoading, shippingLoad, shippingOptions.length);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads delivery options when the cart is known
    if (cartId) loadShippingOptions(cartId);
  }, [cartId, loadShippingOptions]);

  const [recovering, setRecovering] = useState(false);
  const checkoutItems: CheckoutItem[] = items;

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

  const total = checkoutTotal(cartTotal, cartShippingTotal, subtotal, discountTotal, delivery);

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
  // Saving starts only after the saved details are read, so the empty first
  // render never overwrites them.
  const [detailsRestored, setDetailsRestored] = useState(false);

  // Resume a submitted-but-unconfirmed checkout and the details typed so far.
  // Runs after hydration because sessionStorage is unavailable during server render.
  useEffect(() => {
    const saved = savedDetails(initialForm);
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage exists only after hydration */
    if (saved) setForm(saved);
    if (pendingCartId()) { setRecovering(true); setStep(2); }
    setDetailsRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Sign-out removes the pending checkout and its details.
    const onSignedOut = () => { setRecovering(false); setForm(initialForm); };
    window.addEventListener("vi2-signed-out", onSignedOut);
    return () => window.removeEventListener("vi2-signed-out", onSignedOut);
  }, []);

  useEffect(() => {
    if (detailsRestored) saveDetails(form);
  }, [detailsRestored, form]);

  // A confirmed cart change drops the pending retry (cart provider); show
  // "Place order" again instead of offering a retry that no longer exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows browser storage the cart provider changed
    if (recovering && !pendingCartId()) setRecovering(false);
  }, [items, recovering]);

  // A signed-in customer starts with their name, contact and first saved
  // address; only empty fields are filled, so nothing typed is replaced.
  const { customer, isLoading: customerLoading } = useAuth();
  useEffect(() => {
    if (!detailsRestored || !customer) return;
    let active = true;
    const fill = (values: Partial<CheckoutForm>) => setForm((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(values).filter(([key, value]) => value && !current[key as keyof CheckoutForm])),
    }));
    fill({ name: `${customer.firstName} ${customer.lastName}`.trim(), email: customer.email, phone: customer.phone ?? "" });
    void listAddresses().then((result) => {
      const address = result.ok ? result.addresses[0] : undefined;
      if (!active || !address) return;
      fill({
        governorate: address.city && governorates.includes(address.city) ? address.city : "",
        area: address.address_2 ?? "", address: address.address_1 ?? "",
        phone: address.phone ?? "",
      });
    });
    return () => { active = false; };
  }, [detailsRestored, customer]);

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
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
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
    if (submissionLock.current) return;
    const recoveryId = pendingCartId();
    if (!recoveryId && !validateDetails()) {
      setStep(1);
      scrollToTop();
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    setError("");
    let completionAttempted = false;
    try {
      let activeCartId = recoveryId || cartId;
      if (!recoveryId) {
        if (process.env.NODE_ENV === "production") {
          setError("Checkout is unavailable until payment methods are configured.");
          return;
        }
        if (!activeCartId) {
          const created = await createCart();
          activeCartId = created.id;
          for (const item of checkoutItems) {
            if (!item.product.variantId) throw new Error("Variant unavailable");
            await addCartItem(activeCartId, item.product.variantId, item.quantity);
          }
        }
        const [firstName, ...rest] = form.name.trim().split(/\s+/);
        await setCartAddress(activeCartId, form.email.trim(), {
          firstName, lastName: rest.join(" "),
          address1: `${form.area.trim()}, ${form.address.trim()}`,
          city: form.governorate, countryCode: "eg",
          phone: normalizeEgyptPhone(form.phone),
        });
        if (!selectedShippingOptionId) throw new Error("Select a shipping method");
        await setCartShippingMethod(activeCartId, selectedShippingOptionId);
        // Store only the cart capability before completion, for refresh recovery.
        rememberPendingCart(activeCartId);
        setRecovering(true);
      }
      if (!activeCartId) throw new Error("Cart unavailable");
      completionAttempted = true;
      const completion = await completeCheckout(activeCartId, Boolean(recoveryId));
      if (!completion.ok) {
        if (!completion.unknown) { forgetPendingCart(); setRecovering(false); }
        setError(completion.error);
        return;
      }
      forgetPendingCart();
      forgetDetails();
      try { window.localStorage.removeItem("vi2-last-order"); } catch { /* confirmed order remains authoritative */ }
      // The order exists in Medusa now. A local cart-reset failure must not be
      // reported as a checkout failure, or the customer may order twice.
      await clearCart().catch(() => {});
      router.push(`/order/success?order=${encodeURIComponent(completion.orderId)}`);
    } catch {
      setError(completionAttempted
        ? "Could not confirm your order. Your cart has been retained. Retry confirmation; payment status may be unknown."
        : "Could not prepare your order. Check your delivery details and try again.");
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  const backHref = "/shop";

  return (
    <>
      <LegacyTranslations><main
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

          <div className={styles.mobilePromo}>
            <PromoCode collapsible />
          </div>

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
                      <CatalogImage src={item.product.image} alt={item.product.name} />

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
                {discountTotal > 0 && (
                  <div className={styles.discountLine}>
                    <span>DISCOUNT</span>
                    <strong>-{formatPrice(discountTotal)} EGP</strong>
                  </div>
                )}

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

                  {!customerLoading && !customer && (
                    <p className={styles.signInHint}>
                      {/* Two whole phrases, so the Arabic dictionary translates each one. */}
                      <span>Have an account?</span>{" "}
                      <Link href="/account/sign-in?next=/checkout">Sign in to fill in your details and keep this order in your account.</Link>
                    </p>
                  )}

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
                      PAYMENT AVAILABILITY
                    </span>
                  </div>

                  <p role="status">
                    {process.env.NODE_ENV === "production"
                      ? "Checkout is unavailable until payment methods are configured."
                      : "Development checkout uses Medusa's manual test provider. No card, bank transfer, or cash-on-delivery flow is connected."}
                  </p>
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

                      {deliveryCard === "ready" ? (
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
                                <span style={{ fontSize: "var(--text-body)", fontWeight: 600 }}>{opt.name}</span>
                              </div>
                              <strong style={{ fontSize: "var(--text-body)" }}>
                                {opt.amount === 0 ? "FREE" : `${formatPrice(opt.amount)} EGP`}
                              </strong>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p role="status">
                          {deliveryCard === "loading" && "Loading delivery options…"}
                          {deliveryCard === "empty" && "No delivery options are available for this order right now."}
                          {(deliveryCard === "failed" || deliveryCard === "no-cart") && (
                            <>
                              {deliveryCard === "failed" ? "Delivery options could not be loaded." : "Your cart could not be loaded."}{" "}
                              <button
                                type="button"
                                onClick={() => (deliveryCard === "failed" && cartId ? loadShippingOptions(cartId) : void refreshCart())}
                                style={{ textDecoration: "underline", fontWeight: 600 }}
                              >
                                Try again
                              </button>
                            </>
                          )}
                        </p>
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
                        Manual test provider
                      </strong>

                      <p>
                        Payment status is confirmed by Medusa.
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
                    submitting || (process.env.NODE_ENV === "production" && !recovering)
                  }
                  onClick={
                    placeOrder
                  }
                >
                  {submitting
                    ? "PLACING ORDER..."
                    : recovering ? "RETRY CONFIRMATION" : `PLACE ORDER · ${formatPrice(
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

          <OrderSummary items={checkoutItems} subtotal={subtotal} discountTotal={discountTotal} delivery={delivery} total={total} />
        </div>
      </main></LegacyTranslations>

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
            (!recovering && checkoutItems.length === 0)
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
            : recovering ? "RETRY CONFIRMATION" : "PLACE ORDER"}
        </button>
      </div>
    </>
  );
}
