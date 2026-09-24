import type { Metadata } from "next";
import Image, {
  type StaticImageData,
} from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Package,
} from "lucide-react";

import nutriNationsLogo from "@/assets/brands/nutri-nations.png";
import doctorsBestLogo from "@/assets/brands/doctors-best.png";
import nowFoodsLogo from "@/assets/brands/now-foods.png";
import californiaGoldLogo from "@/assets/brands/california-gold.png";
import optimumNutritionLogo from "@/assets/brands/optimum-nutrition.png";
import bigRamyLabsLogo from "@/assets/brands/big-ramy-labs.png";

import {
  brandProfiles,
} from "@/data/brands";
import {
  products as fallbackProducts,
} from "@/data/products";
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

const logoByBrand: Record<
  string,
  StaticImageData
> = {
  "Nutri-Nations":
    nutriNationsLogo,
  "Doctor's Best":
    doctorsBestLogo,
  "NOW Foods":
    nowFoodsLogo,
  "California Gold Nutrition":
    californiaGoldLogo,
  "Optimum Nutrition":
    optimumNutritionLogo,
  "Big Ramy Labs":
    bigRamyLabsLogo,
};

const alphabetGroups = [
  {
    letter: "B",
    brands: [
      "Big Ramy Labs",
    ],
  },
  {
    letter: "C",
    brands: [
      "California Gold Nutrition",
    ],
  },
  {
    letter: "D",
    brands: [
      "Doctor's Best",
    ],
  },
  {
    letter: "N",
    brands: [
      "NOW Foods",
      "Nutri-Nations",
    ],
  },
  {
    letter: "O",
    brands: [
      "Optimum Nutrition",
    ],
  },
];

export default async function BrandsPage() {
  const [medusaProducts, medusaBrands] = await Promise.all([
    getProducts().catch(() => []),
    getBrands().catch(() => []),
  ]);

  const activeProducts =
    medusaProducts && medusaProducts.length > 0
      ? medusaProducts
      : fallbackProducts;

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
                06
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
                              href={`/shop?brand=${encodeURIComponent(
                                brand,
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
                      href={`/shop?brand=${encodeURIComponent(
                        brand.name,
                      )}`}
                      className={
                        styles.logoTile
                      }
                    >
                      <Image
                        src={
                          logoByBrand[
                            brand.name
                          ]
                        }
                        alt={`${brand.name} logo`}
                        fill
                        sizes="220px"
                        className={
                          styles.logo
                        }
                      />

                      {brand.featured && (
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
    </main>
  );
}
