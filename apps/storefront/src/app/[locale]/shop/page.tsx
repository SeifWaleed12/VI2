import { Suspense } from "react";
import { getProducts } from "@/lib/medusa";
import { loadCategoryDirectory } from "@/lib/medusa/category-directory";
import { categoryScope, flattenCategories } from "@/lib/category-tree";
import { isLocale, message } from "@/lib/i18n";
import Link from "@/components/LocaleLink";
import CategoryStatus from "@/components/CategoryStatus";
import ShopClient from "./ShopClient";
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category_id?: string | string[];
    category?: string | string[];
  }>;
}) {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  const query = await searchParams;
  const directory = await loadCategoryDirectory(locale);
  // Existing name-based bookmarks are resolved only when they identify one real category.
  const matches =
    typeof query.category === "string"
      ? flattenCategories(directory.roots).filter(
          (c) => c.name.toLowerCase() === String(query.category).toLowerCase(),
        )
      : [];
  const id =
    query.category_id ?? (matches.length === 1 ? matches[0].id : undefined);
  const scoped =
    query.category_id !== undefined || query.category !== undefined;
  const ids =
    typeof id === "string" ? categoryScope(directory.roots, id) : null;
  if (scoped && (directory.error || !ids))
    return (
      <main data-no-translate style={{ padding: "64px 32px" }}>
        {directory.error ? (
          <CategoryStatus error />
        ) : (
          <p role="status">{message(locale, "catalog.invalid")}</p>
        )}
        <Link href="/shop">{message(locale, "catalog.all")}</Link>
      </main>
    );
  let products;
  try {
    products = await getProducts({
      ...(ids ? { category_id: ids } : {}),
      locale,
    });
  } catch {
    return (
      <main data-no-translate style={{ padding: "64px 32px" }}>
        <CategoryStatus error />
        <Link href="/shop">{message(locale, "catalog.all")}</Link>
      </main>
    );
  }
  return (
    <Suspense fallback={<main>{message(locale, "catalog.loading")}</main>}>
      <ShopClient
        products={products}
        initialCategories={directory.roots}
        selectedCategory={typeof id === "string" ? id : "All"}
        categoryError={directory.error}
      />
    </Suspense>
  );
}
