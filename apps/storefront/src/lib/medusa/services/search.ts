import type { Locale } from "@/lib/i18n";
import { medusa } from "../client";
import { InvalidCatalogFilterError, listProducts, type ProductPage } from "./products";

export type SearchProductsParams = {
  q: string;
  locale: Locale;
  limit?: number;
  offset?: number;
  category_id?: string[];
  brand_id?: string[];
  tag_id?: string[];
};

// The backend ranks the matches (typos, as-you-type, Arabic and English); the
// products themselves, with prices and translations, come from /store/products.
export async function searchProducts({ q, locale, limit = 24, offset = 0, ...filters }: SearchProductsParams): Promise<ProductPage> {
  let found: { ids: string[]; count: number };
  try {
    const query = { q, limit, offset, ...Object.fromEntries(Object.entries(filters).filter(([, ids]) => ids?.length)) };
    found = await medusa.client.fetch<{ ids: string[]; count: number }>("/store/product-search", { method: "GET", query });
  } catch (error) {
    if ((error as { status?: unknown } | null)?.status === 400) throw new InvalidCatalogFilterError();
    throw new Error("Search temporarily unavailable.");
  }
  if (!found.ids.length) return { products: [], count: found.count, limit, offset };
  const { products } = await listProducts({ locale, id: found.ids, limit: found.ids.length });
  const byId = new Map(products.map((product) => [product.id, product]));
  return { products: found.ids.flatMap((id) => byId.get(id) ?? []), count: found.count, limit, offset };
}
