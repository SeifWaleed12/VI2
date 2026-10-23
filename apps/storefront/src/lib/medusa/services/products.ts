import { medusaLocale, type Locale } from "@/lib/i18n";
import { medusa } from "../client";
import type { Product, ProductCategoryRef, ProductOption, ProductVariant } from "@/types/product";

import type { HttpTypes } from "@medusajs/types";
import { resolveRegionId } from "./regions";
type CatalogProduct = HttpTypes.StoreProduct & {
  brand?: { id?: string; name: string; status?: string } | null;
  eda_registration?: { registration_number?: string | null; is_approved?: boolean | null } | null;
};

// Request and response fields are frozen in docs/CATALOG-CONTRACT.md.
const PRODUCT_FIELDS =
  "brand.id,brand.name,brand.status,eda_registration.registration_number,eda_registration.is_approved,id,handle,title,description,thumbnail,images.url,metadata,variants.id,variants.title,variants.sku,variants.barcode,variants.manage_inventory,variants.allow_backorder,variants.calculated_price,variants.inventory_quantity,variants.options.id,variants.options.value,variants.options.option_id,options.id,options.title,options.values.id,options.values.value,categories.id,categories.name,categories.handle";

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
    priceRaw !== null && compareRaw !== null && compareRaw > priceRaw
      ? Number(compareRaw)
      : undefined;

  const categoryName =
    p.categories?.[0]?.name ||
    String(meta.category ?? p.type?.value ?? "Supplements");

  const image =
    p.thumbnail ||
    p.images?.[0]?.url ||
    String(meta.image ?? "");

  const categories: ProductCategoryRef[] = (p.categories ?? [])
    .filter((c): c is NonNullable<typeof c> => typeof c?.id === "string")
    .map((c) => ({ id: c.id, name: c.name ?? "", handle: c.handle ?? "" }));
  const activeBrand = p.brand?.status === "active" ? p.brand : null;
  const edaNumber = p.eda_registration?.registration_number;

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
        const vPrice = vPriceRaw !== null ? Number(vPriceRaw) : 0;

        const vCompareRaw = vCalcPrice?.original_amount ?? null;
        const vCompareAt =
          vPriceRaw !== null && vCompareRaw !== null && vCompareRaw > vPriceRaw
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
    brand: activeBrand?.name ?? "",
    ...(activeBrand?.id ? { brandId: activeBrand.id } : {}),
    name: p.title ?? "",
    shortName: String(meta.shortName ?? p.title ?? ""),
    category: categoryName,
    categoryId: p.categories?.[0]?.id,
    ...(categories.length > 0 ? { categories } : {}),
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
    ...(edaNumber ? { eda: { registrationNumber: edaNumber, approved: p.eda_registration?.is_approved === true } } : {}),
    ...(options.length > 0 ? { options } : {}),
    ...(variants.length > 0 ? { variants } : {}),
  };
}

export const MAX_PAGE_SIZE = 100;

export type ListProductsParams = {
  locale: Locale;
  regionId?: string;
  // 1 to MAX_PAGE_SIZE; default 50, Medusa's own.
  limit?: number;
  offset?: number;
  // Send a category with its subcategories: Medusa matches only the IDs given.
  category_id?: string[];
  // Active brands only; unknown or inactive brands give an empty page.
  brand_id?: string[];
  q?: string;
  order?: string;
};

export type ProductPage = {
  products: Product[];
  // Every product matching the filters, across all pages.
  count: number;
  limit: number;
  offset: number;
};

// Medusa refused the filters (400): for example a malformed or too long brand
// list from a shared URL. Show "these filters are not valid", not an outage.
export class InvalidCatalogFilterError extends Error {
  constructor() {
    super("These catalog filters are not valid.");
    this.name = "InvalidCatalogFilterError";
  }
}

const whole = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) ? Math.trunc(value) : fallback;

// One page of the catalog with its total, filtered by Medusa (never in the browser).
export async function listProducts(params: ListProductsParams): Promise<ProductPage> {
  const limit = Math.min(Math.max(whole(params.limit, 50), 1), MAX_PAGE_SIZE);
  const offset = Math.max(whole(params.offset, 0), 0);
  try {
    const regionId = await resolveRegionId(params.regionId);
    const query: Record<string, unknown> = { limit, offset, fields: PRODUCT_FIELDS, region_id: regionId };
    if (params.category_id?.length) query.category_id = params.category_id;
    if (params.brand_id?.length) query.brand_id = params.brand_id;
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.order) query.order = params.order;

    const { products, count } = await medusa.store.product.list(query, { "x-medusa-locale": medusaLocale(params.locale) });
    return { products: (products || []).map(mapMedusaProduct), count: count ?? 0, limit, offset };
  } catch (error) {
    if ((error as { status?: unknown } | null)?.status === 400) throw new InvalidCatalogFilterError();
    throw new Error("Catalog temporarily unavailable.");
  }
}

export type GetProductsParams = Omit<ListProductsParams, "locale" | "brand_id"> & { locale?: Locale };

// Kept for existing callers: the first page only (up to 100 products), no total.
export async function getProducts(
  params: GetProductsParams = {},
): Promise<Product[]> {
  return (await listProducts({ ...params, locale: params.locale ?? "en", limit: params.limit ?? MAX_PAGE_SIZE })).products;
}

export async function getProductByHandle(
  handle: string,
  regionId?: string,
  locale: Locale = "en",
): Promise<Product | null> {
  try {
    const targetRegionId = await resolveRegionId(regionId);
    const query: Record<string, unknown> = {
      handle,
      limit: 1,
      fields: PRODUCT_FIELDS,
      region_id: targetRegionId,
    };

    const { products } = await medusa.store.product.list(query, { "x-medusa-locale": medusaLocale(locale) });
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
  locale: Locale = "en",
): Promise<Product | null> {
  try {
    const targetRegionId = await resolveRegionId(regionId);
    const query: Record<string, unknown> = {
      fields: PRODUCT_FIELDS,
      region_id: targetRegionId,
    };

    const { product } = await medusa.store.product.retrieve(id, query, { "x-medusa-locale": medusaLocale(locale) });
    if (!product) return null;

    return mapMedusaProduct(product);
  } catch {
    throw new Error("Catalog temporarily unavailable.");
  }
}
