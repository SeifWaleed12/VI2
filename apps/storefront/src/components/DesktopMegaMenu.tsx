"use client";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  ChevronRight,
  ShoppingBag,
  Trophy,
} from "lucide-react";

import { getBrands } from "@/lib/medusa/services/brands";
import { useCategories } from "@/providers/category-provider"
import { categoryLinks } from "@/lib/category-navigation"
import type { Brand } from "@/types/brand";

import styles from "./DesktopMegaMenu.module.css";

export type MegaMenuKey = string

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
  active: MegaMenuKey | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  const { categories } = useCategories()

  // Dynamically loaded brands from the backend API
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    getBrands()
      .then((data) => {
        // Only show active brands in the menu
        setBrands(data.filter((b) => b.status === "active"));
      })
      .catch(() => {
        // Silently fail — menu will show empty brands section
      });
  }, []);

  // Derive alphabetical brand groups from live data
  const brandGroups = brands.reduce<{ letter: string; brands: { name: string; href: string }[] }[]>(
    (acc, brand) => {
      const letter = brand.name[0].toUpperCase();
      const existing = acc.find((g) => g.letter === letter);
      const entry = {
        name: brand.name,
        href: `/shop?brand=${encodeURIComponent(brand.name)}`,
      };
      if (existing) {
        existing.brands.push(entry);
      } else {
        acc.push({ letter, brands: [entry] });
      }
      return acc;
    },
    []
  ).sort((a, b) => a.letter.localeCompare(b.letter));

  // Derive logo tiles — only brands that have a logo URL set
  const brandLogos = brands
    .filter((b) => !!b.logo)
    .map((b) => ({
      name: b.name,
      href: `/shop?brand=${encodeURIComponent(b.name)}`,
      logo: b.logo as string,
    }));

  if (!active) {
    return null;
  }

  if (active === "brands") {
    return (
      <MenuShell onClose={onClose}>
        <div className={styles.brandsInner}>
          <div className={styles.brandDirectory}>
            {t(brandGroups.map((group) => (
              <section key={group.letter} className={styles.brandColumn}>
                <strong>{t(group.letter)}</strong>
                <div>
                  {t(group.brands.map((brand) => (
                    <Link key={brand.name} href={brand.href} onClick={onClose}>
                      {t(brand.name)}
                    </Link>
                  )))}
                </div>
              </section>
            )))}

            <Link
              href="/brands"
              onClick={onClose}
              className={styles.allBrands}
            >{t("VIEW ALL BRANDS")}<ArrowRight size={15} strokeWidth={1.45} />
            </Link>
          </div>

          <aside className={styles.brandsSide}>
            <div className={styles.brandsSideTitle}>
              <span>{t("VI2 BRANDS")}</span>
              <small>{t("SHOP BY BRAND")}</small>
            </div>

            <div className={styles.brandLogoGrid}>
              {t(brandLogos.map((brand) => (
                <Link
                  key={brand.name}
                  href={brand.href}
                  onClick={onClose}
                  className={styles.brandLogoTile}
                  aria-label={t(`Shop ${brand.name}`)}
                >
                  <Image
                    src={brand.logo}
                    alt={t(`${brand.name} logo`)}
                    fill
                    sizes="190px"
                    className={styles.brandLogo}
                    unoptimized
                  />
                </Link>
              )))}
            </div>

            <Link href="/brands" onClick={onClose} className={styles.shopBrands}>
              {t("SHOP ALL")}<ChevronRight size={14} strokeWidth={1.45} />
            </Link>
          </aside>
        </div>
      </MenuShell>
    );
  }

  const category = categories.find((item) => item.id === active)
  if (!category) return null
  const menu = {
    label: category.name,
    description: category.description,
    allHref: category.href,
    columns: (category.children.length ? category.children : [category]).map((child) => ({
      id: child.id,
      title: child.name,
      items: categoryLinks(child),
    })),
  }

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
                  column.id
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
                        key={item.id}
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
