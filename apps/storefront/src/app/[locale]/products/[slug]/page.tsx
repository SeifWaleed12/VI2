import { Suspense } from "react";
import { listReviews } from "@/lib/medusa/services/reviews";
import { ProductReviewSection, ProductReviewLink, ProductReviewLoading } from "@/components/product-reviews/ProductReviewSection";
import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

import { getProductByHandle, listProducts } from "@/lib/medusa";
import type { Product } from "@/types/product";
import ProductDetailClient from "./ProductDetailClient";

type ProductPageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

const SIMILAR_COUNT = 4;

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug, locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  const product = await getProductByHandle(slug, undefined, locale);

  if (!product) {
    notFound();
  }

  const reviews = listReviews(product.id, locale).catch(() => null);

  // Similar products share a category. Optional: without them the page still sells.
  const categoryIds = product.categories?.map((category) => category.id) ?? [];
  let similar: Product[] = [];
  if (categoryIds.length > 0) {
    try {
      const page = await listProducts({ locale, category_id: categoryIds, limit: SIMILAR_COUNT + 1 });
      similar = page.products.filter((item) => item.id !== product.id).slice(0, SIMILAR_COUNT);
    } catch {
      similar = [];
    }
  }

  return <ProductDetailClient product={product} similar={similar}
    reviewSummary={<Suspense fallback={null}><ProductReviewLink locale={locale} data={reviews} /></Suspense>}
    reviewContent={<Suspense fallback={<ProductReviewLoading locale={locale} />}><ProductReviewSection productId={product.id} locale={locale} data={reviews} /></Suspense>}
  />;
}
