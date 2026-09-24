"use client";
import { useLanguage } from "@/context/LanguageContext";


import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  ChevronRight,
  ShoppingBag,
  Trophy,
} from "lucide-react";

import nutriNationsLogo from "@/assets/brands/nutri-nations.png";
import doctorsBestLogo from "@/assets/brands/doctors-best.png";
import nowFoodsLogo from "@/assets/brands/now-foods.png";
import californiaGoldLogo from "@/assets/brands/california-gold.png";
import optimumNutritionLogo from "@/assets/brands/optimum-nutrition.png";
import bigRamyLabsLogo from "@/assets/brands/big-ramy-labs.png";

import styles from "./DesktopMegaMenu.module.css";

export type MegaMenuKey =
  | "supplements"
  | "sports"
  | "vitamins"
  | "wellness"
  | "brands";

type MegaColumn = {
  title: string;
  items: {
    label: string;
    href: string;
  }[];
};

type MegaConfig = {
  label: string;
  description: string;
  allHref: string;
  columns: MegaColumn[];
};

const menus: Record<
  Exclude<
    MegaMenuKey,
    "brands"
  >,
  MegaConfig
> = {
  supplements: {
    label: "SUPPLEMENTS",
    description:
      "Browse ingredients and everyday supplement essentials without leaving the page.",
    allHref: "/shop",
    columns: [
      {
        title: "POPULAR",
        items: [
          {
            label:
              "Omega-3 & Fish Oils",
            href:
              "/shop?q=Omega-3",
          },
          {
            label:
              "Ashwagandha",
            href:
              "/shop?q=Ashwagandha",
          },
          {
            label:
              "Magnesium",
            href:
              "/shop?q=Magnesium",
          },
          {
            label:
              "Probiotics",
            href:
              "/shop?q=Probiotics",
          },
          {
            label:
              "CoQ10",
            href:
              "/shop?q=CoQ10",
          },
        ],
      },
      {
        title:
          "DIGESTION & GUT",
        items: [
          {
            label:
              "Probiotics",
            href:
              "/shop?q=Probiotics",
          },
          {
            label:
              "Prebiotics",
            href:
              "/shop?q=Prebiotics",
          },
          {
            label:
              "Digestive Enzymes",
            href:
              "/shop?q=Digestive%20Enzymes",
          },
          {
            label:
              "Fiber",
            href:
              "/shop?q=Fiber",
          },
        ],
      },
      {
        title: "HERBS",
        items: [
          {
            label:
              "Ashwagandha",
            href:
              "/shop?q=Ashwagandha",
          },
          {
            label:
              "Rhodiola",
            href:
              "/shop?q=Rhodiola",
          },
          {
            label:
              "Turmeric / Curcumin",
            href:
              "/shop?q=Turmeric",
          },
          {
            label:
              "Milk Thistle",
            href:
              "/shop?q=Milk%20Thistle",
          },
        ],
      },
      {
        title: "SPECIALTY",
        items: [
          {
            label:
              "Collagen",
            href:
              "/shop?q=Collagen",
          },
          {
            label:
              "L-Carnitine",
            href:
              "/shop?q=L-Carnitine",
          },
          {
            label:
              "Glutamine",
            href:
              "/shop?q=Glutamine",
          },
          {
            label:
              "NMN / NAD+",
            href:
              "/shop?q=NMN",
          },
        ],
      },
    ],
  },

  sports: {
    label:
      "SPORTS NUTRITION",
    description:
      "Protein, performance, recovery and hydration organized for faster shopping.",
    allHref:
      "/shop?goal=Muscle%20%26%20Recovery",
    columns: [
      {
        title: "PROTEIN",
        items: [
          {
            label:
              "Whey Protein",
            href:
              "/shop?q=Whey",
          },
          {
            label:
              "Whey Isolate",
            href:
              "/shop?q=Whey%20Isolate",
          },
          {
            label:
              "Plant Protein",
            href:
              "/shop?q=Plant%20Protein",
          },
          {
            label:
              "Mass Gainers",
            href:
              "/shop?q=Mass%20Gainer",
          },
        ],
      },
      {
        title:
          "PERFORMANCE",
        items: [
          {
            label:
              "Creatine",
            href:
              "/shop?q=Creatine",
          },
          {
            label:
              "Pre-Workout",
            href:
              "/shop?q=Pre-Workout",
          },
          {
            label:
              "BCAAs / EAAs",
            href:
              "/shop?q=BCAA",
          },
          {
            label:
              "Glutamine",
            href:
              "/shop?q=Glutamine",
          },
        ],
      },
      {
        title:
          "HYDRATION",
        items: [
          {
            label:
              "Electrolytes",
            href:
              "/shop?q=Electrolytes",
          },
          {
            label:
              "Hydration",
            href:
              "/shop?q=Hydration",
          },
          {
            label:
              "Energy",
            href:
              "/shop?q=Energy",
          },
        ],
      },
      {
        title: "GOALS",
        items: [
          {
            label:
              "Muscle & Recovery",
            href:
              "/shop?goal=Muscle%20%26%20Recovery",
          },
          {
            label:
              "Energy & Fitness",
            href:
              "/shop?goal=Energy%20%26%20Fitness",
          },
          {
            label:
              "Weight Management",
            href:
              "/shop?q=Weight%20Management",
          },
        ],
      },
    ],
  },

  vitamins: {
    label:
      "VITAMINS & MINERALS",
    description:
      "Daily vitamins, minerals and multivitamins grouped for quick comparison.",
    allHref:
      "/shop?category=Vitamins",
    columns: [
      {
        title: "VITAMINS",
        items: [
          {
            label:
              "Vitamin C",
            href:
              "/shop?q=Vitamin%20C",
          },
          {
            label:
              "Vitamin D3",
            href:
              "/shop?q=Vitamin%20D3",
          },
          {
            label:
              "B-Complex",
            href:
              "/shop?q=B-Complex",
          },
          {
            label:
              "Vitamin E",
            href:
              "/shop?q=Vitamin%20E",
          },
        ],
      },
      {
        title: "MINERALS",
        items: [
          {
            label:
              "Magnesium",
            href:
              "/shop?q=Magnesium",
          },
          {
            label:
              "Zinc",
            href:
              "/shop?q=Zinc",
          },
          {
            label:
              "Calcium",
            href:
              "/shop?q=Calcium",
          },
          {
            label:
              "Iron",
            href:
              "/shop?q=Iron",
          },
        ],
      },
      {
        title:
          "MULTIVITAMINS",
        items: [
          {
            label:
              "Men's Multivitamins",
            href:
              "/shop?q=Men%27s%20Multivitamin",
          },
          {
            label:
              "Women's Multivitamins",
            href:
              "/shop?q=Women%27s%20Multivitamin",
          },
          {
            label:
              "Daily Multivitamins",
            href:
              "/shop?q=Multivitamin",
          },
        ],
      },
      {
        title:
          "ESSENTIALS",
        items: [
          {
            label:
              "Vitamin D3 & K2",
            href:
              "/shop?q=D3%20K2",
          },
          {
            label:
              "Trace Minerals",
            href:
              "/shop?q=Minerals",
          },
          {
            label:
              "Electrolytes",
            href:
              "/shop?q=Electrolytes",
          },
        ],
      },
    ],
  },

  wellness: {
    label: "WELLNESS",
    description:
      "Shop around the goal first: sleep, stress, heart, gut and everyday wellbeing.",
    allHref:
      "/shop?category=Wellness",
    columns: [
      {
        title:
          "DAILY WELLNESS",
        items: [
          {
            label:
              "Immune Support",
            href:
              "/shop?goal=Immune%20Support",
          },
          {
            label:
              "Stress & Sleep",
            href:
              "/shop?goal=Stress%20%26%20Sleep",
          },
          {
            label:
              "Heart Health",
            href:
              "/shop?goal=Heart%20Health",
          },
          {
            label:
              "Gut Health",
            href:
              "/shop?goal=Gut%20Health",
          },
        ],
      },
      {
        title:
          "MIND & MOOD",
        items: [
          {
            label:
              "Sleep Support",
            href:
              "/shop?q=Sleep",
          },
          {
            label:
              "Stress Relief",
            href:
              "/shop?q=Stress",
          },
          {
            label:
              "Focus",
            href:
              "/shop?q=Focus",
          },
        ],
      },
      {
        title:
          "BODY SUPPORT",
        items: [
          {
            label:
              "Bone & Joint",
            href:
              "/shop?q=Joint",
          },
          {
            label:
              "Hair, Skin & Nails",
            href:
              "/shop?q=Collagen",
          },
          {
            label:
              "Healthy Aging",
            href:
              "/shop?q=CoQ10",
          },
        ],
      },
      {
        title: "DISCOVER",
        items: [
          {
            label:
              "All Health Goals",
            href:
              "/#health-goals",
          },
          {
            label:
              "Best Sellers",
            href:
              "/#best-sellers",
          },
          {
            label:
              "Value Sets",
            href:
              "/#value-sets",
          },
        ],
      },
    ],
  },
};

