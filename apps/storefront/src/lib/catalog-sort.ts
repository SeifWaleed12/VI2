export const CATALOG_SORTS = ["default", "price_asc", "price_desc", "in_stock", "newest"] as const;
export type CatalogSort = typeof CATALOG_SORTS[number];
export const isCatalogSort = (value: string): value is CatalogSort => (CATALOG_SORTS as readonly string[]).includes(value);
