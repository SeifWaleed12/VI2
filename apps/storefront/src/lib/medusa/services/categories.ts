import { medusa } from "../client";

export type StoreCategory = {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  parent_category_id?: string | null;
  parent_category?: StoreCategory | null;
  category_children?: StoreCategory[];
  products?: unknown[];
  metadata?: Record<string, unknown> | null;
};

export async function getCategories(
  params: { limit?: number; offset?: number; parent_category_id?: string | null } = {},
): Promise<StoreCategory[]> {
  try {
    const response = await medusa.store.category.list({
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      fields: "*category_children,*parent_category",
      ...(params.parent_category_id !== undefined
        ? { parent_category_id: params.parent_category_id }
        : {}),
    });

    return (response.product_categories || []) as unknown as StoreCategory[];
  } catch (error) {
    console.error("Failed to retrieve categories from Medusa:", error);
    return [];
  }
}

export async function getCategory(id: string): Promise<StoreCategory | null> {
  try {
    const { product_category } = await medusa.store.category.retrieve(id, {
      fields: "*category_children,*parent_category,*products",
    });

    return (product_category || null) as unknown as StoreCategory | null;
  } catch (error) {
    console.error(`Failed to retrieve category "${id}" from Medusa:`, error);
    return null;
  }
}

export async function getCategoryByHandle(
  handle: string,
): Promise<StoreCategory | null> {
  try {
    const { product_categories } = await medusa.store.category.list({
      handle,
      limit: 1,
      fields: "*category_children,*parent_category,*products",
    });

    const category = product_categories?.[0];
    return (category || null) as unknown as StoreCategory | null;
  } catch (error) {
    console.error(
      `Failed to retrieve category by handle "${handle}" from Medusa:`,
      error,
    );
    return null;
  }
}


import { buildCategoryTree, type Category } from "@/lib/category-tree"
import { medusaLocale, type Locale } from "@/lib/i18n"
export async function getCategoryTree(locale: Locale): Promise<Category[]> {
  const categories: Omit<Category,"children">[] = []
  const seen = new Set<string>()
  const deadline = AbortSignal.timeout(15_000)
  for (let offset = 0; ; offset += 50) {
    deadline.throwIfAborted()
    const response = await medusa.client.fetch<{ product_categories: Omit<Category,"children">[]; count: number }>("/store/product-categories", {
      query: { limit: 50, offset, fields: "id,name,handle,parent_category_id,rank" },
      headers: { "x-medusa-locale": medusaLocale(locale) }, cache: "no-store", signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]),
    })
    if (!Number.isSafeInteger(response.count) || response.count < 0) throw new Error("Invalid category count")
    for (const category of response.product_categories) {
      if (seen.has(category.id)) throw new Error("Category pagination made no progress")
      seen.add(category.id)
    }
    if (seen.size > 10_000) throw new Error("Category directory exceeds its render budget")
    categories.push(...response.product_categories)
    if (categories.length >= response.count || response.product_categories.length < 50) break
  }
  if (process.env.NODE_ENV === "development" && locale === "ar") {
    for (const category of categories) if (!/[\u0600-\u06ff]/.test(category.name) && /[a-zA-Z]{4}/.test(category.name)) console.warn(`Check Arabic category translation: ${category.id}`)
  }
  return buildCategoryTree(categories)
}
