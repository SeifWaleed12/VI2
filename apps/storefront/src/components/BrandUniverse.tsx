"use client";

import styles from "./BrandUniverse.module.css";

export default function BrandUniverse({ brands }: { brands: string[] }) {
  if (!brands.length) return null;
  const tickerBrands = Array.from({ length: 4 }, () => brands).flat();
  return (
    <section
      id="brands"
      className={styles.section}
      aria-label="Vi2 brands"
    >
      <div
        className={styles.marquee}
        aria-hidden="true"
        dir="ltr"
      >
        <div className={styles.track}>
          {[0, 1].map((group) => (
            <div
              key={group}
              className={styles.group}
            >
              {tickerBrands.map(
                (
                  brand,
                  index,
                ) => (
                  <div
                    key={`${group}-${index}-${brand}`}
                    className={
                      styles.item
                    }
                  >
                    <span>
                      {brand}
                    </span>
                    <i />
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
