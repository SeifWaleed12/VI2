import { LegacyTranslations } from "@/context/LanguageContext";
import { isLocale, message } from "@/lib/i18n";
import styles from "./HomeRecovery.module.css";
import BrandUniverse from "@/components/BrandUniverse";
import HomeBestSellers from "@/components/HomeBestSellers";
import HomeDiscovery from "@/components/HomeDiscovery";
import HomeHeroSlider from "@/components/HomeHeroSlider";
import TrendingNow from "@/components/TrendingNow";
import ValueSets from "@/components/ValueSets";
import { getProducts, getBrands } from "@/lib/medusa";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  let products: Awaited<ReturnType<typeof getProducts>>;
  let brands: Awaited<ReturnType<typeof getBrands>>;
  try {
    [products, brands] = await Promise.all([getProducts({ locale }), getBrands()]);
  } catch {
    return (
      <main>
        <section className={styles.catalogUnavailable} data-no-translate role="status">
          <h1>{message(locale, "catalog.error")}</h1>
          <p>{message(locale, "home.catalogErrorDescription")}</p>
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
      <BrandUniverse brands={brands.map((brand) => brand.name)} />

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
