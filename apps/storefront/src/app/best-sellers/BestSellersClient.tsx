"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import BestSellerCard from "@/components/BestSellerCard";
import { products as fallbackProducts } from "@/data/products";
import { getProducts } from "@/lib/medusa";
import type { Product } from "@/types/product";

import styles from "./BestSellers.module.css";

type CategoryKey =
  | "All"
  | "Vitamins & Minerals"
  | "Sports Nutrition"
  | "Wellness"
  | "Protein"
  | "Creatine"
  | "Omega & Fish Oils";

const categories: CategoryKey[] = [
  "All",
  "Vitamins & Minerals",
  "Sports Nutrition",
  "Wellness",
  "Protein",
  "Creatine",
  "Omega & Fish Oils",
];

const arabicCategoryLabels: Record<CategoryKey, string> = {
  All: "الكل",
  "Vitamins & Minerals": "الفيتامينات والمعادن",
  "Sports Nutrition": "التغذية الرياضية",
  Wellness: "العافية",
  Protein: "البروتين",
  Creatine: "الكرياتين",
  "Omega & Fish Oils": "أوميجا وزيوت السمك",
};

function normalized(
  value: string,
) {
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

  if (
    category ===
    "Vitamins & Minerals"
  ) {
    return [
      "vitamin",
      "multi",
      "magnesium",
      "zinc",
      "calcium",
      "iron",
      "coq10",
    ].some(
      (word) =>
        haystack.includes(
          word,
        ),
    );
  }

  if (
    category ===
    "Sports Nutrition"
  ) {
    return [
      "protein",
      "whey",
      "creatine",
      "glutamine",
      "pre-workout",
      "mass gainer",
      "sports",
    ].some(
      (word) =>
        haystack.includes(
          word,
        ),
    );
  }

  if (
    category ===
    "Omega & Fish Oils"
  ) {
    return (
      haystack.includes(
        "omega",
      ) ||
      haystack.includes(
        "fish oil",
      )
    );
  }

  return haystack.includes(
    normalized(category),
  );
}

function rankProducts(
  list: Product[],
) {
  return [...list].sort(
    (a, b) =>
      Number(
        b.badge ===
          "Best Seller",
      ) -
        Number(
          a.badge ===
            "Best Seller",
        ) ||
      b.rating -
        a.rating ||
      b.reviewCount -
        a.reviewCount,
  );
}

export default function BestSellersClient({
  initialCategory,
  initialProducts,
}: {
  initialCategory: string;
  initialProducts?: Product[];
}) {
  const safeInitial =
    categories.includes(
      initialCategory as
        CategoryKey,
    )
      ? (initialCategory as
          CategoryKey)
      : "All";

  const [
    activeCategory,
    setActiveCategory,
  ] = useState<CategoryKey>(
    safeInitial,
  );

  const [fetchedProducts, setFetchedProducts] = useState<Product[]>(
    initialProducts || [],
  );

  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      let active = true;
      getProducts()
        .then((res) => {
          if (active && res.length > 0) {
            setFetchedProducts(res);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [initialProducts]);

  const sourceProducts =
    fetchedProducts.length > 0 ? fetchedProducts : fallbackProducts;

  const ranked =
    useMemo(
      () =>
        rankProducts(
          sourceProducts,
        ),
      [sourceProducts],
    );

  const visibleProducts =
    useMemo(
      () =>
        ranked.filter(
          (product) =>
            matchesCategory(
              product,
              activeCategory,
            ),
        ),
      [
        ranked,
        activeCategory,
      ],
    );

  return (
    <main className={styles.page}>
      <div
        className={
          styles.shell
        }
      >
        <nav
          className={
            styles.breadcrumbs
          }
          aria-label="Breadcrumb"
        >
          <Link href="/">
            Home
          </Link>

          <ChevronRight
            size={13}
            strokeWidth={
              1.4
            }
          />

          <span data-arabic-text="الأكثر مبيعًا">
            Best Sellers
          </span>
        </nav>

        <header
          className={
            styles.hero
          }
        >
          <div>
            <span>
              MOST-LOVED AT VI2
            </span>

            <h1 data-arabic-text="الأكثر مبيعًا.">
              BEST
              <br />
              SELLERS.
            </h1>
          </div>

          <div
            className={
              styles.heroCopy
            }
          >
            <p>
              The products
              customers keep
              coming back to —
              ranked by
              popularity,
              ratings and
              demand across the
              Vi2 catalog.
            </p>

            <Link href="/shop">
              SHOP ALL
              <ArrowRight
                size={15}
              />
            </Link>
          </div>
        </header>

        <section
          className={
            styles.categoryBar
          }
          aria-label="Best seller categories"
        >
          {categories.map(
            (
              category,
            ) => (
              <button
                key={
                  category
                }
                type="button"
                className={
                  activeCategory ===
                  category
                    ? styles.categoryActive
                    : ""
                }
                onClick={() =>
                  setActiveCategory(
                    category,
                  )
                }
              >
                <span data-arabic-text={arabicCategoryLabels[category]}>{category}</span>
              </button>
            ),
          )}
        </section>

        <div
          className={
            styles.resultsMeta
          }
        >
          <span data-arabic-text={`${visibleProducts.length} منتج`}>
            {
              visibleProducts.length
            }{" "}
            PRODUCTS
          </span>

          <strong>
            <span data-arabic-text={arabicCategoryLabels[activeCategory]}>{activeCategory}</span>
          </strong>
        </div>

        <section
          className={
            styles.grid
          }
        >
          {visibleProducts.map(
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
              />
            ),
          )}
        </section>

        {visibleProducts.length ===
          0 && (
          <div
            className={
              styles.empty
            }
          >
            <span>
              NO PRODUCTS IN
              THIS CATEGORY YET.
            </span>

            <button
              type="button"
              onClick={() =>
                setActiveCategory(
                  "All",
                )
              }
            >
              VIEW ALL BEST
              SELLERS
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