const brandGroups = [
  {
    letter: "B",
    brands: [
      {
        name:
          "Big Ramy Labs",
        href:
          "/shop?brand=Big%20Ramy%20Labs",
      },
    ],
  },
  {
    letter: "C",
    brands: [
      {
        name:
          "California Gold Nutrition",
        href:
          "/shop?brand=California%20Gold%20Nutrition",
      },
    ],
  },
  {
    letter: "D",
    brands: [
      {
        name:
          "Doctor's Best",
        href:
          "/shop?brand=Doctor%27s%20Best",
      },
    ],
  },
  {
    letter: "N",
    brands: [
      {
        name:
          "NOW Foods",
        href:
          "/shop?brand=NOW%20Foods",
      },
      {
        name:
          "Nutri-Nations",
        href:
          "/shop?brand=Nutri-Nations",
      },
    ],
  },
  {
    letter: "O",
    brands: [
      {
        name:
          "Optimum Nutrition",
        href:
          "/shop?brand=Optimum%20Nutrition",
      },
    ],
  },
];

const brandLogos = [
  {
    name:
      "Nutri-Nations",
    href:
      "/shop?brand=Nutri-Nations",
    logo:
      nutriNationsLogo,
  },
  {
    name:
      "Doctor's Best",
    href:
      "/shop?brand=Doctor%27s%20Best",
    logo:
      doctorsBestLogo,
  },
  {
    name:
      "NOW Foods",
    href:
      "/shop?brand=NOW%20Foods",
    logo:
      nowFoodsLogo,
  },
  {
    name:
      "California Gold Nutrition",
    href:
      "/shop?brand=California%20Gold%20Nutrition",
    logo:
      californiaGoldLogo,
  },
  {
    name:
      "Optimum Nutrition",
    href:
      "/shop?brand=Optimum%20Nutrition",
    logo:
      optimumNutritionLogo,
  },
  {
    name:
      "Big Ramy Labs",
    href:
      "/shop?brand=Big%20Ramy%20Labs",
    logo:
      bigRamyLabsLogo,
  },
];

