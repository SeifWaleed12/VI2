"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Product } from "@/types/product";
import styles from "./TrendingNow.module.css";

export default function TrendingNow({
  products: passedProducts,
}: {
  products?: Product[];
} = {}) {
  const [arabic, setArabic] = useState(false);

  useEffect(() => {
    const updateLanguage = () => {
      setArabic(document.documentElement.dir === "rtl");
    };

    updateLanguage();

    const observer = new MutationObserver(updateLanguage);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });

    window.addEventListener("storage", updateLanguage);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateLanguage);
    };
  }, []);

  const railProducts = useMemo(() => {
    return (passedProducts || []).filter(Boolean);
  }, [passedProducts]);

  if (railProducts.length === 0) {
    return null;
  }

  // Duplicate for smooth marquee effect if multiple products, otherwise repeat to fill track
  const movingProducts =
    railProducts.length >= 6
      ? [...railProducts, ...railProducts]
      : Array(Math.ceil(12 / railProducts.length))
          .fill(railProducts)
          .flat();

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>{arabic ? "اختيارات Vi2" : "VI2 PICKS"}</span>
          <h2>{arabic ? "رائج دلوقتي" : "TRENDING NOW"}</h2>
        </div>

        <Link href="/shop">
          {arabic ? "عرض الكل" : "VIEW ALL"}
          <ArrowRight size={16} strokeWidth={1.6} />
        </Link>
      </div>

      <div className={styles.viewport} dir="ltr">
        <div className={styles.track}>
          {movingProducts.map((product, index) => {
            const image = product.image;

            return (
              <Link
                key={`${product.slug}-${index}`}
                href={`/products/${product.slug}`}
                className={styles.item}
                aria-label={arabic ? `عرض ${product.name}` : `View ${product.name}`}
                title={product.name}
                dir="ltr"
              >
                <div className={styles.imageFrame}>
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span style={{ fontSize: "10px", color: "#888" }}>
                      {product.name}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}