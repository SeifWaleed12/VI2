import { notFound, permanentRedirect } from "next/navigation";
import {
  listProducts,
  InvalidCatalogFilterError,
} from "@/lib/medusa/services/products";
import { getBrands } from "@/lib/medusa/services/brands";
import { loadCategoryDirectory } from "@/lib/medusa/category-directory";
import { categoryScope, flattenCategories } from "@/lib/category-tree";
import { isLocale, localizedHref } from "@/lib/i18n";
import {
  parseShopQuery,
  searchQuery,
  shopHref,
  SHOP_PAGE_SIZE,
  type ShopSearch,
} from "@/lib/shop-query";
import ShopClient from "./ShopClient";

export default async function ShopView({
  locale: requested,
  handle,
  query,
}: {
  locale: string;
  handle?: string;
  query: ShopSearch;
}) {
  const locale = isLocale(requested) ? requested : "en";
  const [directory, brandResult] = await Promise.all([
    loadCategoryDirectory(locale),
    getBrands()
      .then((brands) => ({ brands, error: false }))
      .catch(() => ({ brands: [], error: true })),
  ]);
  const filters = parseShopQuery(query);
  const categories = flattenCategories(directory.roots);
  const handleMatches = handle
    ? categories.filter((category) => category.handle === handle)
    : [];
  if (handle && !directory.error && handleMatches.length === 0) notFound();
  const legacyMatches = filters.categoryId
    ? categories.filter((category) => category.id === filters.categoryId)
    : filters.legacyCategory
      ? categories.filter(
          (category) =>
            category.name.toLowerCase() ===
            filters.legacyCategory.toLowerCase(),
        )
      : [];
  const selected = handle
    ? handleMatches[0]
    : legacyMatches.length === 1
      ? legacyMatches[0]
      : undefined;
  const scoped = Boolean(
    handle || filters.categoryId || filters.legacyCategory,
  );
  const legacyBrand = brandResult.brands.filter(
    (brand) => brand.name.toLowerCase() === filters.legacyBrand.toLowerCase(),
  );
  const legacyBrandIds =
    filters.legacyBrand && legacyBrand.length === 1 ? [legacyBrand[0].id] : [];
  const brandIds = [...new Set([...filters.brandIds, ...legacyBrandIds])];
  let error: "invalid" | "unavailable" | null = null;
  if (
    filters.invalid ||
    handleMatches.length > 1 ||
    (scoped && !directory.error && !selected) ||
    (handle && filters.categoryId && selected?.id !== filters.categoryId) ||
    (filters.legacyBrand && !brandResult.error && legacyBrand.length !== 1) ||
    (!brandResult.error &&
      brandIds.some(
        (id) => !brandResult.brands.some((brand) => brand.id === id),
      ))
  ) {
    error = "invalid";
  } else if (
    (scoped && directory.error) ||
    (filters.legacyBrand && brandResult.error)
  ) {
    error = "unavailable";
  }

  const urlQuery = searchQuery(query);
  if (
    !error &&
    (filters.categoryId || filters.legacyCategory || filters.legacyBrand)
  ) {
    urlQuery.delete("category_id");
    urlQuery.delete("category");
    urlQuery.delete("brand");
    urlQuery.delete("brand_id");
    brandIds.forEach((id) => urlQuery.append("brand_id", id));
    if (!selected || selected.handle) {
      permanentRedirect(
        localizedHref(shopHref(selected?.handle ?? "", urlQuery), locale),
      );
    }
  }

  let products: Awaited<ReturnType<typeof listProducts>> = {
    products: [],
    count: 0,
    limit: SHOP_PAGE_SIZE,
    offset: (filters.page - 1) * SHOP_PAGE_SIZE,
  };
  if (!error) {
    try {
      products = await listProducts({
        locale,
        limit: SHOP_PAGE_SIZE,
        offset: (filters.page - 1) * SHOP_PAGE_SIZE,
        ...(selected
          ? { category_id: categoryScope(directory.roots, selected.id)! }
          : {}),
        ...(brandIds.length ? { brand_id: brandIds } : {}),
        ...(filters.q ? { q: filters.q } : {}),
      });
    } catch (cause) {
      error =
        cause instanceof InvalidCatalogFilterError ? "invalid" : "unavailable";
    }
  }
  return (
    <ShopClient
      locale={locale}
      page={products}
      categories={directory.roots}
      brands={brandResult.brands}
      categoryError={directory.error}
      brandError={brandResult.error}
      category={selected ?? null}
      handle={handle ?? selected?.handle ?? ""}
      query={searchQuery(query).toString()}
      filters={{ q: filters.q, brandIds, page: filters.page }}
      error={error}
    />
  );
}
