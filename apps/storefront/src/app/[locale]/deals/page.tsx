import { Bundles } from "./Bundles";
import type { Metadata } from "next";
import ShopView, { getShopMetadata } from "../shop/ShopView";
import type { ShopSearch } from "@/lib/shop-query";

type DealsProps = { params: Promise<{ locale: string }>; searchParams: Promise<ShopSearch> };
async function input({ params, searchParams }: DealsProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return { locale, query: { ...query, deals: "1" } };
}
export async function generateMetadata(props: DealsProps): Promise<Metadata> {
  return getShopMetadata(await input(props));
}

export default async function DealsPage(props: DealsProps) {
  const shop = await input(props);
  return <ShopView {...shop} lead={<Bundles {...shop} />} />;
}
