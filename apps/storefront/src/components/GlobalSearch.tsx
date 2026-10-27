"use client";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";

import Image from "next/image";
import Link from "@/components/LocaleLink";
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
  useRef,
  useState,
} from "react";

import type { Product } from "@/types/product";
import { listCatalog } from "@/lib/medusa/services/catalog";

import styles from "./GlobalSearch.module.css";
import CatalogImage from "@/components/CatalogImage";

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

// Searching starts at two letters, once typing pauses.
export const SEARCH_MIN_CHARS = 2;
const SEARCH_DELAY_MS = 250;
const SUGGESTION_COUNT = 6;

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
  const router = useLocaleRouter();
  const { msg, language } = useLanguage();

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [query, setQuery] =
    useState("");

  const [recent, setRecent] =
    useState<string[]>([]);

  // The answer for one search term; an older answer never replaces a newer term's.
  const [found, setFound] = useState<{ key: string; products: Product[]; failed: boolean }>({ key: "", products: [], failed: false });
  const term = query.trim();
  const searchKey = `${language}:${term}`;
  const searchable = open && term.length >= SEARCH_MIN_CHARS;

  useEffect(() => {
    if (!searchable) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      listCatalog({ q: term, locale: language, limit: SUGGESTION_COUNT, sort: "default", signal: controller.signal })
        .then((page) => { if (active) setFound({ key: searchKey, products: page.products, failed: false }); })
        .catch(() => { if (active) setFound({ key: searchKey, products: [], failed: true }); });
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchable, term, language, searchKey]);

  const answered = searchable && found.key === searchKey;
  const searching = searchable && !answered;
  const searchFailed = answered && found.failed;
  const suggestions = answered ? found.products : [];

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
          // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage exists only after hydration
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


    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const copy = {
    search: msg("nav.search"), placeholder: msg("search.placeholder"),
    recent: msg("search.recent"), popular: msg("search.popular"),
    suggestions: msg("search.suggestions"),
    viewAll: msg("search.viewAll"), clear: msg("search.clear"), empty: msg("search.empty"),
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
        data-no-translate
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
            aria-label={msg("search.close")}
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

        {searchable && <>
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

        {searching ? (
          <p className={styles.empty} role="status">{msg("search.loading")}</p>
        ) : searchFailed ? (
          <p className={styles.empty} role="alert">{msg("search.error")}</p>
        ) : suggestions.length > 0 ? (
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
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={170}
                        height={190}
                      />
                    ) : (
                      <CatalogImage alt={product.name} />
                    )}
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
                      {product.reviewCount > 0 && (
                        <>
                          {" · "}
                          {product.rating}
                          ★
                        </>
                      )}
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
        </>}
      </section>
    </div>
  );
}
