import ShopView, { getShopMetadata } from "../ShopView";
import type { ShopSearch } from "@/lib/shop-query";
type Props = {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<ShopSearch>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  return getShopMetadata({ ...(await params), query: await searchParams });
}
export default async function CategoryShopPage({
  params,
  searchParams,
}: Props) {
  return ShopView({ ...(await params), query: await searchParams });
}
