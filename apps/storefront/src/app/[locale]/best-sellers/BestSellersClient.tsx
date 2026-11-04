"use client";
import { useLanguage } from "@/context/LanguageContext";

import Link from "@/components/LocaleLink";
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
  const { msg, language } = useLanguage();
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

  const [catalogError, setCatalogError] = useState(false);
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
        .catch(() => { if (active) setCatalogError(true); });
      return () => {
        active = false;
      };
    }
  }, [initialProducts]);

  const sourceProducts =
    fetchedProducts;

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
      {catalogError && <p role="alert">{msg("bestSellers.theCatalogIsTemporarilyUnavailable")}</p>}
      <div
        className={
          styles.shell
        }
      >
        <nav
          className={
            styles.breadcrumbs
          }
          aria-label={msg("bestSellers.breadcrumb")}
        >
          <Link href="/">{msg("bestSellers.home")}</Link>

          <ChevronRight
            size={13}
            strokeWidth={
              1.4
            }
          />

          <span>{msg("bestSellers.bestSellers")}</span>
        </nav>

        <header
          className={
            styles.hero
          }
        >
          <div>
            <span>{msg("bestSellers.mostLovedAtVi2")}</span>

            <h1>{msg("bestSellers.best")}<br />{msg("bestSellers.sellers")}</h1>
          </div>

          <div
            className={
              styles.heroCopy
            }
          >
            <p>{msg("bestSellers.productsSelectedByTheVi2")}</p>

            <Link href="/shop">{msg("bestSellers.shopAll")}<ArrowRight
                size={15}
              />
            </Link>
          </div>
        </header>

        <section
          className={
            styles.categoryBar
          }
          aria-label={msg("bestSellers.bestSellerCategories")}
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
                <span>{category}</span>
              </button>
            ),
          )}
        </section>

        <div
          className={
            styles.resultsMeta
          }
        >
          <span>
            {
              visibleProducts.length
            }{" "}{msg("bestSellers.products")}</span>

          <strong>
            <span>{language === "ar" ? arabicCategoryLabels[activeCategory] : activeCategory}</span>
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
            <span>{msg("bestSellers.noProductsInThisCategory")}</span>

            <button
              type="button"
              onClick={() =>
                setActiveCategory(
                  "All",
                )
              }
            >{msg("bestSellers.viewAllBestSellers")}</button>
          </div>
        )}
      </div>
    </main>
  );
}
