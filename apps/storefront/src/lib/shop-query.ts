import { isCatalogSort, type CatalogSort } from "./catalog-sort";
import { isHealthGoal } from "./health-goals";
import { categoryHref } from "./category-tree";

export type ShopSearch = Record<string, string | string[] | undefined>;
export const SHOP_PAGE_SIZE = 24;

export function searchQuery(values: ShopSearch) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value]) {
      query.append(key, item);
    }
  }
  return query;
}

export function parseShopQuery(values: ShopSearch) {
  const single = (key: string) =>
    typeof values[key] === "string" ? (values[key] as string) : "";
  const brands = values.brand_id === undefined ? [] : [values.brand_id].flat();
  const brandIds = [...new Set(brands)];
  const pageText = single("page") || "1";
  const page = Number(pageText);
  const q = single("q").trim();
  const sort = single("sort") || "default";
  const scalarKeys = ["q", "page", "category_id", "category", "brand", "sort", "goal", "deals"];
  const invalid =
    scalarKeys.some((key) => Array.isArray(values[key])) ||
    !/^[1-9]\d*$/.test(pageText) ||
    !Number.isSafeInteger((page - 1) * SHOP_PAGE_SIZE) ||
    q.length > 100 ||
    !isCatalogSort(sort) ||
    (values.goal !== undefined && !isHealthGoal(single("goal"))) ||
    (values.deals !== undefined && single("deals") !== "1") ||
    brandIds.length > 50 ||
    brandIds.some((id) => !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) ||
    (values.category_id !== undefined &&
      !/^[a-zA-Z0-9_-]{1,128}$/.test(single("category_id"))) ||
    ["form", "diet", "allergen", "rating", "availability"].some(
      (key) => values[key] !== undefined,
    );
  return {
    q,
    sort: sort as CatalogSort, deals: single("deals") === "1", goal: single("goal"),
    page,
    brandIds,
    categoryId: single("category_id"),
    legacyCategory: single("category"),
    legacyBrand: single("brand"),
    invalid,
  };
}

export function shopHref(handle: string, query = new URLSearchParams()) {
  const path = handle ? categoryHref("", handle) : "/shop";
  return `${path}${query.size ? `?${query}` : ""}`;
}

// Filter edits reset pagination, while unrelated shared-URL parameters survive.
export function updateShopQuery(
  query: string | URLSearchParams,
  updates: Record<string, string | string[] | null>,
) {
  const next = new URLSearchParams(query);
  next.delete("page");
  next.delete("category_id");
  next.delete("category");
  next.delete("brand");
  for (const [key, value] of Object.entries(updates)) {
    next.delete(key);
    for (const item of Array.isArray(value)
      ? value
      : value === null
        ? []
        : [value]) {
      if (item) next.append(key, item);
    }
  }
  return next;
}
