"use client";
import { LegacyTranslations } from "@/context/LanguageContext";

import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocaleRouter } from "@/hooks/use-locale-router";
import { useLanguage } from "@/context/LanguageContext";
import { flattenCategories, type Category } from "@/lib/category-tree";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";
import {
  getProductForm,
  getProductHealthGoals,
  healthGoals,
  matchesForm,
  matchesGoal,
  productForms,
} from "@/lib/catalogMeta";
import { getArabicProductSearchText } from "@/lib/arabicLocalization";

import styles from "./Shop.module.css";





const popularSearches = [
  "Creatine",
  "Protein",
  "Vitamin D3",
  "Magnesium",
  "Omega-3",
  "Ashwagandha",
];

const arabicCatalogLabels: Record<string, string> = {
  All: "الكل",
  Protein: "البروتين",
  Creatine: "الكرياتين",
  "Pre-Workout": "قبل التمرين",
  Vitamins: "الفيتامينات",
  Wellness: "العافية",
  "Mass Gainer": "زيادة الكتلة",
  Magnesium: "المغنيسيوم",
  "Vitamin D3": "فيتامين D3",
  "Omega-3": "أوميجا-3",
  Ashwagandha: "أشواجاندا",
};

const dietaryOptions = [
  "All Diets",
  "Vegan",
  "Keto",
  "Non-GMO",
];

const allergenOptions = [
  "All Allergen Filters",
  "Gluten-Free",
  "Dairy-Free",
  "Soy-Free",
];

type SortValue =
  | "featured"
  | "price-low"
  | "price-high"
  | "rating";

