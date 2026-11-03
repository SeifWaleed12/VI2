"use client";
import Link from "@/components/LocaleLink";
import { ArrowRight } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { useProductRailScroll } from "@/hooks/use-product-rail-scroll";
import { useLanguage } from "@/context/LanguageContext";
import { useTickerMotion } from "@/hooks/use-ticker-motion";
import type { Product } from "@/types/product";
import styles from "./TrendingNow.module.css";

export default function TrendingNow({
  products = [],
}: { products?: Product[] } = {}) {
  const { isArabic } = useLanguage();
  const {
    ref,
    repetitions,
    paused,
    interactions,
  } = useTickerMotion(products.length, false);
  const { ref: viewportRef, touchInteractions } = useProductRailScroll(paused, products.map(product => product.id).join(","));
  if (!products.length) return null;
  return (
    <section
      className={styles.section}
      ref={ref}
      data-no-translate
      aria-label={isArabic ? "منتجات رائجة" : "Trending Products"}
    >
      <div className={styles.heading}>
        <h2>{isArabic ? "منتجات رائجة" : "TRENDING PRODUCTS"}</h2>
        <Link href="/shop">
          {isArabic ? "عرض الكل" : "VIEW ALL"}
          <ArrowRight size={16} strokeWidth={1.6} />
        </Link>
      </div>
      <div className={styles.viewport} dir="ltr" ref={viewportRef}
        {...touchInteractions}
        onFocus={interactions.onFocus} onBlur={interactions.onBlur}
        onPointerEnter={event => { if (event.pointerType === "mouse") interactions.onMouseEnter(); }}
        onPointerLeave={event => {
          if (event.pointerType === "mouse") interactions.onMouseLeave();
          touchInteractions.onPointerLeave(event);
        }}>
        <div
          className={styles.track}
        >
          {[0, 1].map((group) => (
            <div
              className={styles.group}
              key={group}
              data-scroll-cycle={group === 0 || undefined}
              data-ticker-copy={group === 1 || undefined}
              aria-hidden={group === 1 || undefined}
            >
              {Array.from({ length: repetitions }, (_, repeat) => (
                <div
                  className={styles.cycle}
                  key={repeat}
                  data-ticker-base={(group === 0 && repeat === 0) || undefined}
                  data-ticker-copy={repeat > 0 || undefined}
                  aria-hidden={repeat > 0 || undefined}
                >
                  {products.map((product) => {
                    const copy = group > 0 || repeat > 0;
                    return (
                      <Link
                        key={product.id}
                        href={"/products/" + product.slug}
                        className={styles.item}
                        tabIndex={copy ? -1 : undefined}
                        onMouseDown={
                          copy ? (event) => event.preventDefault() : undefined
                        }
                        aria-label={
                          (isArabic ? "عرض " : "View ") + product.name
                        }
                        title={product.name}
                        dir="auto"
                      >
                        <div className={styles.imageFrame}>
                          <CatalogImage src={product.image} alt={product.name}
                            className={styles.image} loading="lazy" decoding="async" />
                        </div>
                        <span className={styles.productName}>
                          {product.shortName || product.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
