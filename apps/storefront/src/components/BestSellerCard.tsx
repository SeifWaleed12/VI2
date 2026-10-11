"use client";

import Link from "@/components/LocaleLink";
import {
  Check,
  Plus,
  Star,
} from "lucide-react";

import { useCartAdd } from "@/hooks/use-cart-add";
import { useLanguage } from "@/context/LanguageContext";
import type { Product } from "@/types/product";

import styles from "./BestSellerCard.module.css";

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
    {
      notation:
        value >= 10000
          ? "compact"
          : "standard",
      maximumFractionDigits: 1,
    },
  ).format(value);
}

export default function BestSellerCard({
  product,
  rank,
  compact = false,
}: {
  product: Product;
  rank?: number;
  compact?: boolean;
}) {
  const { pending, added, failed, handleAdd } = useCartAdd(product);
  const { isArabic } = useLanguage();
  const status = pending ? (isArabic ? "جارٍ الإضافة…" : "Adding…") : failed ? (isArabic ? "تعذرت الإضافة. حاول مجددًا." : "Could not add. Try again.") : added ? (isArabic ? "تمت الإضافة" : "Added") : "";

  return (
    <article
      className={
        compact
          ? `${styles.card} ${styles.compact}`
          : styles.card
      }
    >
      <Link
        href={`/products/${product.slug}`}
        className={styles.imageArea}
        aria-label={`View ${product.name}`}
      >
        {typeof rank ===
          "number" && (
          <span
            className={
              styles.rank
            }
          >
            {rank}
          </span>
        )}

        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={styles.image}
        />
      </Link>

      <div className={styles.content}>
        <span className={styles.brand}>
          {product.brand}
        </span>

        <Link
          href={`/products/${product.slug}`}
          className={styles.name}
        >
          {product.shortName}
        </Link>

        {product.reviewCount > 0 && (<div className={styles.rating}>
          <strong>
            {product.rating}
          </strong>

          <Star
            size={13}
            strokeWidth={1.35}
            fill="currentColor"
          />

          <span>
            {formatReviews(
              product.reviewCount,
            )}
          </span>
        </div>)}

        <div className={styles.bottom}>
          <div className={styles.price}>
            <strong>
              {formatPrice(
                product.price,
              )}{" "}
              EGP
            </strong>

            {product.compareAtPrice && (
              <span>
                {formatPrice(
                  product.compareAtPrice,
                )}{" "}
                EGP
              </span>
            )}
          </div>

          <button
            type="button"
            className={styles.addButton}
            disabled={pending}
            aria-busy={pending}
            onClick={handleAdd}
            aria-label={pending ? status : isArabic ? `أضف ${product.name} إلى السلة` : `Add ${product.name} to cart`}
          >
            {added ? (
              <>
                <Check
                  size={15}
                  strokeWidth={1.8}
                />

                {!compact && (
                  <span>
                    ADDED
                  </span>
                )}
              </>
            ) : (
              <>
                <Plus
                  size={16}
                  strokeWidth={1.8}
                />

                {!compact && (
                  <span>
                    ADD
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className={styles.addStatus}>{status}</p>
    </article>
  );
}
