"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
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

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>{arabic ? "اختيارات Vi2" : "VI2 PICKS"}</span>
          <h2>{arabic ? "اكتشف المنتجات" : "EXPLORE PRODUCTS"}</h2>
        </div>

        <Link href="/shop">
          {arabic ? "عرض الكل" : "VIEW ALL"}
          <ArrowRight size={16} strokeWidth={1.6} />
        </Link>
      </div>

      <div className={styles.viewport} dir="ltr">
        <div className={styles.track}>
          {railProducts.map((product, index) => {
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
                <span className={styles.productName}>{product.shortName || product.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}