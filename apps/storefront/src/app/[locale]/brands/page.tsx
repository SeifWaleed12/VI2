import { LegacyTranslations } from "@/context/LanguageContext";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import {
  ArrowRight,
  ArrowUpRight,
  Package,
} from "lucide-react";

import BrandLogo from "./BrandLogo";

import {
  getBrands,
} from "@/lib/medusa";

import styles from "./Brands.module.css";

export const metadata: Metadata = {
  title: "Brands A–Z | Vi2",
  description:
    "Browse every supplement and wellness brand available at Vi2.",
};

export default async function BrandsPage() {
  const medusaBrands = await getBrands();
  const brandProfiles = medusaBrands;
  const alphabetGroups = [...new Set(medusaBrands.map((brand) => brand.name[0].toUpperCase()))].sort().map((letter) => ({
    letter, brands: medusaBrands.filter((brand) => brand.name[0].toUpperCase() === letter),
  }));

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
                          return (
                            <Link
                              key={
                                brand.id
                              }
                              href={`/shop?brand_id=${encodeURIComponent(
                                brand.id,
                              )}`}
                              className={
                                styles.brandLink
                              }
                            >
                              <div>
                                <span>
                                  {
                                    brand.name
                                  }
                                </span>


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
