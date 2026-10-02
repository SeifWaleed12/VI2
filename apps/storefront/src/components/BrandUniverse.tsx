"use client";

import styles from "./BrandUniverse.module.css";

const brands = [
  "Nutri-Nations",
  "Doctor's Best",
  "NOW Foods",
  "California Gold Nutrition",
  "Optimum Nutrition",
  "Big Ramy Labs",
];

const tickerBrands = Array.from(
  { length: 4 },
  () => brands,
).flat();

export default function BrandUniverse() {
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
