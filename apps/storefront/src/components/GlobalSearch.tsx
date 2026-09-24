"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { Product } from "@/types/product";
import { getProducts } from "@/lib/medusa";
import {
  getProductHealthGoals,
} from "@/lib/catalogMeta";
import { getArabicProductSearchText } from "@/lib/arabicLocalization";

import styles from "./GlobalSearch.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  isArabic: boolean;
};

const popularSearches = [
  "Creatine",
  "Protein",
  "Magnesium",
  "Vitamin D3",
  "Omega-3",
  "Ashwagandha",
];

const arabicPopularSearches: Record<string, string> = {
  Creatine: "الكرياتين",
  Protein: "البروتين",
  Magnesium: "المغنيسيوم",
  "Vitamin D3": "فيتامين D3",
  "Omega-3": "أوميجا-3",
  Ashwagandha: "أشواجاندا",
};

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
  ).format(value);
}

export default function GlobalSearch({
  open,
  onClose,
  isArabic,
}: Props) {
  const router = useRouter();

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [query, setQuery] =
    useState("");

  const [recent, setRecent] =
    useState<string[]>([]);

  const [medusaProducts, setMedusaProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    getProducts()
      .then((res) => {
        if (active && res.length > 0) {
          setMedusaProducts(res);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const catalogProducts = useMemo(() => {
    return medusaProducts;
  }, [medusaProducts]);

  useEffect(() => {
    if (!open) {
      return;
    }

    try {
      const raw =
        window.localStorage.getItem(
          "vi2-recent-searches",
        );

      if (raw) {
        const parsed =
          JSON.parse(raw);

        if (
          Array.isArray(parsed)
        ) {
          setRecent(
            parsed
              .filter(
                (item):
                  item is string =>
                    typeof item ===
                    "string",
              )
              .slice(0, 5),
          );
        }
      }
    } catch {
      setRecent([]);
    }

    const timer =
      window.setTimeout(
        () =>
          inputRef.current?.focus(),
        60,
      );

    document.body.style.overflow =
      "hidden";

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow =
        "";
    };
  }, [open]);

  const suggestions =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return catalogProducts
          .filter(
            (product) =>
              product.badge ===
                "Best Seller" ||
              product.rating >= 4.8,
          )
          .slice(0, 6);
      }

      return catalogProducts
        .map((product) => {
          const searchable = [
            product.name,
            product.shortName,
            product.brand,
            product.category,
            product.flavor ?? "",
            product.size ?? "",
            ...getProductHealthGoals(
              product,
            ),
            getArabicProductSearchText(product),
          ]
            .join(" ")
            .toLowerCase();

          let score = 0;

          if (
            product.shortName
              .toLowerCase()
              .startsWith(
                normalized,
              )
          ) {
            score += 6;
          }

          if (
            product.name
              .toLowerCase()
              .includes(
                normalized,
              )
          ) {
            score += 4;
          }

          if (
            product.brand
              .toLowerCase()
              .includes(
                normalized,
              )
          ) {
            score += 3;
          }

          if (
            searchable.includes(
              normalized,
            )
          ) {
            score += 2;
          }

          return {
            product,
            score,
          };
        })
        .filter(
          (entry) =>
            entry.score > 0,
        )
        .sort(
          (a, b) =>
            b.score -
            a.score,
        )
        .slice(0, 8)
        .map(
          (entry) =>
            entry.product,
        );
    }, [catalogProducts, query]);

  if (!open) {
    return null;
  }

  const copy = isArabic
    ? {
        search: "ابحث في Vi2",
        placeholder:
          "منتج، علامة تجارية، هدف صحي...",
        recent: "عمليات البحث الأخيرة",
        popular: "الأكثر بحثاً",
        suggestions:
          query.trim()
            ? "نتائج مقترحة"
            : "اختيارات شائعة",
        viewAll: "عرض كل النتائج",
        clear: "مسح",
        empty:
          "جرّب اسم منتج أو علامة تجارية أو هدف صحي آخر.",
      }
    : {
        search: "SEARCH VI2",
        placeholder:
          "Product, brand, health goal...",
        recent: "RECENT SEARCHES",
        popular: "POPULAR SEARCHES",
        suggestions:
          query.trim()
            ? "SUGGESTED RESULTS"
            : "POPULAR PICKS",
        viewAll: "VIEW ALL RESULTS",
        clear: "CLEAR",
        empty:
          "Try another product, brand, category or health goal.",
      };

  function remember(
    value: string,
  ) {
    const clean =
      value.trim();

    if (!clean) {
      return;
    }

    const next = [
      clean,
      ...recent.filter(
        (item) =>
          item.toLowerCase() !==
          clean.toLowerCase(),
      ),
    ].slice(0, 5);

    setRecent(next);

    try {
      window.localStorage.setItem(
        "vi2-recent-searches",
        JSON.stringify(next),
      );
    } catch {
      // Search still works without persistence.
    }
  }

  function goToSearch(
    value: string,
  ) {
    const clean =
      value.trim();

    if (!clean) {
      return;
    }

    remember(clean);
    onClose();

    router.push(
      `/shop?q=${encodeURIComponent(
        clean,
      )}`,
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    goToSearch(query);
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={copy.search}
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className={styles.header}>
          <div>
            <span>VI2</span>
            <strong>
              {copy.search}
            </strong>
          </div>

          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
          >
            <X
              size={22}
              strokeWidth={1.35}
            />
          </button>
        </header>

        <form
          className={styles.searchForm}
          onSubmit={handleSubmit}
        >
          <Search
            size={22}
            strokeWidth={1.35}
          />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder={
              copy.placeholder
            }
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={() =>
                setQuery("")
              }
            >
              <X
                size={17}
                strokeWidth={1.4}
              />
            </button>
          )}
        </form>

        <div className={styles.quickArea}>
          {recent.length > 0 && (
            <div
              className={styles.quickGroup}
            >
              <div
                className={
                  styles.quickHeading
                }
              >
                <span>
                  <Clock3
                    size={13}
                    strokeWidth={1.4}
                  />
                  {copy.recent}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);

                    try {
                      window.localStorage.removeItem(
                        "vi2-recent-searches",
                      );
                    } catch {
                      // Ignore.
                    }
                  }}
                >
                  {copy.clear}
                </button>
              </div>

              <div className={styles.tags}>
                {recent.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        goToSearch(
                          item,
                        )
                      }
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          <div
            className={styles.quickGroup}
          >
            <div
              className={
                styles.quickHeading
              }
            >
              <span>
                <TrendingUp
                  size={13}
                  strokeWidth={1.4}
                />
                {copy.popular}
              </span>
            </div>

            <div className={styles.tags}>
              {popularSearches.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      goToSearch(
                        item,
                      )
                    }
                    data-arabic-text={arabicPopularSearches[item]}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className={styles.resultsHead}>
          <span>
            {copy.suggestions}
          </span>

          {query.trim() && (
            <button
              type="button"
              onClick={() =>
                goToSearch(
                  query,
                )
              }
            >
              {copy.viewAll}
              <ArrowRight
                size={14}
                strokeWidth={1.4}
              />
            </button>
          )}
        </div>

        {suggestions.length > 0 ? (
          <div className={styles.results}>
            {suggestions.map(
              (product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={
                    styles.result
                  }
                  onClick={() => {
                    remember(
                      product.shortName,
                    );
                    onClose();
                  }}
                >
                  <div
                    className={
                      styles.image
                    }
                  >
                    <Image
                      src={
                        product.image
                      }
                      alt={
                        product.name
                      }
                      width={170}
                      height={190}
                    />
                  </div>

                  <div
                    className={
                      styles.resultCopy
                    }
                  >
                    <span>
                      {product.brand}
                    </span>

                    <strong>
                      {
                        product.shortName
                      }
                    </strong>

                    <small>
                      {product.category}
                      {" · "}
                      {product.rating}
                      ★
                    </small>
                  </div>

                  <div
                    className={
                      styles.resultPrice
                    }
                  >
                    <strong>
                      {formatPrice(
                        product.price,
                      )}
                    </strong>
                    <span>EGP</span>
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            <Search
              size={24}
              strokeWidth={1.2}
            />
            <p>{copy.empty}</p>
          </div>
        )}
      </section>
    </div>
  );
}
