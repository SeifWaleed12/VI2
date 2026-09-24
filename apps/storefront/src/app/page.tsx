import BrandUniverse from "@/components/BrandUniverse";
import HomeBestSellers from "@/components/HomeBestSellers";
import HomeDiscovery from "@/components/HomeDiscovery";
import HomeHeroSlider from "@/components/HomeHeroSlider";
import TrendingNow from "@/components/TrendingNow";
import ValueSets from "@/components/ValueSets";
import { getProducts } from "@/lib/medusa";

export default async function Home() {
  const products = await getProducts();

  return (
    <main>
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
      <BrandUniverse />

      {/* ======================================================
          4. HEALTH GOALS / DAILY DISCOVERY
          ====================================================== */}
      <HomeDiscovery />

      {/* ======================================================
          5. VALUE SETS / BUNDLES
          ====================================================== */}
      <ValueSets />

      <section className="brand-statement">
        <span>
          LIVE WELL, LIVE FULLY.
        </span>

        <p>
          VI2 · DIETARY & WELLNESS SUPPLEMENTS
        </p>
      </section>
    </main>
  );
}
