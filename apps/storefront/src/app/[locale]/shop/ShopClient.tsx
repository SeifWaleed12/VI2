"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "@/components/LocaleLink";
import ProductCard from "@/components/ProductCard";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { useDrawerFocus } from "@/hooks/use-drawer-focus";
import { message, type Locale } from "@/lib/i18n";
import type { Category } from "@/lib/category-tree";
import type { Brand } from "@/types/brand";
import type { ProductPage } from "@/lib/medusa/services/products";
import { CATALOG_SORTS, type CatalogSort } from "@/lib/catalog-sort";
import { goalLabelKey, isHealthGoal } from "@/lib/health-goals";
import { shopHref, updateShopQuery } from "@/lib/shop-query";
import ShopFilters, { type FilterSelection } from "./ShopFilters";
import styles from "./Shop.module.css";

export type ShopProps = {
  locale: Locale;
  page: ProductPage;
  categories: Category[];
  brands: Brand[];
  categoryError: boolean;
  brandError: boolean;
  category: Category | null;
  handle: string;
  query: string;
  filters: { q: string; brandIds: string[]; goal: string; page: number; sort?: CatalogSort; deals?: boolean };
  error: "invalid" | "unavailable" | null;
  // Shown between the heading and the catalog (the Deals page puts Bundles here).
  lead?: ReactNode;
};

