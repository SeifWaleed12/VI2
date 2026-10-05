"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  PackagePlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import type { Product } from "@/types/product";

import styles from "./ValueSets.module.css";

type ValueSetsProps = {
  products?: Product[];
};

type SetDefinition = {
  eyebrow: string;
  title: string;
  description: string;
  slugs: [string, string];
};

const SETS: SetDefinition[] = [
  {
    eyebrow: "TRAIN + BUILD",
    title: "STRENGTH ROUTINE",
    description:
      "Creatine and whey together for a simple training routine.",
    slugs: [
      "nutri-nations-creatine",
      "whey-x",
    ],
  },
  {
    eyebrow: "EVERYDAY WELLNESS",
    title: "DAILY ESSENTIALS",
    description:
      "A simple daily pairing for general wellness support.",
    slugs: [
      "for-him-multivitamin",
      "omega-x",
    ],
  },
  {
    eyebrow: "REST + RECOVERY",
    title: "CALM + RECOVER",
    description:
      "Magnesium and ashwagandha in one recovery-focused set.",
    slugs: [
      "doctors-best-high-absorption-magnesium",
      "now-foods-ashwagandha-450",
    ],
  },
];

function resolveProduct(
  slug: string,
  liveProducts: Product[],
) {
  return liveProducts.find((product) => product.slug === slug);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits:
      Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

export default function ValueSets({
  products = [],
}: ValueSetsProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { addItem } = useCart();

  const sets = useMemo(
    () =>
      SETS.map((definition) => {
        const items = definition.slugs
          .map((slug) =>
            resolveProduct(slug, products),
          )
          .filter(
            (product): product is Product =>
              Boolean(product),
          );

        return {
          ...definition,
          items,
          total: items.reduce(
            (sum, product) =>
              sum + product.price,
            0,
          ),
        };
      }).filter((set) => set.items.length === set.slugs.length),
    [products],
  );

  async function addSet(items: Product[]) {
    const liveItems = items.filter(
      (product) =>
        Boolean(product.variantId),
    );

    if (
      liveItems.length !== items.length
    ) {
      router.push("/shop");
      return;
    }

    for (const product of liveItems) {
      await addItem(product, 1);
    }
  }

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
        {sets.map(
          (
            set,
            index,
          ) => {
            const [
              first,
              second,
            ] = set.items;

            return (
              <article
                key={set.title}
                className={styles.card}
              >
                <div
                  className={
                    styles.cardHead
                  }
                >
                  <span>
                    0{index + 1}
                  </span>

                  <strong>
                    {t(set.eyebrow)}
                  </strong>
                </div>

                <div
                  className={
                    styles.images
                  }
                >
                  {first && (
                    <Image
                      src={first.image}
                      alt={first.name}
                      width={360}
                      height={360}
                      sizes="(max-width: 900px) 42vw, 24vw"
                      className={
                        styles.imageOne
                      }
                    />
                  )}

                  {second && (
                    <Image
                      src={second.image}
                      alt={second.name}
                      width={360}
                      height={360}
                      sizes="(max-width: 900px) 42vw, 24vw"
                      className={
                        styles.imageTwo
                      }
                    />
                  )}
                </div>

                <div
                  className={
                    styles.content
                  }
                >
                  <h3>
                    {t(set.title)}
                  </h3>

                  <p>
                    {t(
                      set.description,
                    )}
                  </p>

                  <div
                    className={
                      styles.includes
                    }
                  >
                    {set.items.map(
                      (product) => (
                        <span
                          key={
                            product.id
                          }
                        >
                          <Check
                            size={11}
                            strokeWidth={
                              1.5
                            }
                          />
                          {t(
                            product.shortName,
                          )}
                        </span>
                      ),
                    )}
                  </div>

                  <div
                    className={
                      styles.actionRow
                    }
                  >
                    <strong>
                      {formatPrice(
                        set.total,
                      )}{" "}
                      EGP
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        addSet(
                          set.items,
                        )
                      }
                    >
                      <PackagePlus
                        size={16}
                        strokeWidth={
                          1.5
                        }
                      />
                      {t("ADD SET")}
                    </button>
                  </div>
                </div>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}
