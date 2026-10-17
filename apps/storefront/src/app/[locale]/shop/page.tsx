import ShopView from "./ShopView";
import type { ShopSearch } from "@/lib/shop-query";
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopSearch>;
}) {
  return ShopView({ locale: (await params).locale, query: await searchParams });
}
