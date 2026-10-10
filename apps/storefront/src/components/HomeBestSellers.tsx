"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

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

  const rankedProducts = useMemo(() => initialProducts || [], [initialProducts]);

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
            <h2 data-arabic-text="تسوق المنتجات">{t("SHOP PRODUCTS")}</h2>
          </div>

          <Link
            href="/shop"
            className={styles.viewAll}
          >{t("VIEW ALL")}<ArrowRight
              size={15}
              strokeWidth={
                1.5
              }
            />
          </Link>
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
                aria-pressed={activeCategory === tab.category}
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
          {bestSellers.length === 0 && (
            <div role="status" className={styles.emptyState}>
              <p>{t("No products in this category yet.")}</p>
              <button type="button" onClick={() => setActiveCategory("All")}>{t("SHOW ALL CATEGORIES")}</button>
            </div>
          )}
          {t(bestSellers.map(
            (
              product,
            ) => (
              <BestSellerCard
                key={
                  product.id
                }
                product={
                  product
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
