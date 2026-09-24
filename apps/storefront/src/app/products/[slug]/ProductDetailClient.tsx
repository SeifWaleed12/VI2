"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCheck2,
  FlaskConical,
  Heart,
  Leaf,
  Minus,
  PackageCheck,
  Plus,
  Repeat2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import ProductSocialProof from "@/components/ProductSocialProof";
import ProductValueOffer from "@/components/ProductValueOffer";
import { useCart } from "@/context/CartContext";
import {
  getProductForm,
  getProductHealthGoals,
} from "@/lib/catalogMeta";
import type { Product } from "@/types/product";

import styles from "./ProductDetail.module.css";

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatReviews(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
  ).format(value);
}

type GalleryView =
  | "product"
  | "facts"
  | "size"
  | "quality";

type AccordionKey =
  | "information"
  | "facts"
  | "quality"
  | "delivery"
  | null;

export default function ProductDetailClient({
  product,
  allProducts,
}: {
  product: Product;
  allProducts: Product[];
}) {
  const router = useRouter();
  const { addItem } = useCart();

  const [quantity, setQuantity] =
    useState(1);

  const [added, setAdded] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [shareCopied, setShareCopied] =
    useState(false);

  const [galleryView, setGalleryView] =
    useState<GalleryView>(
      "product",
    );

  const [purchaseMode, setPurchaseMode] =
    useState<
      "once" | "repeat"
    >("once");

  const [repeatEvery, setRepeatEvery] =
    useState("2 months");

  const [openAccordion, setOpenAccordion] =
    useState<AccordionKey>(
      "information",
    );

  const maxQuantity =
    Math.max(
      1,
      Math.min(
        product.stock,
        10,
      ),
    );

  const total = useMemo(
    () =>
      product.price *
      quantity,
    [
      product.price,
      quantity,
    ],
  );

  const repeatPrice =
    Math.round(
      product.price *
        0.95,
    );

  const productForm =
    getProductForm(product);

  const healthGoalLabels =
    getProductHealthGoals(
      product,
    );

  const perServing =
    product.servings
      ? product.price /
        product.servings
      : null;

  const sameCategory =
    allProducts
      .filter(
        (item) =>
          item.slug !==
            product.slug &&
          item.category ===
            product.category,
      )
      .sort(
        (a, b) =>
          b.rating -
            a.rating ||
          b.reviewCount -
            a.reviewCount,
      );

  const fallbackProducts =
    allProducts
      .filter(
        (item) =>
          item.slug !==
            product.slug &&
          !sameCategory.some(
            (same) =>
              same.slug ===
              item.slug,
          ),
      )
      .sort(
        (a, b) =>
          b.rating -
            a.rating ||
          b.reviewCount -
            a.reviewCount,
      );

  const similarProducts =
    [
      ...sameCategory,
      ...fallbackProducts,
    ].slice(0, 5);

  const recommendation =
    similarProducts[0];

  const relatedLabels =
    Array.from(
      new Set([
        product.category,
        ...healthGoalLabels,
        product.brand,
      ]),
    ).slice(0, 5);

  function decreaseQuantity() {
    setQuantity(
      (current) =>
        Math.max(
          1,
          current - 1,
        ),
    );
  }

  function increaseQuantity() {
    setQuantity(
      (current) =>
        Math.min(
          maxQuantity,
          current + 1,
        ),
    );
  }

  function handleAddToCart() {
    addItem(
      product,
      quantity,
    );

    setAdded(true);

    window.setTimeout(
      () => {
        setAdded(false);
      },
      1400,
    );
  }

  function handleBuyNow() {
    router.push(
      `/checkout?buyNow=${encodeURIComponent(
        product.slug,
      )}&quantity=${quantity}`,
    );
  }

  async function handleShare() {
    const url =
      window.location.href;

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            product.name,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url,
      );

      setShareCopied(true);

      window.setTimeout(
        () =>
          setShareCopied(
            false,
          ),
        1400,
      );
    } catch {
      // User cancelled sharing.
    }
  }

  function toggleAccordion(
    key: AccordionKey,
  ) {
    setOpenAccordion(
      (current) =>
        current === key
          ? null
          : key,
    );
  }

  return (
    <>
      <main
        className={styles.page}
      >
        <div
          className={
            styles.shell
          }
        >
          {/* ==================================================
              BREADCRUMBS
              ================================================== */}
          <nav
            className={
              styles.breadcrumbs
            }
            aria-label="Breadcrumb"
          >
            <Link href="/">
              Home
            </Link>

            <ChevronRight
              size={13}
              strokeWidth={1.5}
            />

            <Link href="/shop">
              Shop
            </Link>

            <ChevronRight
              size={13}
              strokeWidth={1.5}
            />

            <Link
              href={`/shop?category=${encodeURIComponent(
                product.category,
              )}`}
            >
              {
                product.category
              }
            </Link>

            <ChevronRight
              size={13}
              strokeWidth={1.5}
            />

            <span>
              {
                product.shortName
              }
            </span>
          </nav>

          {/* ==================================================
              MAIN PRODUCT STRUCTURE
              ================================================== */}
          <section
            className={
              styles.productGrid
            }
          >
            {/* ================================================
                PRODUCT GALLERY
                ================================================ */}
            <div
              className={
                styles.gallery
              }
            >
              <div
                className={
                  styles.thumbnailRail
                }
              >
                <button
                  type="button"
                  className={
                    galleryView ===
                    "product"
                      ? `${styles.thumbnail} ${styles.thumbnailActive}`
                      : styles.thumbnail
                  }
                  onClick={() =>
                    setGalleryView(
                      "product",
                    )
                  }
                  aria-label="Show product"
                >
                  <img
                    src={
                      product.image
                    }
                    alt=""
                  />
                </button>

                <button
                  type="button"
                  className={
                    galleryView ===
                    "facts"
                      ? `${styles.thumbnail} ${styles.thumbnailActive}`
                      : styles.thumbnail
                  }
                  onClick={() =>
                    setGalleryView(
                      "facts",
                    )
                  }
                  aria-label="Show product facts"
                >
                  <span
                    className={
                      styles.thumbLabel
                    }
                  >
                    FACTS
                  </span>

                  <strong>
                    {product.servings ??
                      "—"}
                  </strong>

                  <small>
                    SERVINGS
                  </small>
                </button>

                <button
                  type="button"
                  className={
                    galleryView ===
                    "size"
                      ? `${styles.thumbnail} ${styles.thumbnailActive}`
                      : styles.thumbnail
                  }
                  onClick={() =>
                    setGalleryView(
                      "size",
                    )
                  }
                  aria-label="Show package details"
                >
                  <PackageCheck
                    size={24}
                    strokeWidth={
                      1.3
                    }
                  />

                  <small>
                    PACKAGE
                  </small>
                </button>

                <button
                  type="button"
                  className={
                    galleryView ===
                    "quality"
                      ? `${styles.thumbnail} ${styles.thumbnailActive}`
                      : styles.thumbnail
                  }
                  onClick={() =>
                    setGalleryView(
                      "quality",
                    )
                  }
                  aria-label="Show quality details"
                >
                  <ShieldCheck
                    size={24}
                    strokeWidth={
                      1.3
                    }
                  />

                  <small>
                    QUALITY
                  </small>
                </button>
              </div>

              <div
                className={
                  styles.mainVisual
                }
              >
                <div
                  className={
                    styles.visualActions
                  }
                >
                  <button
                    type="button"
                    className={
                      saved
                        ? `${styles.roundAction} ${styles.roundActionActive}`
                        : styles.roundAction
                    }
                    aria-label="Save product"
                    onClick={() =>
                      setSaved(
                        (current) =>
                          !current,
                      )
                    }
                  >
                    <Heart
                      size={18}
                      strokeWidth={
                        1.45
                      }
                      fill={
                        saved
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>

                  <button
                    type="button"
                    className={
                      styles.roundAction
                    }
                    aria-label="Share product"
                    onClick={
                      handleShare
                    }
                  >
                    {shareCopied ? (
                      <Copy
                        size={18}
                        strokeWidth={
                          1.45
                        }
                      />
                    ) : (
                      <Share2
                        size={18}
                        strokeWidth={
                          1.45
                        }
                      />
                    )}
                  </button>
                </div>

                {product.badge && (
                  <span
                    className={
                      styles.productBadge
                    }
                  >
                    {
                      product.badge
                    }
                  </span>
                )}

                {galleryView ===
                  "product" && (
                  <div
                    className={
                      styles.productImageWrap
                    }
                  >
                    <img
                      src={
                        product.image
                      }
                      alt={
                        product.name
                      }
                      className={
                        styles.productImage
                      }
                    />
                  </div>
                )}

                {galleryView ===
                  "facts" && (
                  <div
                    className={
                      styles.infoVisual
                    }
                  >
                    <span>
                      PRODUCT FACTS
                    </span>

                    <h3>
                      {
                        product.shortName
                      }
                    </h3>

                    <div
                      className={
                        styles.factSheet
                      }
                    >
                      <div>
                        <span>
                          FORM
                        </span>
                        <strong>
                          {
                            productForm
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          SERVINGS
                        </span>
                        <strong>
                          {product.servings ??
                            "See package"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          SIZE
                        </span>
                        <strong>
                          {product.size ??
                            "See package"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          CATEGORY
                        </span>
                        <strong>
                          {
                            product.category
                          }
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {galleryView ===
                  "size" && (
                  <div
                    className={
                      styles.infoVisual
                    }
                  >
                    <span>
                      PACKAGE DETAILS
                    </span>

                    <PackageCheck
                      size={56}
                      strokeWidth={
                        1.05
                      }
                    />

                    <h3>
                      {product.size ??
                        "PACKAGE SIZE"}
                    </h3>

                    <p>
                      {product.flavor
                        ? `Flavor: ${product.flavor}`
                        : "Package format shown exactly as listed in the Vi2 catalog."}
                    </p>
                  </div>
                )}

                {galleryView ===
                  "quality" && (
                  <div
                    className={
                      styles.infoVisual
                    }
                  >
                    <span>
                      VI2 QUALITY
                    </span>

                    <ShieldCheck
                      size={56}
                      strokeWidth={
                        1.05
                      }
                    />

                    <h3>
                      QUALITY FIRST.
                    </h3>

                    <p>
                      Authenticity,
                      batch and
                      supporting
                      product
                      information are
                      organized in one
                      place.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ================================================
                PRODUCT INFORMATION
                ================================================ */}
            <div
              className={
                styles.details
              }
            >
              <div
                className={
                  styles.brandLine
                }
              >
                <span>
                  {
                    product.brand
                  }
                </span>

                <BadgeCheck
                  size={15}
                  strokeWidth={
                    1.4
                  }
                />
              </div>

              <h1>
                {product.name}
              </h1>

              <Link
                href={`/shop?brand=${encodeURIComponent(
                  product.brand,
                )}`}
                className={
                  styles.byBrand
                }
              >
                By{" "}
                <strong>
                  {
                    product.brand
                  }
                </strong>
              </Link>

              <div
                className={
                  styles.ratingRow
                }
              >
                <div
                  className={
                    styles.stars
                  }
                >
                  {Array.from({
                    length: 5,
                  }).map(
                    (
                      _,
                      index,
                    ) => (
                      <Star
                        key={
                          index
                        }
                        size={15}
                        strokeWidth={
                          1.3
                        }
                        fill={
                          index <
                          Math.round(
                            product.rating,
                          )
                            ? "currentColor"
                            : "none"
                        }
                      />
                    ),
                  )}
                </div>

                <strong>
                  {product.rating}
                </strong>

                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(
                        "verified-reviews",
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      });
                  }}
                >
                  {formatReviews(
                    product.reviewCount,
                  )}{" "}
                  reviews
                </button>
              </div>

              <div
                className={
                  styles.detailDivider
                }
              />

              <div
                className={
                  styles.packageBlock
                }
              >
                <span
                  className={
                    styles.sectionLabel
                  }
                >
                  PACKAGE QUANTITY
                </span>

                <button
                  type="button"
                  className={
                    styles.packageOption
                  }
                >
                  <strong>
                    1 PACK
                  </strong>

                  <span>
                    {product.size ??
                      "Current package"}
                  </span>

                  <small>
                    {formatPrice(
                      product.price,
                    )}{" "}
                    EGP
                  </small>
                </button>
              </div>

              <div
                className={
                  styles.keyInfo
                }
              >
                <span
                  className={
                    styles.sectionLabel
                  }
                >
                  KEY INFO
                </span>

                <div
                  className={
                    styles.keyInfoGrid
                  }
                >
                  <div>
                    <span>
                      FORM
                    </span>

                    <strong>
                      {
                        productForm
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      TOTAL
                      SERVINGS
                    </span>

                    <strong>
                      {product.servings ??
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      PACKAGE SIZE
                    </span>

                    <strong>
                      {product.size ??
                        "See package"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      STOCK
                    </span>

                    <strong
                      className={
                        product.stock >
                        8
                          ? styles.inStockText
                          : styles.lowStockText
                      }
                    >
                      {product.stock >
                      8
                        ? "IN STOCK"
                        : "LOW STOCK"}
                    </strong>
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.certifications
                }
              >
                <span
                  className={
                    styles.sectionLabel
                  }
                >
                  QUALITY & PRODUCT DATA
                </span>

                <div
                  className={
                    styles.certificationRow
                  }
                >
                  <span>
                    <ShieldCheck
                      size={20}
                      strokeWidth={
                        1.35
                      }
                    />
                    AUTHENTICITY
                    FOCUSED
                  </span>

                  <span>
                    <FlaskConical
                      size={20}
                      strokeWidth={
                        1.35
                      }
                    />
                    LAB DATA
                    READY
                  </span>

                  <span>
                    <FileCheck2
                      size={20}
                      strokeWidth={
                        1.35
                      }
                    />
                    BATCH INFO
                    READY
                  </span>
                </div>
              </div>

              {recommendation && (
                <div
                  className={
                    styles.recommendation
                  }
                >
                  <img
                    src={
                      recommendation.image
                    }
                    alt={
                      recommendation.name
                    }
                  />

                  <div>
                    <span>
                      SIMILAR
                      RECOMMENDATION
                    </span>

                    <strong>
                      {
                        recommendation.shortName
                      }
                    </strong>

                    <small>
                      {formatPrice(
                        recommendation.price,
                      )}{" "}
                      EGP
                    </small>
                  </div>

                  <Link
                    href={`/products/${recommendation.slug}`}
                  >
                    VIEW
                  </Link>
                </div>
              )}
            </div>

            {/* ================================================
                PURCHASE PANEL
                ================================================ */}
            <aside
              className={
                styles.purchaseColumn
              }
            >
              <div
                className={
                  styles.purchaseCard
                }
              >
                <div
                  className={
                    styles.priceHeader
                  }
                >
                  <span>
                    OUR PRICE
                  </span>

                  <strong>
                    {formatPrice(
                      product.price,
                    )}{" "}
                    EGP
                  </strong>

                  {perServing && (
                    <small>
                      {formatPrice(
                        perServing,
                      )}{" "}
                      EGP /
                      serving
                    </small>
                  )}
                </div>

                <div
                  className={
                    styles.stockLine
                  }
                >
                  <CheckCircle2
                    size={17}
                    strokeWidth={
                      1.6
                    }
                  />

                  <span>
                    {product.stock >
                    8
                      ? "In Stock"
                      : `Low Stock · ${product.stock} left`}
                  </span>
                </div>

                <div
                  className={
                    styles.purchaseModes
                  }
                >
                  <button
                    type="button"
                    className={
                      purchaseMode ===
                      "once"
                        ? styles.purchaseModeActive
                        : ""
                    }
                    onClick={() =>
                      setPurchaseMode(
                        "once",
                      )
                    }
                  >
                    <span
                      className={
                        styles.radio
                      }
                    />

                    <div>
                      <strong>
                        ONE-TIME
                        PURCHASE
                      </strong>

                      <small>
                        {
                          formatPrice(
                            product.price,
                          )
                        }{" "}
                        EGP
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={
                      purchaseMode ===
                      "repeat"
                        ? styles.purchaseModeActive
                        : ""
                    }
                    onClick={() =>
                      setPurchaseMode(
                        "repeat",
                      )
                    }
                  >
                    <span
                      className={
                        styles.radio
                      }
                    />

                    <div>
                      <strong>
                        SUBSCRIBE &
                        SAVE
                      </strong>

                      <small>
                        {formatPrice(
                          repeatPrice,
                        )}{" "}
                        EGP
                      </small>
                    </div>

                    <em>
                      -5%
                    </em>
                  </button>
                </div>

                {purchaseMode ===
                  "repeat" && (
                  <div
                    className={
                      styles.frequencyBox
                    }
                  >
                    <span>
                      DELIVER EVERY
                    </span>

                    <div>
                      {[
                        "1 month",
                        "2 months",
                        "3 months",
                      ].map(
                        (
                          item,
                        ) => (
                          <button
                            type="button"
                            key={
                              item
                            }
                            className={
                              repeatEvery ===
                              item
                                ? styles.frequencyActive
                                : ""
                            }
                            onClick={() =>
                              setRepeatEvery(
                                item,
                              )
                            }
                          >
                            {
                              item
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={
                    styles.buyRow
                  }
                >
                  <div
                    className={
                      styles.quantity
                    }
                  >
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={
                        decreaseQuantity
                      }
                      disabled={
                        quantity <=
                        1
                      }
                    >
                      <Minus
                        size={14}
                      />
                    </button>

                    <span>
                      {quantity}
                    </span>

                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={
                        increaseQuantity
                      }
                      disabled={
                        quantity >=
                        maxQuantity
                      }
                    >
                      <Plus
                        size={14}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.addButton
                    }
                    onClick={
                      handleAddToCart
                    }
                  >
                    {added ? (
                      <>
                        <Check
                          size={16}
                        />
                        ADDED
                      </>
                    ) : (
                      <>
                        <ShoppingBag
                          size={16}
                        />
                        ADD TO CART
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  className={
                    styles.buyButton
                  }
                  onClick={
                    handleBuyNow
                  }
                >
                  BUY NOW
                </button>

                <div
                  className={
                    styles.shippingLine
                  }
                >
                  <Truck
                    size={20}
                    strokeWidth={
                      1.35
                    }
                  />

                  <div>
                    <strong>
                      FAST SHIPPING
                    </strong>

                    <span>
                      Free over
                      2,500 EGP
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.sideAccordions
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleAccordion(
                      "information",
                    )
                  }
                >
                  <span>
                    PRODUCT
                    INFORMATION
                  </span>

                  <ChevronDown
                    size={16}
                    className={
                      openAccordion ===
                      "information"
                        ? styles.chevronOpen
                        : ""
                    }
                  />
                </button>

                {openAccordion ===
                  "information" && (
                  <div
                    className={
                      styles.accordionContent
                    }
                  >
                    <p>
                      {
                        product.description
                      }
                    </p>

                    <ul>
                      {healthGoalLabels.map(
                        (
                          goal,
                        ) => (
                          <li
                            key={
                              goal
                            }
                          >
                            {
                              goal
                            }
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    toggleAccordion(
                      "facts",
                    )
                  }
                >
                  <span>
                    SUPPLEMENT
                    FACTS
                  </span>

                  <ChevronDown
                    size={16}
                    className={
                      openAccordion ===
                      "facts"
                        ? styles.chevronOpen
                        : ""
                    }
                  />
                </button>

                {openAccordion ===
                  "facts" && (
                  <div
                    className={
                      styles.accordionContent
                    }
                  >
                    <div
                      className={
                        styles.accordionFacts
                      }
                    >
                      <span>
                        FORM
                      </span>
                      <strong>
                        {
                          productForm
                        }
                      </strong>

                      <span>
                        SIZE
                      </span>
                      <strong>
                        {product.size ??
                          "See package"}
                      </strong>

                      <span>
                        SERVINGS
                      </span>
                      <strong>
                        {product.servings ??
                          "See package"}
                      </strong>
                    </div>

                    <p>
                      Full
                      ingredient
                      panels can be
                      connected when
                      the final
                      supplier
                      catalog is
                      provided.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    toggleAccordion(
                      "quality",
                    )
                  }
                >
                  <span>
                    QUALITY,
                    BATCH &
                    COMPLIANCE
                  </span>

                  <ChevronDown
                    size={16}
                    className={
                      openAccordion ===
                      "quality"
                        ? styles.chevronOpen
                        : ""
                    }
                  />
                </button>

                {openAccordion ===
                  "quality" && (
                  <div
                    className={
                      styles.accordionContent
                    }
                  >
                    <div
                      className={
                        styles.qualityList
                      }
                    >
                      <span>
                        <FileCheck2
                          size={15}
                        />
                        Certificate
                        / COA area
                      </span>

                      <span>
                        <BadgeCheck
                          size={15}
                        />
                        Batch &
                        expiry area
                      </span>

                      <span>
                        <ShieldCheck
                          size={15}
                        />
                        Regulatory
                        status area
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    toggleAccordion(
                      "delivery",
                    )
                  }
                >
                  <span>
                    DELIVERY &
                    RETURNS
                  </span>

                  <ChevronDown
                    size={16}
                    className={
                      openAccordion ===
                      "delivery"
                        ? styles.chevronOpen
                        : ""
                    }
                  />
                </button>

                {openAccordion ===
                  "delivery" && (
                  <div
                    className={
                      styles.accordionContent
                    }
                  >
                    <p>
                      Delivery
                      pricing is
                      shown before
                      the order is
                      placed.
                      Orders over
                      2,500 EGP
                      receive free
                      delivery.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </section>

          {/* ==================================================
              RELATED CATEGORIES
              ================================================== */}
          <section
            className={
              styles.relatedSection
            }
          >
            <h2>
              RELATED
              CATEGORIES
            </h2>

            <div
              className={
                styles.relatedPills
              }
            >
              {relatedLabels.map(
                (
                  item,
                ) => (
                  <Link
                    key={
                      item
                    }
                    href={`/shop?search=${encodeURIComponent(
                      item,
                    )}`}
                  >
                    {
                      item
                    }
                  </Link>
                ),
              )}
            </div>
          </section>

          {/* ==================================================
              SIMILAR ITEMS
              ================================================== */}
          <section
            className={
              styles.similarSection
            }
          >
            <div
              className={
                styles.similarHeading
              }
            >
              <div>
                <span>
                  DISCOVER
                  MORE
                </span>

                <h2>
                  SIMILAR ITEMS
                  TO CONSIDER
                </h2>
              </div>

              <Link
                href={`/shop?category=${encodeURIComponent(
                  product.category,
                )}`}
              >
                VIEW ALL
                <ChevronRight
                  size={15}
                />
              </Link>
            </div>

            <div
              className={
                styles.similarGrid
              }
            >
              {similarProducts.map(
                (
                  item,
                ) => (
                  <Link
                    key={
                      item.slug
                    }
                    href={`/products/${item.slug}`}
                    className={
                      styles.similarCard
                    }
                  >
                    <div
                      className={
                        styles.similarImage
                      }
                    >
                      <img
                        src={
                          item.image
                        }
                        alt={
                          item.name
                        }
                      />
                    </div>

                    <span>
                      {
                        item.brand
                      }
                    </span>

                    <strong>
                      {
                        item.shortName
                      }
                    </strong>

                    <div>
                      <span>
                        <Star
                          size={12}
                          fill="currentColor"
                        />
                        {
                          item.rating
                        }
                      </span>

                      <strong>
                        {formatPrice(
                          item.price,
                        )}{" "}
                        EGP
                      </strong>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </section>
        </div>

        <ProductValueOffer
          product={
            product
          }
        />

        <div
          id="verified-reviews"
        >
          <ProductSocialProof
            product={
              product
            }
          />
        </div>

        <section
          className={
            styles.trustSection
          }
        >
          <div>
            <ShieldCheck
              size={23}
              strokeWidth={
                1.35
              }
            />

            <strong>
              AUTHENTIC
              PRODUCTS
            </strong>

            <span>
              Carefully
              selected for
              Vi2.
            </span>
          </div>

          <div>
            <PackageCheck
              size={23}
              strokeWidth={
                1.35
              }
            />

            <strong>
              SECURE
              PACKAGING
            </strong>

            <span>
              Prepared
              carefully for
              delivery.
            </span>
          </div>

          <div>
            <Truck
              size={23}
              strokeWidth={
                1.35
              }
            />

            <strong>
              ACROSS EGYPT
            </strong>

            <span>
              Simple local
              delivery
              experience.
            </span>
          </div>

          <div>
            <Leaf
              size={23}
              strokeWidth={
                1.35
              }
            />

            <strong>
              LIVE FULLY
            </strong>

            <span>
              Wellness
              made easier.
            </span>
          </div>
        </section>
      </main>

      {/* ======================================================
          MOBILE QUICK BUY
          ====================================================== */}
      <div
        className={
          styles.mobileBuyBar
        }
      >
        <div>
          <span>
            {
              product.shortName
            }
          </span>

          <strong>
            {formatPrice(
              purchaseMode ===
                "repeat"
                ? repeatPrice *
                    quantity
                : total,
            )}{" "}
            EGP
          </strong>
        </div>

        <button
          type="button"
          onClick={
            handleBuyNow
          }
        >
          BUY NOW
        </button>
      </div>
    </>
  );
}
