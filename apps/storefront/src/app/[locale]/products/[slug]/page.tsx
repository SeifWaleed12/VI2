import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

import { getProductByHandle, getProducts } from "@/lib/medusa";
import ProductDetailClient from "./ProductDetailClient";

type ProductPageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug, locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  const [medusaProduct, medusaAllProducts] = await Promise.all([
    getProductByHandle(slug, undefined, locale),
    getProducts({locale}),
  ]);

  const product =
    medusaProduct;

  if (!product) {
    notFound();
  }

  const allProducts =
    medusaAllProducts;

  return <ProductDetailClient product={product} allProducts={allProducts} />;
}
