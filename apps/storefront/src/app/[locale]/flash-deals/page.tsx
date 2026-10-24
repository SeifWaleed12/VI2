import { redirect } from "next/navigation";
import { localizedHref, isLocale } from "@/lib/i18n";
import { searchQuery, type ShopSearch } from "@/lib/shop-query";
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<ShopSearch> }) {
  const [{ locale }, values] = await Promise.all([params, searchParams]);
  const query = searchQuery(values).toString();
  redirect(localizedHref("/deals" + (query ? "?" + query : ""), isLocale(locale) ? locale : "en"));
}
