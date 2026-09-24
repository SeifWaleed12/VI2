"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Star,
} from "lucide-react";

import type { Product } from "@/types/product";
import { getStockLabel } from "@/lib/catalogMeta";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./ProductCard.module.css";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-EG").format(value);
}

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const { addItem } = useCart();
  const { t } = useLanguage();

  return (
    <article className={styles.card}>
      <Link
        href={`/products/${product.slug}`}
        className={styles.imageArea}
        aria-label={`View ${product.name}`}
      >
        {product.badge && (
          <span className={styles.badge} data-arabic-text={t(product.badge)}>
            {t(product.badge)}
          </span>
        )}

        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            width={700}
            height={800}
            className={styles.image}
          />
        ) : (
          <div
            className={styles.image}
            style={{
              background: "#f0ece4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              color: "#aaa",
            }}
          >
            NO IMAGE
          </div>
        )}
      </Link>

      <div className={styles.content}>
        <div className={styles.topLine}>
          <span className={styles.brand}>
            {product.brand}
          </span>

          <div
            className={styles.rating}
            aria-label={`${product.rating} out of 5 stars`}
          >
            <Star
              size={11}
              fill="currentColor"
              strokeWidth={1.5}
            />

            <span>{product.rating}</span>
            {product.reviewCount ? (
              <span className={styles.reviewCount}>
                ({product.reviewCount})
              </span>
            ) : null}
          </div>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className={styles.name}
        >
          {product.shortName}
        </Link>

        <p className={styles.meta}>
          {[product.flavor, product.size, product.servings ? `${product.servings} Servings` : ""]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className={styles.stockLine}>
          <span
            className={
              product.stock <= 8
                ? styles.lowStock
                : ""
            }
          />
          {getStockLabel(product)}
        </div>

        <div className={styles.bottom}>
          <div className={styles.price}>
            <strong>
              {formatPrice(product.price)} EGP
            </strong>

            {product.compareAtPrice && (
              <span>
                {formatPrice(product.compareAtPrice)} EGP
              </span>
            )}
          </div>

          <button
            type="button"
            className={styles.addButton}
            aria-label={`Add ${product.name} to cart`}
            onClick={() => addItem(product)}
          >
            <Plus
              size={18}
              strokeWidth={1.6}
            />
          </button>
        </div>
      </div>
    </article>
  );
}
