"use client";
import { useLanguage } from "@/context/LanguageContext";
import { useTickerMotion } from "@/hooks/use-ticker-motion";
import styles from "./BrandUniverse.module.css";

export default function BrandUniverse({ brands }: { brands: string[] }) {
  const { msg } = useLanguage();
  const {
    ref,
    repetitions,
    paused,
    interactions,
  } = useTickerMotion(brands.length, false);
  if (!brands.length) return null;
  return (
    <section
      id="brands"
      className={styles.section}
      aria-label={msg("nav.brands")}
      ref={ref}
      {...interactions}
      data-no-translate
      tabIndex={0}
    >
      <div className={styles.marquee} aria-hidden="true" dir="ltr">
        <div
          className={styles.track}
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          {[0, 1].map((group) => (
            <div
              key={group}
              className={styles.group}
              data-ticker-copy={group > 0 || undefined}
            >
              {Array.from({ length: repetitions }, (_, repeat) => (
                <div
                  className={styles.group}
                  key={repeat}
                  data-ticker-copy={repeat > 0 || undefined}
                  data-ticker-base={(group === 0 && repeat === 0) || undefined}
                >
                  {brands.map((brand) => (
                    <div key={brand} className={styles.item}>
                      <span>{brand}</span>
                      <i />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
