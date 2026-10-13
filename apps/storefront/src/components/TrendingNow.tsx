"use client";
import Link from "@/components/LocaleLink";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTickerMotion } from "@/hooks/use-ticker-motion";
import type { Product } from "@/types/product";
import styles from "./TrendingNow.module.css";

export default function TrendingNow({
  products = [],
}: { products?: Product[] } = {}) {
  const { isArabic, msg } = useLanguage();
  const {
    ref,
    repetitions,
    reducedMotion,
    manualPause,
    paused,
    browsing,
    togglePause,
    interactions,
  } = useTickerMotion(products.length);
  if (!products.length) return null;
  return (
    <section
      className={styles.section}
      ref={ref}
      {...interactions}
      data-no-translate
      data-browsing={browsing}
    >
      <div className={styles.heading}>
        <div>
          <span>{isArabic ? "اختيارات Vi2" : "VI2 PICKS"}</span>
          <h2>{isArabic ? "اكتشف المنتجات" : "EXPLORE PRODUCTS"}</h2>
        </div>
        <Link href="/shop">
          {isArabic ? "عرض الكل" : "VIEW ALL"}
          <ArrowRight size={16} strokeWidth={1.6} />
        </Link>
        {!reducedMotion && (
          <button
            type="button"
            className={styles.motionControl}
            onMouseDown={(event) => event.preventDefault()}
            onClick={togglePause}
            aria-label={msg(manualPause ? "ticker.resume" : "ticker.pause")}
            aria-pressed={manualPause}
          >
            {manualPause ? <Play size={15} /> : <Pause size={15} />}
          </button>
        )}
      </div>
      <div className={styles.viewport} dir="ltr">
        <div
          className={styles.track}
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          {[0, 1].map((group) => (
            <div
              className={styles.group}
              key={group}
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
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className={styles.productName}>
                              {product.name}
                            </span>
                          )}
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
