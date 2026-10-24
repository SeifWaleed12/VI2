import { cache } from "react";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import ProductCard from "@/components/ProductCard";
import { isLocale, message, type Locale } from "@/lib/i18n";
import { getDeals } from "@/lib/medusa";
import type { Product } from "@/types/product";
import styles from "../shop/Shop.module.css";
import deals from "./Deals.module.css";

type DealsProps = { params: Promise<{ locale: string }> };

// Bundles and products with a sale Price List running now (apps/backend/src/lib/deals.ts).
const loadDeals = cache(async (locale: Locale) => getDeals(locale).catch(() => null));

const localeOf = async (params: DealsProps["params"]) => {
  const { locale } = await params;
  return isLocale(locale) ? locale : "en";
};

export async function generateMetadata({ params }: DealsProps): Promise<Metadata> {
  const locale = await localeOf(params);
  const found = await loadDeals(locale);
  return {
    title: `${message(locale, "deals.title")} | Vi2`,
    description: message(locale, "deals.description"),
    ...(found && (found.deals.length || found.bundles.length) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function DealsPage({ params }: DealsProps) {
  const locale = await localeOf(params);
  const msg = (key: Parameters<typeof message>[1]) => message(locale, key);
  const found = await loadDeals(locale);
  const section = (title: Parameters<typeof message>[1], products: Product[]) =>
    products.length > 0 && (
      <section className={deals.section} aria-labelledby={`deals-${title}`}>
        <h2 id={`deals-${title}`}>{msg(title)}</h2>
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    );
  return (
    <main className={styles.page} data-no-translate>
      <header className={styles.intro}>
        <h1>{msg("deals.title")}</h1>
        <p>{msg("deals.description")}</p>
      </header>
      {found && (found.bundles.length || found.deals.length) ? (
        <>
          {section("deals.bundles", found.bundles)}
          {section("deals.onSale", found.deals)}
        </>
      ) : (
        <div className={styles.empty} role={found ? undefined : "alert"}>
          <h2>{msg(found ? "deals.emptyTitle" : "deals.errorTitle")}</h2>
          <p>{msg(found ? "deals.emptyDescription" : "deals.errorDescription")}</p>
          <div className={styles.actions}>
            {/* A document navigation retries the server request. */}
            {!found && <a href={`/${locale}/deals`}>{msg("catalog.retry")}</a>}
            <Link href="/shop">{msg("catalog.all")}</Link>
          </div>
        </div>
      )}
    </main>
  );
}