function MenuShell({
  children,
  onClose,
}: {
  children:
    React.ReactNode;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        className={
          styles.backdrop
        }
        aria-label={t("Close menu")}
        onClick={onClose}
      />

      <div
        className={
          styles.menu
        }
      >
        {t(children)}
      </div>
    </>
  );
}

export default function DesktopMegaMenu({
  active,
  onClose,
}: {
  active:
    MegaMenuKey | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  if (!active) {
    return null;
  }

  if (
    active === "brands"
  ) {
    return (
      <MenuShell
        onClose={onClose}
      >
        <div
          className={
            styles.brandsInner
          }
        >
          <div
            className={
              styles.brandDirectory
            }
          >
            {t(brandGroups.map(
              (
                group,
              ) => (
                <section
                  key={
                    group.letter
                  }
                  className={
                    styles.brandColumn
                  }
                >
                  <strong>
                    {
                      t(group.letter)
                    }
                  </strong>

                  <div>
                    {t(group.brands.map(
                      (
                        brand,
                      ) => (
                        <Link
                          key={
                            brand.name
                          }
                          href={
                            brand.href
                          }
                          onClick={
                            onClose
                          }
                        >
                          {
                            t(brand.name)
                          }
                        </Link>
                      ),
                    ))}
                  </div>
                </section>
              ),
            ))}

            <Link
              href="/brands"
              onClick={
                onClose
              }
              className={
                styles.allBrands
              }
            >{t("VIEW ALL BRANDS")}<ArrowRight
                size={
                  15
                }
                strokeWidth={
                  1.45
                }
              />
            </Link>
          </div>

          <aside
            className={
              styles.brandsSide
            }
          >
            <div
              className={
                styles.brandsSideTitle
              }
            >
              <span>{t("VI2 BRANDS")}</span>

              <small>{t("SHOP BY BRAND")}</small>
            </div>

            <div
              className={
                styles.brandLogoGrid
              }
            >
              {t(brandLogos.map(
                (
                  brand,
                ) => (
                  <Link
                    key={
                      brand.name
                    }
                    href={
                      brand.href
                    }
                    onClick={
                      onClose
                    }
                    className={
                      styles.brandLogoTile
                    }
                    aria-label={t(`Shop ${brand.name}`)}
                  >
                    <Image
                      src={
                        brand.logo
                      }
                      alt={t(`${brand.name} logo`)}
                      fill
                      sizes="190px"
                      className={
                        styles.brandLogo
                      }
                    />
                  </Link>
                ),
              ))}
            </div>

            <Link
              href="/brands"
              onClick={
                onClose
              }
              className={
                styles.shopBrands
              }
            >{t("SHOP ALL")}<ChevronRight
                size={
                  14
                }
                strokeWidth={
                  1.45
                }
              />
            </Link>
          </aside>
        </div>
      </MenuShell>
    );
  }

  const menu =
    menus[active];

  return (
    <MenuShell
      onClose={onClose}
    >
      <div
        className={
          styles.inner
        }
      >
        <div
          className={
            styles.intro
          }
        >
          <span>{t("SHOP VI2")}</span>

          <h3>
            {t(menu.label)}
          </h3>

          <p>
            {
              t(menu.description)
            }
          </p>

          <Link
            href={
              menu.allHref
            }
            onClick={
              onClose
            }
          >{t("SHOP ALL")}<ChevronRight
              size={16}
              strokeWidth={
                1.5
              }
            />
          </Link>
        </div>

        <div
          className={
            styles.columns
          }
        >
          {menu.columns.map(
            (
              column,
            ) => (
              <section
                key={
                  column.title
                }
                className={
                  styles.column
                }
              >
                <strong>
                  {
                    t(column.title)
                  }
                </strong>

                <div>
                  {column.items.map(
                    (
                      item,
                    ) => (
                      <Link
                        key={`${column.title}-${item.label}`}
                        href={
                          item.href
                        }
                        onClick={
                          onClose
                        }
                      >
                        {
                          t(item.label)
                        }
                      </Link>
                    ),
                  )}
                </div>
              </section>
            ),
          )}
        </div>

        <aside
          className={
            styles.side
          }
        >
          <span>{t("TRENDING")}</span>

          <Link
            href="/#best-sellers"
            onClick={
              onClose
            }
          >
            <Trophy
              size={18}
              strokeWidth={
                1.4
              }
            />{t("BEST SELLERS")}</Link>

          <Link
            href="/deals"
            onClick={
              onClose
            }
          >
            <BadgePercent
              size={18}
              strokeWidth={
                1.4
              }
            />{t("FLASH DEALS")}</Link>

          <Link
            href="/#value-sets"
            onClick={
              onClose
            }
          >
            <ShoppingBag
              size={18}
              strokeWidth={
                1.4
              }
            />{t("VALUE SETS")}</Link>
        </aside>
      </div>
    </MenuShell>
  );
}
