"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowRight,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";

import BestSellerCard from "@/components/BestSellerCard";
import type { Product } from "@/types/product";

import styles from "./HomeBestSellers.module.css";

type CategoryKey =
  | "All"
  | "Vitamins & Minerals"
  | "Sports Nutrition"
  | "Wellness"
  | "Protein";

const bestSellerTabs = [
  {
    label: "ALL",
    category: "All",
  },
  {
    label: "VITAMINS & MINERALS",
    category: "Vitamins & Minerals",
  },
  {
    label: "SPORTS NUTRITION",
    category: "Sports Nutrition",
  },
  {
    label: "WELLNESS",
    category: "Wellness",
  },
  {
    label: "PROTEIN",
    category: "Protein",
  },
] satisfies Array<{
  label: string;
  category: CategoryKey;
}>;

function normalized(value: string) {
  return value.toLowerCase();
}

function matchesCategory(
  product: Product,
  category: CategoryKey,
) {
  if (category === "All") {
    return true;
  }

  const haystack = normalized(
    [
      product.category,
      product.name,
      product.shortName,
      product.description,
    ].join(" "),
  );

  if (category === "Vitamins & Minerals") {
    return [
      "vitamin",
      "multi",
      "magnesium",
      "zinc",
      "calcium",
      "iron",
      "coq10",
    ].some((word) => haystack.includes(word));
  }

  if (category === "Sports Nutrition") {
    return [
      "protein",
      "whey",
      "creatine",
      "glutamine",
      "pre-workout",
      "mass gainer",
      "sports",
    ].some((word) => haystack.includes(word));
  }

  return haystack.includes(normalized(category));
}

export default function HomeBestSellers({
  initialProducts,
}: {
  initialProducts?: Product[];
}) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("All");

  const rankedProducts = useMemo(() => {
    if (!initialProducts || initialProducts.length === 0) {
      return [];
    }
    return [...initialProducts].sort(
      (a, b) =>
        Number(b.badge === "Best Seller") - Number(a.badge === "Best Seller") ||
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount,
    );
  }, [initialProducts]);

  const bestSellers = useMemo(
    () =>
      rankedProducts
        .filter((product) =>
          matchesCategory(
            product,
            activeCategory,
          ),
        )
        .slice(0, 8),
    [rankedProducts, activeCategory],
  );

  if (bestSellers.length === 0 && activeCategory === "All") {
    return null;
  }

  return (
    <section
      id="best-sellers"
      className={
        styles.section
      }
    >
      <div
        className={
          styles.shell
        }
      >
        <div
          className={
            styles.heading
          }
        >
          <div
            className={
              styles.titleWrap
            }
          >
            <div
              className={
                styles.kicker
              }
            >
              <Trophy
                size={14}
                strokeWidth={
                  1.45
                }
              />

              <span>{t("POPULAR RIGHT NOW")}</span>
            </div>

            <h2 data-arabic-text="الأكثر مبيعًا">{t("BEST SELLERS")}</h2>
          </div>

          <button
            type="button"
            className={
              styles.viewAll
            }
            onClick={() =>
              setActiveCategory("All")
            }
          >{t("VIEW ALL")}<ArrowRight
              size={15}
              strokeWidth={
                1.5
              }
            />
          </button>
        </div>

        <div
          className={
            styles.tabs
          }
        >
          {bestSellerTabs.map(
            (
              tab,
            ) => (
              <button
                key={
                  tab.label
                }
                type="button"
                className={
                  activeCategory ===
                  tab.category
                    ? styles.activeTab
                    : ""
                }
                onClick={() =>
                  setActiveCategory(
                    tab.category,
                  )
                }
              >
                {
                  t(tab.label)
                }
              </button>
            ),
          )}
        </div>

        <div
          className={
            styles.rail
          }
        >
          {t(bestSellers.map(
            (
              product,
              index,
            ) => (
              <BestSellerCard
                key={
                  product.id
                }
                product={
                  product
                }
                rank={
                  index + 1
                }
                compact
              />
            ),
          ))}
        </div>
      </div>
    </section>
  );
}
