import { notFound } from "next/navigation";

import { getProductByHandle, getProducts } from "@/lib/medusa";
import ProductDetailClient from "./ProductDetailClient";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;
  const [medusaProduct, medusaAllProducts] = await Promise.all([
    getProductByHandle(slug),
    getProducts(),
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
