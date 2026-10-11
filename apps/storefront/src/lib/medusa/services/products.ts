import { medusa } from "../client";
import type { Product, ProductOption, ProductVariant } from "@/types/product";

import type { HttpTypes } from "@medusajs/types";
import { resolveRegionId } from "./regions";
type CatalogProduct = HttpTypes.StoreProduct & { brand?: { name: string; status?: string } | null };

const PRODUCT_FIELDS =
  "brand.name,brand.status,id,handle,title,description,thumbnail,images.url,metadata,variants.id,variants.title,variants.sku,variants.barcode,variants.manage_inventory,variants.allow_backorder,variants.calculated_price,variants.inventory_quantity,variants.options.id,variants.options.value,variants.options.option_id,options.id,options.title,options.values.id,options.values.value,categories.id,categories.name,categories.handle";

export function mapMedusaProduct(p: CatalogProduct): Product {
  const meta: Record<string, unknown> = p.metadata ?? {};
  const variant = p.variants?.[0];

  // Medusa v2 calculated_price contains region-specific pricing in direct currency units
  const calcPrice = variant?.calculated_price;
  const priceRaw =
    calcPrice?.calculated_amount ?? null;
  const price = priceRaw !== null ? Number(priceRaw) : 0;

  const compareRaw = calcPrice?.original_amount ?? null;
  const compareAtPrice =
    compareRaw !== null && compareRaw !== priceRaw
      ? Number(compareRaw)
      : undefined;

  const categoryName =
    p.categories?.[0]?.name ||
    String(meta.category ?? p.type?.value ?? "Supplements");

  const image =
    p.thumbnail ||
    p.images?.[0]?.url ||
    String(meta.image ?? "");

  // Map options
  const options: ProductOption[] = Array.isArray(p.options)
    ? p.options.map((opt) => ({
        id: String(opt.id ?? opt.title),
        title: String(opt.title ?? ""),
        values: (opt.values || []).map((v) =>
          typeof v === "string" ? v : String(v.value ?? "")
        ),
      }))
    : [];

  // Map variants
  const variants: ProductVariant[] = Array.isArray(p.variants)
    ? p.variants.map((v) => {
        const vCalcPrice = v.calculated_price;
        const vPriceRaw =
          vCalcPrice?.calculated_amount ?? null;
        const vPrice = vPriceRaw !== null ? Number(vPriceRaw) : price;

        const vCompareRaw = vCalcPrice?.original_amount ?? null;
        const vCompareAt =
          vCompareRaw !== null && vCompareRaw !== vPriceRaw
            ? Number(vCompareRaw)
            : undefined;

        const vStock = Number(v.inventory_quantity ?? 0);
        const inStock = v.allow_backorder === true || v.manage_inventory === false || vStock > 0;

        const optMap: Record<string, string> = {};
        if (Array.isArray(v.options)) {
          v.options.forEach((vo) => {
            const parent = p.options?.find(
              (o) => o.id === vo.option_id
            );
            const optTitle =
              parent?.title ||
              vo.option?.title ||
              (options.length === 1 ? options[0].title : "Option");
            optMap[optTitle] = String(vo.value ?? "");
          });
        } else if (v.options && typeof v.options === "object") {
          Object.entries(v.options).forEach(([k, val]) => {
            optMap[k] = String(val ?? "");
          });
        }

        // If no options map but product has 1 option and variant has a title
        if (
          Object.keys(optMap).length === 0 &&
          options.length === 1 &&
          v.title
        ) {
          optMap[options[0].title] = String(v.title);
        }

        return {
          id: String(v.id ?? ""),
          title: String(v.title ?? ""),
          sku: v.sku ? String(v.sku) : undefined,
          barcode: v.barcode ? String(v.barcode) : undefined,
          price: vPrice,
          compareAtPrice: vCompareAt,
          stock: vStock,
          inventoryKnown: typeof v.inventory_quantity === "number",
          inStock,
          options: optMap,
          image: v.thumbnail || undefined,
        };
      })
    : [];

  return {
    id: p.id ?? "",
    slug: p.handle ?? p.id ?? "",
    variantId: variant?.id,
    brand: p.brand?.status === "active" ? p.brand.name : "",
    name: p.title ?? "",
    shortName: String(meta.shortName ?? p.title ?? ""),
    category: categoryName,
    description: p.description ?? "",
    price,
    ...(compareAtPrice !== undefined ? { compareAtPrice } : {}),
    rating: 0,
    reviewCount: 0,
    image,
    ...(meta.flavor ? { flavor: String(meta.flavor) } : {}),
    ...(meta.size ? { size: String(meta.size) } : {}),
    ...(meta.servings ? { servings: Number(meta.servings) } : {}),
    stock: Number(variant?.inventory_quantity ?? 0),
    inventoryKnown: typeof variant?.inventory_quantity === "number",
    inStock: variants.some((v) => v.inStock === true),
    ...(meta.badge ? { badge: String(meta.badge) } : {}),
    ...(options.length > 0 ? { options } : {}),
    ...(variants.length > 0 ? { variants } : {}),
  };
}

export type GetProductsParams = {
  regionId?: string;
  limit?: number;
  offset?: number;
  category_id?: string[];
  q?: string;
  order?: string;
};

export async function getProducts(
  params: GetProductsParams = {},
): Promise<Product[]> {
  try {
    const regionId = await resolveRegionId(params.regionId);
    const query: Record<string, unknown> = {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      fields: PRODUCT_FIELDS,
      region_id: regionId,
    };

    if (params.category_id?.length) {
      query.category_id = params.category_id;
    }
    if (params.q) {
      query.q = params.q;
    }
    if (params.order) {
      query.order = params.order;
    }

    const { products } = await medusa.store.product.list(query);
    return (products || []).map(mapMedusaProduct);
  } catch {
    throw new Error("Catalog temporarily unavailable.");
  }
}

export async function getProductByHandle(
  handle: string,
  regionId?: string,
): Promise<Product | null> {
  try {
    const targetRegionId = await resolveRegionId(regionId);
    const query: Record<string, unknown> = {
      handle,
      limit: 1,
      fields: PRODUCT_FIELDS,
      region_id: targetRegionId,
    };

    const { products } = await medusa.store.product.list(query);
    const product = products?.[0];
    if (!product) return null;

    return mapMedusaProduct(product);
  } catch {
    throw new Error("Catalog temporarily unavailable.");
  }
}

export async function getProduct(
  id: string,
  regionId?: string,
): Promise<Product | null> {
  try {
    const targetRegionId = await resolveRegionId(regionId);
    const query: Record<string, unknown> = {
      fields: PRODUCT_FIELDS,
      region_id: targetRegionId,
    };

    const { product } = await medusa.store.product.retrieve(id, query);
    if (!product) return null;

    return mapMedusaProduct(product);
  } catch {
    throw new Error("Catalog temporarily unavailable.");
  }
}
