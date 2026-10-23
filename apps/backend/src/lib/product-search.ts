// Product search on Medusa's Search module (Postgres engine). The index holds
// what a shopper types: names in English and Arabic, brand, categories,
// flavors/sizes and health goals. No SKU, barcode or description (Seif, 2026-10-23).

export const PRODUCT_SEARCH_INDEX = "product"
export const ARABIC_LOCALE = "ar-EG"

// The words a shopper may type for each health goal tag (setup-health-goal-tags.ts).
const GOAL_WORDS: Record<string, string[]> = {
  "immune-support": ["immune support", "دعم المناعة"],
  "gut-health": ["gut health", "صحة الجهاز الهضمي"],
  "energy-fitness": ["energy fitness", "الطاقة واللياقة"],
  "muscle-recovery": ["muscle recovery", "العضلات والاستشفاء"],
  "heart-health": ["heart health", "صحة القلب"],
  "stress-sleep": ["stress sleep", "التوتر والنوم"],
}

type Named = { id?: string | null, name?: string | null, title?: string | null, value?: string | null }
export type SearchSource = {
  id: string
  handle?: string | null
  status?: string | null
  title?: string | null
  brand?: { id?: string | null, name?: string | null, status?: string | null } | null
  categories?: (Named | null)[] | null
  tags?: (Named | null)[] | null
  variants?: (Named | null)[] | null
  sales_channels?: (Named | null)[] | null
}
export type ArabicSource = Pick<SearchSource, "id" | "title" | "categories" | "variants">

export const SOURCE_FIELDS = [
  "id", "handle", "status", "title", "brand.id", "brand.name", "brand.status",
  "categories.id", "categories.name", "tags.id", "tags.value", "variants.title", "sales_channels.id",
]
export const ARABIC_FIELDS = ["id", "title", "categories.name", "variants.title"]

const texts = (...lists: (string | null | undefined)[][]) =>
  [...new Set(lists.flat().map((text) => text?.trim()).filter((text): text is string => !!text))]
const ids = (list?: (Named | null)[] | null) => texts((list ?? []).map((item) => item?.id))

// One searchable document per published product; anything else stays out of the index.
export function toSearchDocument(product: SearchSource, arabic?: ArabicSource) {
  if (product.status !== "published") return undefined
  const brand = product.brand?.status === "active" ? product.brand : null
  return {
    id: product.id,
    handle: product.handle ?? "",
    title: product.title ?? "",
    title_ar: arabic?.title && arabic.title !== product.title ? arabic.title : "",
    brand: brand?.name ?? "",
    brand_id: brand?.id ?? "",
    categories: texts((product.categories ?? []).map((c) => c?.name), (arabic?.categories ?? []).map((c) => c?.name)),
    category_ids: ids(product.categories),
    tag_ids: ids(product.tags),
    goals: texts(...(product.tags ?? []).map((tag) => GOAL_WORDS[tag?.value ?? ""] ?? [])),
    variants: texts((product.variants ?? []).map((v) => v?.title), (arabic?.variants ?? []).map((v) => v?.title)),
    sales_channel_ids: ids(product.sales_channels),
  }
}

// Arabic "ال" (the) starts most words, so typo matching would find any product
// with an "ال" word. Searching the word without it matches the right ones.
export const withoutArabicArticle = (q: string) => q.replace(/(^|\s)ال(?=[؀-ۿ]{3,})/g, "$1")

export type ProductSearchInput = { q: string, category_id?: string[], brand_id?: string[], tag_id?: string[] }

// A list on an array field matches when it holds any of the ids.
export function productSearchFilters(input: ProductSearchInput, salesChannelIds: string[]) {
  return {
    q: withoutArabicArticle(input.q),
    sales_channel_ids: salesChannelIds,
    ...(input.category_id?.length ? { category_ids: input.category_id } : {}),
    ...(input.brand_id?.length ? { brand_id: input.brand_id } : {}),
    ...(input.tag_id?.length ? { tag_ids: input.tag_id } : {}),
  }
}