export default function ShopClient({
  products,
  initialCategories = [],
  selectedCategory = "All",
  categoryError = false,
}: {
  products: Product[];
  initialCategories?: Category[];
  selectedCategory?: string;
  categoryError?: boolean;
}) {
  const router = useLocaleRouter();
  const { msg } = useLanguage();
  const categories = useMemo(() => [{id:"All",name:msg("catalog.all")}, ...flattenCategories(initialCategories)], [initialCategories,msg]);
  function setCategory(id: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("category");
    if (id === "All") query.delete("category_id"); else query.set("category_id",id);
    router.push(`/shop${query.size ? `?${query}` : ""}`);
  }
  const category = selectedCategory;
  const brands = [
    "All Brands",
    ...Array.from(new Set(products.map((p) => p.brand))).sort(),
  ];

  const searchParams = useSearchParams();

  const requestedGoal =
    searchParams.get("goal");

  const requestedBrand =
    searchParams.get("brand");

  const requestedSearch =
    searchParams.get("q") ?? "";

  const validRequestedGoal =
    requestedGoal &&
    healthGoals.includes(
      requestedGoal as (typeof healthGoals)[number],
    )
      ? requestedGoal
      : "All Goals";

  const validRequestedBrand =
    requestedBrand &&
    brands.includes(requestedBrand)
      ? requestedBrand
      : "All Brands";

  const [search, setSearch] =
    useState(requestedSearch);


  const [goal, setGoal] =
    useState(validRequestedGoal);

  const [brand, setBrand] =
    useState(validRequestedBrand);

  const [form, setForm] =
    useState("All Forms");

  const [availabilityOnly, setAvailabilityOnly] =
    useState(false);

  const [diet, setDiet] =
    useState("All Diets");

  const [allergen, setAllergen] =
    useState("All Allergen Filters");

  const [sort, setSort] =
    useState<SortValue>("featured");

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  useEffect(() => {
    setSearch(requestedSearch);
  }, [requestedSearch]);



  useEffect(() => {
    setGoal(validRequestedGoal);
  }, [validRequestedGoal]);

  useEffect(() => {
    setBrand(validRequestedBrand);
  }, [validRequestedBrand]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const result = products.filter(
      (product) => {
        const matchesCategory = true; // Products already scoped by Medusa category IDs.

        const matchesBrand =
          brand === "All Brands" ||
          product.brand.toLowerCase() === brand.toLowerCase();

        const searchableText = [
          product.name,
          product.shortName,
          product.brand,
          product.category,
          product.flavor ?? "",
          product.size ?? "",
          getProductForm(product),
          ...getProductHealthGoals(product),
          getArabicProductSearchText(product),
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          normalizedSearch.length === 0 ||
          searchableText.includes(
            normalizedSearch,
          );

        const matchesAvailability =
          !availabilityOnly ||
          product.stock > 0;

        return (
          matchesCategory &&
          matchesBrand &&
          matchesSearch &&
          matchesGoal(product, goal) &&
          matchesForm(product, form) &&
          matchesAvailability
        );
      },
    );

    if (sort === "price-low") {
      return [...result].sort(
        (a, b) => a.price - b.price,
      );
    }

    if (sort === "price-high") {
      return [...result].sort(
        (a, b) => b.price - a.price,
      );
    }

    if (sort === "rating") {
      return [...result].sort(
        (a, b) =>
          b.rating - a.rating ||
          b.reviewCount - a.reviewCount,
      );
    }

    return result;
  }, [
    availabilityOnly,
    brand,
    category,
    form,
    goal,
    search,
    sort,
  ]);

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setGoal("All Goals");
    setBrand("All Brands");
    setForm("All Forms");
    setAvailabilityOnly(false);
    setDiet("All Diets");
    setAllergen("All Allergen Filters");
    setSort("featured");
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    category !== "All" ||
    goal !== "All Goals" ||
    brand !== "All Brands" ||
    form !== "All Forms" ||
    diet !== "All Diets" ||
    allergen !== "All Allergen Filters" ||
    availabilityOnly ||
    sort !== "featured";

  const filterContent = (
    <>
      <div className={styles.filterGroup}>
        <div className={styles.filterTitle}>
          HEALTH GOAL
        </div>

        <div className={styles.filterOptions}>
          {healthGoals.map((item) => (
            <button
              key={item}
              type="button"
              className={
                goal === item
                  ? styles.filterActive
                  : ""
              }
              onClick={() => setGoal(item)}
            >
              <span data-arabic-text={arabicCatalogLabels[item]}>{item}</span>

              {item !== "All Goals" && (
                <small>
                  {
                    products.filter((product) =>
                      matchesGoal(product, item),
                    ).length
                  }
                </small>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <div className={styles.filterTitle}>
          CATEGORY
        </div>

        <div className={styles.filterOptions}>
          {categoryError && <p role="status">{msg("catalog.error")}</p>}
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                category === item.id
                  ? styles.filterActive
                  : ""
              }
              onClick={() => setCategory(item.id)}
            >
              <span data-no-translate>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterSelect}>
          <span>BRAND</span>

          <select
            value={brand}
            onChange={(event) =>
              setBrand(event.target.value)
            }
          >
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterSelect}>
          <span>FORM</span>

          <select
            value={form}
            onChange={(event) =>
              setForm(event.target.value)
            }
          >
            {productForms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterSelect}>
          <span>DIET</span>

          <select
            value={diet}
            onChange={(event) =>
              setDiet(event.target.value)
            }
          >
            {dietaryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {diet !== "All Diets" && (
          <p className={styles.metadataNotice}>
            Verified dietary attributes must be
            supplied per SKU before launch.
          </p>
        )}
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterSelect}>
          <span>ALLERGEN-FREE</span>

          <select
            value={allergen}
            onChange={(event) =>
              setAllergen(event.target.value)
            }
          >
            {allergenOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {allergen !== "All Allergen Filters" && (
          <p className={styles.metadataNotice}>
            Verified manufacturer allergen data
            is required per SKU before launch.
          </p>
        )}
      </div>

      <label className={styles.checkFilter}>
        <input
          type="checkbox"
          checked={availabilityOnly}
          onChange={(event) =>
            setAvailabilityOnly(
              event.target.checked,
            )
          }
        />

        <span>IN STOCK ONLY</span>
      </label>
    </>
  );

  return (
    <LegacyTranslations><main className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.introCopy}>
          <span className={styles.eyebrow}>
            VI2 COLLECTION
          </span>

          <h1>SHOP</h1>

          <p>
            Search by product, brand, category or
            health goal — then narrow the catalog
            without slowing down the buying flow.
          </p>
        </div>

        <div className={styles.introWord}>
          VI2
        </div>
      </section>

      <section className={styles.controlSection}>
        <div className={styles.searchRow}>
          <label className={styles.searchBox}>
            <Search
              size={19}
              strokeWidth={1.5}
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={msg("search.placeholder")}
              aria-label={msg("search.products")}
            />

            {search && (
              <button
                type="button"
                aria-label={msg("search.clear")}
                onClick={() => setSearch("")}
              >
                <X size={17} strokeWidth={1.5} />
              </button>
            )}
          </label>

          <button
            type="button"
            className={styles.mobileFilterButton}
            onClick={() =>
              setMobileFiltersOpen(true)
            }
          >
            <SlidersHorizontal
              size={16}
              strokeWidth={1.5}
            />

            {msg("shop.filters")}
          </button>

          <label className={styles.sortWrap}>
            <span>{msg("shop.sort")}</span>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value as SortValue,
                )
              }
            >
              <option value="featured">
                {msg("shop.featured")}
              </option>

              <option value="price-low">
                {msg("shop.low")}
              </option>

              <option value="price-high">
                {msg("shop.high")}
              </option>
            </select>

            <ChevronDown
              size={14}
              strokeWidth={1.5}
            />
          </label>
        </div>

        <div className={styles.popularSearches}>
          <span>POPULAR:</span>

          {popularSearches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSearch(item)}
              data-arabic-text={arabicCatalogLabels[item]}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.catalogLayout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <strong>FILTER</strong>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
              >
                RESET
              </button>
            )}
          </div>

          {filterContent}
        </aside>

        <div className={styles.productsArea}>
          <div className={styles.resultsTop}>
            <div className={styles.resultCount}>
              <span data-arabic-text={`${filteredProducts.length} منتج`}>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1
                  ? "PRODUCT"
                  : "PRODUCTS"}
              </span>
            </div>

            <div className={styles.activeSummary}>
              {goal !== "All Goals" && (
                <span>{goal}</span>
              )}

              {category !== "All" && (
                <span data-no-translate>{categories.find(c => c.id === category)?.name}</span>
              )}

              {form !== "All Forms" && (
                <span>{form}</span>
              )}

              {diet !== "All Diets" && (
                <span>{diet}</span>
              )}

              {allergen !== "All Allergen Filters" && (
                <span>{allergen}</span>
              )}
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className={styles.grid}>
              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ),
              )}
            </div>
          ) : (
            <div className={styles.empty}>
              <h2 data-no-translate>{category !== "All" && products.length === 0 ? msg("catalog.noProducts") : "Nothing found."}</h2>

              <p>
                Try another product, health goal,
                category or brand.
              </p>

              <button
                type="button"
                onClick={clearFilters}
              >
                {msg("catalog.all")}
              </button>
            </div>
          )}
        </div>
      </section>

      {mobileFiltersOpen && (
        <div
          className={styles.filterBackdrop}
          role="presentation"
          onClick={() =>
            setMobileFiltersOpen(false)
          }
        >
          <aside
            className={styles.mobileFilters}
            role="dialog"
            aria-modal="true"
            aria-label={msg("shop.filters")}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className={styles.mobileFiltersHead}>
              <div>
                <span>VI2 CATALOG</span>
                <strong>FILTER PRODUCTS</strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen(false)
                }
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.mobileFiltersBody}>
              {filterContent}
            </div>

            <button
              type="button"
              className={styles.applyFilters}
              onClick={() =>
                setMobileFiltersOpen(false)
              }
              data-arabic-text={`عرض ${filteredProducts.length} منتج`}
            >
              SHOW {filteredProducts.length} PRODUCTS
            </button>
          </aside>
        </div>
      )}
    </main></LegacyTranslations>
  );
}
