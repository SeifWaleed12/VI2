"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { ArrowRight, PackagePlus } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useCartAdd } from "@/hooks/use-cart-add";
import type { Product } from "@/types/product";

import styles from "./ValueSets.module.css";

// Bundles are Medusa products tagged "bundle" (an inventory kit in Admin), so
// one cart line takes stock from every part. Hidden when there are none.
type ValueSetsProps = {
  bundles?: Product[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits:
      Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function BundleCard({ bundle, index }: { bundle: Product; index: number }) {
  const { t, msg } = useLanguage();
  const { pending, added, failed, handleAdd } = useCartAdd(bundle);
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <span>0{index + 1}</span>
        <strong>{bundle.brand}</strong>
      </div>

      <Link href={`/products/${bundle.slug}`} className={styles.images}>
        {bundle.image && (
          <Image
            src={bundle.image}
            alt={bundle.name}
            width={360}
            height={360}
            sizes="(max-width: 900px) 42vw, 24vw"
            className={styles.image}
          />
        )}
      </Link>

      <div className={styles.content}>
        <h3>{bundle.name}</h3>

        <div className={styles.actionRow}>
          <strong>
            {formatPrice(bundle.price)} {msg("nav.egp")}
            {bundle.compareAtPrice && (
              <s className={styles.was}>
                {formatPrice(bundle.compareAtPrice)} {msg("nav.egp")}
              </s>
            )}
          </strong>

          <button type="button" onClick={handleAdd} disabled={pending || !bundle.variantId}>
            <PackagePlus size={16} strokeWidth={1.5} />
            {failed ? msg("catalog.retry") : t(added ? "ADDED" : "ADD SET")}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ValueSets({ bundles = [] }: ValueSetsProps) {
  const { t } = useLanguage();
  if (!bundles.length) return null;

  return (
    <section
      className={styles.section}
      aria-label={t("VI2 VALUE SETS")}
    >
      <div className={styles.heading}>
        <div>
          <span>{t("VI2 VALUE SETS")}</span>

          <h2>
            {t("BUILD A")}{" "}
            {t("ROUTINE.")}
          </h2>
        </div>

        <Link href="/shop">
          {t("SHOP INDIVIDUALLY")}
          <ArrowRight
            size={15}
            strokeWidth={1.5}
          />
        </Link>
      </div>

      <div className={styles.grid}>
        {bundles.map((bundle, index) => (
          <BundleCard key={bundle.id} bundle={bundle} index={index} />
        ))}
      </div>
    </section>
  );
}
