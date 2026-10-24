import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { isLocale, message } from "@/lib/i18n";
import { getBundles } from "@/lib/medusa";
import ShopView, { getShopMetadata } from "../shop/ShopView";
import type { ShopSearch } from "@/lib/shop-query";
import styles from "../shop/Shop.module.css";
import deals from "./Deals.module.css";

type DealsProps = { params: Promise<{ locale: string }>; searchParams: Promise<ShopSearch> };
async function input({ params, searchParams }: DealsProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return { locale, query: { ...query, deals: "1" } };
}
export async function generateMetadata(props: DealsProps): Promise<Metadata> {
  return getShopMetadata(await input(props));
}

// Bundles (inventory-kit products) lead the unfiltered first page; the sortable
// sale list follows. A search or filter shows only matching sale products.
export async function Bundles({ locale, query }: { locale: string; query: ShopSearch }) {
  const filtered = ["q", "brand_id", "brand", "category_id", "category", "goal"].some((key) => query[key] !== undefined);
  if (!isLocale(locale) || filtered || (query.page !== undefined && query.page !== "1")) return null;
  const bundles = await getBundles(locale).catch(() => []);
  if (!bundles.length) return null;
  return (
    <section className={deals.section} aria-labelledby="deals-bundles">
      <h2 id="deals-bundles">{message(locale, "deals.bundles")}</h2>
      <div className={styles.grid}>
        {bundles.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

export default async function DealsPage(props: DealsProps) {
  const shop = await input(props);
  return <ShopView {...shop} lead={<Bundles {...shop} />} />;
}
