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
  const [product, allProducts] = await Promise.all([
    getProductByHandle(slug),
    getProducts(),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} allProducts={allProducts} />;
}
