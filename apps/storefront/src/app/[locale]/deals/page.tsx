import { cache } from "react";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import ProductCard from "@/components/ProductCard";
import { isLocale, message, type Locale } from "@/lib/i18n";
import { getDeals } from "@/lib/medusa";
import styles from "../shop/Shop.module.css";

type DealsProps = { params: Promise<{ locale: string }> };

// Products with a sale Price List running now (see apps/backend/src/lib/deals.ts).
const loadDeals = cache(async (locale: Locale) => getDeals(locale).catch(() => null));

const localeOf = async (params: DealsProps["params"]) => {
  const { locale } = await params;
  return isLocale(locale) ? locale : "en";
};

export async function generateMetadata({ params }: DealsProps): Promise<Metadata> {
  const locale = await localeOf(params);
  const deals = await loadDeals(locale);
  return {
    title: `${message(locale, "deals.title")} | Vi2`,
    description: message(locale, "deals.description"),
    ...(deals?.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function DealsPage({ params }: DealsProps) {
  const locale = await localeOf(params);
  const msg = (key: Parameters<typeof message>[1]) => message(locale, key);
  const deals = await loadDeals(locale);
  return (
    <main className={styles.page} data-no-translate>
      <header className={styles.intro}>
        <h1>{msg("deals.title")}</h1>
        <p>{msg("deals.description")}</p>
      </header>
      {deals?.length ? (
        <div className={styles.grid}>
          {deals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className={styles.empty} role={deals ? undefined : "alert"}>
          <h2>{msg(deals ? "deals.emptyTitle" : "deals.errorTitle")}</h2>
          <p>{msg(deals ? "deals.emptyDescription" : "deals.errorDescription")}</p>
          <div className={styles.actions}>
            {/* A document navigation retries the server request. */}
            {!deals && <a href={`/${locale}/deals`}>{msg("catalog.retry")}</a>}
            <Link href="/shop">{msg("catalog.all")}</Link>
          </div>
        </div>
      )}
    </main>
  );
}
