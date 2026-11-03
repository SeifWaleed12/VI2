import { medusa } from "../client";

// Tag value → tag id. A value with no tag yet (not set up in Admin) is absent.
export async function getTagIds(values: string[]): Promise<Record<string, string>> {
  try {
    const data = await medusa.client.fetch<{ product_tags: { id: string; value: string }[] }>("/store/product-tags", {
      method: "GET",
      query: { value: values, fields: "id,value", limit: values.length },
    });
    return Object.fromEntries((data?.product_tags ?? []).map((tag) => [tag.value, tag.id]));
  } catch {
    throw new Error("Product tags temporarily unavailable.");
  }
}
