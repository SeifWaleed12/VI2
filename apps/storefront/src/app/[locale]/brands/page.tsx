import { LegacyTranslations } from "@/context/LanguageContext";
import { isLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import {
  ArrowRight,
  ArrowUpRight,
  Package,
} from "lucide-react";

import BrandLogo from "./BrandLogo";

import {
  getProducts,
  getBrands,
} from "@/lib/medusa";

import styles from "./Brands.module.css";

export const metadata: Metadata = {
  title: "Brands A–Z | Vi2",
  description:
    "Browse every supplement and wellness brand available at Vi2.",
};

export default async function BrandsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  const [medusaProducts, medusaBrands] = await Promise.all([
    getProducts({locale}),
    getBrands(),
  ]);

  const activeProducts = medusaProducts;
  const brandProfiles = medusaBrands;
  const alphabetGroups = [...new Set(medusaBrands.map((brand) => brand.name[0].toUpperCase()))].sort().map((letter) => ({
    letter, brands: medusaBrands.filter((brand) => brand.name[0].toUpperCase() === letter).map((brand) => brand.name),
  }));
  const productCountByBrand =
    activeProducts.reduce<
      Record<string, number>
    >(
      (
        counts,
        product,
      ) => {
        counts[
          product.brand
        ] =
          (counts[
            product.brand
          ] ?? 0) + 1;

        return counts;
      },
      {},
    );

  return (
    <LegacyTranslations><main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.directory
        }
      >
        <div
          className={
            styles.shell
          }
        >
          <header
            className={
              styles.header
            }
          >
            <div>
              <span
                className={
                  styles.kicker
                }
              >
                THE VI2 BRAND EDIT
              </span>

              <h1>
                BRANDS A–Z
              </h1>

              <p>
                Browse the supplement
                and wellness brands
                curated for Vi2.
              </p>
            </div>

            <div
              className={
                styles.count
              }
            >
              <strong>
                {medusaBrands.length}
              </strong>

              <span data-arabic-text="علامات مختارة">
                CURATED
                <br />
                BRANDS
              </span>
            </div>
          </header>

          <div
            className={
              styles.content
            }
          >
            <div
              className={
                styles.azColumns
              }
            >
              {alphabetGroups.map(
                (
                  group,
                ) => (
                  <div
                    key={
                      group.letter
                    }
                    className={
                      styles.column
                    }
                  >
                    <div
                      className={
                        styles.letter
                      }
                    >
                      {
                        group.letter
                      }
                    </div>

                    <div
                      className={
                        styles.brandLinks
                      }
                    >
                      {group.brands.map(
                        (
                          brand,
                        ) => {
                          const count =
                            productCountByBrand[
                              brand
                            ] ?? 0;

                          return (
                            <Link
                              key={
                                brand
                              }
                              href={`/shop?brand_id=${encodeURIComponent(
                                medusaBrands.find(profile => profile.name === brand)!.id,
                              )}`}
                              className={
                                styles.brandLink
                              }
                            >
                              <div>
                                <span>
                                  {
                                    brand
                                  }
                                </span>

                                <small data-arabic-text={`${count} منتج`}>
                                  {
                                    count
                                  }{" "}
                                  {count ===
                                  1
                                    ? "product"
                                    : "products"}
                                </small>
                              </div>

                              <ArrowUpRight
                                size={
                                  14
                                }
                                strokeWidth={
                                  1.45
                                }
                              />
                            </Link>
                          );
                        },
                      )}
                    </div>
                  </div>
                ),
              )}

              <Link
                href="/shop"
                className={
                  styles.viewAll
                }
              >
                <Package
                  size={15}
                  strokeWidth={
                    1.45
                  }
                />

                <span>
                  VIEW ALL PRODUCTS
                </span>

                <ArrowRight
                  size={14}
                  strokeWidth={
                    1.45
                  }
                />
              </Link>
            </div>

            <aside
              className={
                styles.brandRail
              }
            >
              <div
                className={
                  styles.railTitle
                }
              >
                <span>
                  VI2 BRANDS
                </span>

                <small>
                  SHOP BY BRAND
                </small>
              </div>

              <div
                className={
                  styles.logoList
                }
              >
                {brandProfiles.map(
                  (
                    brand,
                  ) => (
                    <Link
                      key={
                        brand.name
                      }
                      href={`/shop?brand_id=${encodeURIComponent(
                        brand.id,
                      )}`}
                      className={
                        styles.logoTile
                      }
                    >
                      <BrandLogo name={brand.name} logo={brand.logo} className={styles.logo} />

                      {false && (
                        <span
                          className={
                            styles.newBadge
                          }
                        >
                          NEW
                        </span>
                      )}
                    </Link>
                  ),
                )}
              </div>

              <Link
                href="/shop"
                className={
                  styles.shopAll
                }
              >
                SHOP ALL
                <ArrowRight
                  size={14}
                  strokeWidth={
                    1.45
                  }
                />
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main></LegacyTranslations>
  );
}
