import { LegacyTranslations } from "@/context/LanguageContext";
import { cache } from "react";
import type { Metadata } from "next";
import { isLocale, message, type Locale } from "@/lib/i18n";
import styles from "./HomeRecovery.module.css";
import BrandUniverse from "@/components/BrandUniverse";
import HomeBestSellers from "@/components/HomeBestSellers";
import HomeDiscovery from "@/components/HomeDiscovery";
import HomeHeroSlider from "@/components/HomeHeroSlider";
import TrendingNow from "@/components/TrendingNow";
import ValueSets from "@/components/ValueSets";
import { getProducts, getBrands } from "@/lib/medusa";

type HomeProps = { params: Promise<{ locale: string }> };
const loadHome = cache(async (locale: Locale) => {
  const [products, brands] = await Promise.allSettled([getProducts({ locale }), getBrands()]);
  return {
    products: products.status === "fulfilled" ? products.value : null,
    brands: brands.status === "fulfilled" ? brands.value : [],
  };
});

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  const { products } = await loadHome(locale);
  return products === null
    ? { title: `${message(locale, "catalog.error")} | Vi2`, robots: { index: false, follow: true } }
    : {};
}

export default async function Home({ params }: HomeProps) {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  const { products, brands } = await loadHome(locale);
  if (products === null) {
    return (
      <main>
        <section className={styles.catalogUnavailable} data-no-translate aria-labelledby="home-recovery-title">
          <h1 id="home-recovery-title">{message(locale, "catalog.error")}</h1>
          <p role="status">{message(locale, "home.catalogErrorDescription")}</p>
          <div className={styles.catalogRecoveryActions}>
            {/* A document navigation retries the server request, including on this same URL. */}
            <a href={`/${locale}`}>{message(locale, "catalog.retry")}</a>
            <a href={`/${locale}/shop`}>{message(locale, "catalog.all")}</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <LegacyTranslations><main>
      {/* ======================================================
          HERO
          ====================================================== */}
      <HomeHeroSlider />

      {/* ======================================================
          1. TRENDING NOW
          ====================================================== */}
      <TrendingNow products={products} />

      {/* ======================================================
          2. BEST SELLERS — DIRECTLY UNDER TRENDING
          ====================================================== */}
      <HomeBestSellers initialProducts={products} />

      {/* ======================================================
          3. BRANDS IN OUR ORBIT
          ====================================================== */}
      {brands.length > 0 && <BrandUniverse brands={brands.map((brand) => brand.name)} />}

      {/* ======================================================
          4. HEALTH GOALS / DAILY DISCOVERY
          ====================================================== */}
      <HomeDiscovery />

      {/* ======================================================
          5. VALUE SETS / BUNDLES
          ====================================================== */}
      <ValueSets products={products} />

      <section className="brand-statement">
        <span>
          LIVE WELL, LIVE FULLY.
        </span>

        <p>
          VI2 · DIETARY & WELLNESS SUPPLEMENTS
        </p>
      </section>
    </main></LegacyTranslations>
  );
}
