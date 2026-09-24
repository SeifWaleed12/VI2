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