export default function ShopClient(props: ShopProps) {
  const { locale, page, category, handle, query, filters, error } = props;
  const msg = (key: Parameters<typeof message>[1]) => message(locale, key);
  const router = useLocaleRouter();
  const refreshRouter = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterSelection>({
    handle,
    brandIds: filters.brandIds,
    goal: filters.goal,
  });
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // This Next.js router scrolls to fragments but deliberately leaves focus untouched.
    if (window.location.hash === "#shop-results")
      results.current?.focus({ preventScroll: true });
  }, [handle]);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDrawerFocus(dialog, open, close);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 981px)");
    const onResize = () => {
      if (media.matches) close();
    };
    media.addEventListener("change", onResize);
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      media.removeEventListener("change", onResize);
    };
  }, [open, close]);

  const retry = () => startTransition(() => refreshRouter.refresh());
  function navigate(
    selection: FilterSelection,
    changes: Record<string, string | string[] | null> = {},
  ) {
    close();
    const next = updateShopQuery(query, {
      brand_id: selection.brandIds,
      goal: selection.goal || null,
      ...changes,
    });
    startTransition(() =>
      router.push(
        shopHref(selection.handle, next) + (selection.handle !== handle ? "#shop-results" : (typeof window === "undefined" ? "" : window.location.hash)),
        { scroll: selection.handle !== handle },
      ),
    );
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    navigate({ handle, brandIds: filters.brandIds, goal: filters.goal }, { q });
  }
  const allHref = shopHref(
    "",
    updateShopQuery(query, {
      q: null,
      brand_id: null,
      goal: null,
      form: null,
      diet: null,
      allergen: null,
      rating: null,
      sort: error === "invalid" ? null : (filters.sort ?? "default"),
      deals: filters.deals ? "1" : null,
      availability: null,
    }),
  );
  const selection = { handle, brandIds: filters.brandIds, goal: filters.goal };
  const totalPages = Math.ceil(page.count / page.limit);
  const number = (value: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG").format(value);
  const filterProps = {
    locale,
    categories: props.categories,
    brands: props.brands,
    categoryError: props.categoryError,
    brandError: props.brandError,
    retry,
  };
  const active = Boolean(handle || filters.q || filters.brandIds.length || filters.goal);
  const brandNames = filters.brandIds.map((id) => ({
    id,
    name: props.brands.find((brand) => brand.id === id)?.name ?? id,
  }));
  const pageHref = (index: number) =>
    shopHref(
      handle,
      updateShopQuery(query, { page: index === 1 ? null : String(index) }),
    ) + "#shop-results";
  return (
    <main className={styles.page} data-no-translate>
      <nav className={styles.breadcrumb} aria-label={msg("shop.breadcrumb")}>
        <Link href="/">{msg("nav.home")}</Link>
        <span aria-hidden="true">/</span>
        {category ? (
          <>
            <Link href="/shop">{msg("shop.title")}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{category.name}</span>
          </>
        ) : (
          <span aria-current="page">{msg("shop.title")}</span>
        )}
      </nav>
      <header className={styles.intro}>
        <h1>{category?.name ?? msg(filters.deals ? "deals.title" : "shop.title")}</h1>
        <p>{msg(filters.deals ? "deals.description" : "shop.description")}</p>
      </header>
      {props.lead}
      <div className={styles.catalogLayout}>
        <aside className={styles.sidebar} aria-label={msg("shop.filters")}>
          <div className={styles.sidebarTop}>
            <h2>{msg("shop.filters")}</h2>
            {active && <Link href={allHref}>{msg("shop.clearAll")}</Link>}
          </div>
          <ShopFilters
            {...filterProps}
            value={selection}
            linkTo={selection =>
              shopHref(selection.handle, updateShopQuery(query, { brand_id: selection.brandIds, goal: selection.goal || null })) +
              (selection.handle !== handle ? "#shop-results" : "")
            }
          />
        </aside>
        <section
          className={styles.productsArea}
          aria-label={msg("catalog.all")}
          aria-busy={pending}
        >
          <div className={styles.toolbar}>
            <form
              className={styles.searchBox}
              onSubmit={search}
              role="search"
              aria-label={msg("search.products")}
            >
              <Search size={20} strokeWidth={1.5} aria-hidden="true" />
              <input
                key={filters.q}
                type="search"
                name="q"
                defaultValue={filters.q}
                maxLength={100}
                placeholder={msg("shop.searchPlaceholder")}
                aria-label={msg("search.products")}
              />
              <button type="submit" disabled={pending}>
                {msg("shop.search")}
              </button>
            </form>
            <button
              className={styles.mobileFilterButton}
              type="button"
              aria-haspopup="dialog"
              aria-controls="shop-filters"
              aria-expanded={open}
              onClick={() => {
                setDraft(selection);
                setOpen(true);
              }}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              {msg("shop.filters")}
            </button>
            <label className={styles.sortControl}>
              <span>{msg("shop.sort")}</span>
              <select aria-label={msg("shop.sort")} value={filters.sort ?? "default"} disabled={pending}
                onChange={event => navigate(selection, { sort: event.target.value === "default" ? null : event.target.value })}>
                {CATALOG_SORTS.map(sort => <option key={sort} value={sort}>{msg(`shop.sort.${sort}`)}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.resultsTop} id="shop-results" ref={results} tabIndex={-1}>
            <p role="status" aria-live="polite">
              {pending
                ? msg("shop.loading")
                : error
                  ? msg("shop.resultsUnavailable")
                  : `${number(page.count)} ${msg(page.count === 1 ? "shop.product" : "shop.products")}`}
            </p>
            {!error && page.products.length > 0 && (
              <span>
                {number(page.offset + 1)}–
                {number(page.offset + page.products.length)} {msg("shop.of")}{" "}
                {number(page.count)}
              </span>
            )}
          </div>
          {active && (
            <div
              className={styles.activeFilters}
              aria-label={msg("shop.activeFilters")}
            >
              {category && (
                <Link
                  href={shopHref("", updateShopQuery(query, {}))}
                  aria-label={`${msg("shop.removeFilter")}: ${category.name}`}
                >
                  {category.name}
                  <X size={14} aria-hidden="true" />
                </Link>
              )}
              {filters.q && (
                <Link
                  href={shopHref(handle, updateShopQuery(query, { q: null }))}
                  aria-label={`${msg("search.clear")}: ${filters.q}`}
                >
                  “{filters.q}”<X size={14} aria-hidden="true" />
                </Link>
              )}
              {filters.goal && isHealthGoal(filters.goal) && (
                <Link
                  href={shopHref(handle, updateShopQuery(query, { goal: null }))}
                  aria-label={`${msg("shop.removeFilter")}: ${msg(goalLabelKey(filters.goal))}`}
                >
                  {msg(goalLabelKey(filters.goal))}<X size={14} aria-hidden="true" />
                </Link>
              )}
              {brandNames.map((brand) => (
                <Link
                  key={brand.id}
                  href={shopHref(
                    handle,
                    updateShopQuery(query, {
                      brand_id: filters.brandIds.filter(
                        (id) => id !== brand.id,
                      ),
                    }),
                  )}
                  aria-label={`${msg("shop.removeFilter")}: ${brand.name}`}
                >
                  {brand.name}
                  <X size={14} aria-hidden="true" />
                </Link>
              ))}
              <Link href={allHref} className={styles.clearLink}>
                {msg("shop.clearAll")}
              </Link>
            </div>
          )}
          {error ? (
            <div className={styles.empty} role="alert">
              <h2>
                {msg(
                  error === "invalid" ? "shop.invalidTitle" : "shop.errorTitle",
                )}
              </h2>
              <p>
                {msg(
                  error === "invalid"
                    ? "shop.invalidDescription"
                    : "shop.errorDescription",
                )}
              </p>
              <div className={styles.actions}>
                {error === "unavailable" && (
                  <button type="button" onClick={retry} disabled={pending}>
                    {msg("catalog.retry")}
                  </button>
                )}
                <Link href="/shop">{msg("catalog.all")}</Link>
              </div>
            </div>
          ) : page.products.length ? (
            <>
              <div className={styles.grid}>
                {page.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {totalPages > 1 && (
                <nav
                  className={styles.pagination}
                  aria-label={msg("shop.pagination")}
                >
                  {filters.page > 1 ? (
                    <Link href={pageHref(filters.page - 1)} rel="prev">
                      <ChevronLeft size={18} aria-hidden="true" />
                      {msg("shop.previous")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span aria-current="page">
                    {msg("shop.page")} {number(filters.page)} {msg("shop.of")}{" "}
                    {number(totalPages)}
                  </span>
                  {filters.page < totalPages ? (
                    <Link href={pageHref(filters.page + 1)} rel="next">
                      {msg("shop.next")}
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className={styles.empty}>
              <h2>
                {msg(page.count > 0 ? "shop.pastEndTitle" : "shop.emptyTitle")}
              </h2>
              <p>
                {msg(
                  page.count > 0
                    ? "shop.pastEndDescription"
                    : "shop.emptyDescription",
                )}
              </p>
              <div className={styles.actions}>
                {filters.page > 1 && (
                  <Link href={pageHref(1)}>{msg("shop.firstPage")}</Link>
                )}
                <Link href={allHref}>{msg("catalog.all")}</Link>
              </div>
            </div>
          )}
        </section>
      </div>
      <dialog
        ref={dialog}
        id="shop-filters"
        className={styles.filterDialog}
        aria-labelledby="shop-filters-title"
        onCancel={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={styles.sheetInner}>
          <div className={styles.sheetHeader}>
            <h2 id="shop-filters-title">{msg("shop.filters")}</h2>
            <button
              type="button"
              onClick={close}
              aria-label={msg("shop.closeFilters")}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {open && (
            <div className={styles.sheetBody}>
              <ShopFilters {...filterProps} value={draft} onChange={setDraft} />
            </div>
          )}
          <div className={styles.sheetFooter}>
            <button
              type="button"
              onClick={() => setDraft({ handle: "", brandIds: [], goal: "" })}
            >
              {msg("shop.resetFilters")}
            </button>
            <button type="button" onClick={() => navigate(draft)}>
              {msg("shop.applyFilters")}
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
