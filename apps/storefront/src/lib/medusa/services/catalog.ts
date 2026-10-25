import { medusaLocale } from "@/lib/i18n";
import type { CatalogSort } from "@/lib/catalog-sort";
import { medusa } from "../client";
import { resolveRegionId } from "./regions";
import { InvalidCatalogFilterError, listProducts, type ListProductsParams, type ProductPage } from "./products";

export async function listCatalog(params: ListProductsParams & { sort: CatalogSort; deals?: boolean }): Promise<ProductPage> {
  const { sort, deals = false, ...filters } = params;
  const limit = params.limit ?? 24;
  const offset = params.offset ?? 0;
  // The native all-products path remains usable if the derived index is unavailable.
  if (sort === "default" && !deals && !params.q && !params.brand_id?.length) return listProducts(filters);
  const regionId = await resolveRegionId(params.regionId);
  let found: { ids: string[]; count: number; variants: Record<string, string> };
  try {
    found = await medusa.client.fetch("/store/catalog", {
      method: "GET",
      headers: { "x-medusa-locale": medusaLocale(params.locale) },
      cache: "no-store",
      signal: params.signal,
      query: { region_id: regionId, limit, offset, sort, deals: String(deals),
        ...(params.q ? { q: params.q } : {}),
        ...(params.category_id?.length ? { category_id: params.category_id } : {}),
        ...(params.brand_id?.length ? { brand_id: params.brand_id } : {}),
        ...(params.tag_id?.length ? { tag_id: params.tag_id } : {}),
      },
    });
  } catch (error) {
    if ((error as { status?: unknown } | null)?.status === 400) throw new InvalidCatalogFilterError();
    throw new Error("Catalog ordering temporarily unavailable.");
  }
  if (!found.ids.length) return { products: [], count: found.count, limit, offset };
  const page = await listProducts({ locale: params.locale, regionId, id: found.ids, limit: found.ids.length, fresh: true, signal: params.signal });
  const byId = new Map(page.products.map(product => [product.id, product]));
  const products = found.ids.map(id => {
    const product = byId.get(id);
    const variant = product?.variants?.find(v => v.id === found.variants[id]);
    if (!product || (!variant && found.variants[id])) throw new Error("Catalog changed while loading. Retry.");
    if (!variant) return { ...product, variantId: undefined, price: 0, compareAtPrice: undefined, inStock: false };
    const named = (name: string) => deals && (product.variants?.length ?? 0) > 1 && variant.title ? `${name} — ${variant.title}` : name;
    return { ...product, variantId: variant.id, price: variant.price, compareAtPrice: variant.compareAtPrice,
      name: named(product.name), shortName: named(product.shortName),
      stock: variant.stock, inventoryKnown: variant.inventoryKnown, inStock: variant.inStock === true && Number.isFinite(variant.price) && variant.price > 0,
      image: variant.image || product.image,
    };
  });
  return { products, count: found.count, limit, offset };
}
