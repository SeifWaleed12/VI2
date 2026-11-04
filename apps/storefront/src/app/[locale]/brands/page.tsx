import { isLocale, message, type MessageKey } from "@/lib/i18n";
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

export default async function BrandsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const msg = (key: MessageKey) => message(isLocale(locale) ? locale : "en", key);
  const medusaBrands = await getBrands();
  const brandProfiles = medusaBrands;
  const alphabetGroups = [...new Set(medusaBrands.map((brand) => brand.name[0].toUpperCase()))].sort().map((letter) => ({
    letter, brands: medusaBrands.filter((brand) => brand.name[0].toUpperCase() === letter),
  }));

  return (
    <main
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
              >{msg("brands.theVi2BrandEdit")}</span>

              <h1>{msg("brands.brandsAZ")}</h1>

              <p>{msg("brands.browseTheSupplementAndWellness")}</p>
            </div>

            <div
              className={
                styles.count
              }
            >
              <strong>
                {medusaBrands.length}
              </strong>

              <span>{msg("brands.curated")}<br />{msg("brands.brands")}</span>
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

                <span>{msg("brands.viewAllProducts")}</span>

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
                <span>{msg("brands.vi2Brands")}</span>

                <small>{msg("brands.shopByBrand")}</small>
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
                        >{msg("brands.new")}</span>
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
              >{msg("brands.shopAll")}<ArrowRight
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
    </main>
  );
}
