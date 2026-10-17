import ShopView from "../ShopView";
import type { ShopSearch } from "@/lib/shop-query";
export default async function CategoryShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<ShopSearch>;
}) {
  const { locale, handle } = await params;
  return ShopView({ locale, handle, query: await searchParams });
}
