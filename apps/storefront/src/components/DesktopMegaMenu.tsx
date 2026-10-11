"use client";
import { useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import {
  ArrowRight,
  ChevronRight,
  ShoppingBag,
  BadgePercent,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { getBrands } from "@/lib/medusa/services/brands";
import type { Brand } from "@/types/brand";
import {
  categoryHref,
  flattenCategories,
  type Category,
} from "@/lib/category-tree";
import styles from "./DesktopMegaMenu.module.css";
export type MegaMenuKey = string;
export default function DesktopMegaMenu({
  active,
  categories,
  onClose,
}: {
  active: string | null;
  categories: Category[];
  onClose: () => void;
}) {
  const { msg } = useLanguage();
  const [brands, setBrands] = useState<Brand[]>([]);
  useEffect(() => {
    if (active === "brands")
      getBrands()
        .then((data) => setBrands(data.filter((b) => b.status === "active")))
        .catch(() => setBrands([]));
  }, [active]);
  if (!active) return null;
  const category = categories.find((c) => c.id === active);
  if (active !== "brands" && !category) return null;
  const items =
    active === "brands"
      ? brands.map((b) => ({
          id: b.id,
          name: b.name,
          href: `/shop?brand=${encodeURIComponent(b.name)}`,
        }))
      : flattenCategories(category!.children).map((c) => ({
          id: c.id,
          name: c.name,
          href: categoryHref(c.id),
        }));
  const columnCount = Math.min(4, Math.max(1, items.length));
  const columnSize = Math.ceil(items.length / columnCount);
  const columns = Array.from({ length: columnCount }, (_, index) =>
    items.slice(index * columnSize, (index + 1) * columnSize),
  );
  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={msg("nav.close")}
        onClick={onClose}
      />
      <div className={styles.menu} id="desktop-category-menu" data-no-translate>
        <div className={styles.inner}>
          <div className={styles.intro}>
            <span>{msg("nav.shopVi2")}</span>
            <h3>{category?.name ?? msg("nav.brands")}</h3>
            <Link
              href={category ? categoryHref(category.id) : "/brands"}
              onClick={onClose}
            >
              {msg("nav.shopAll")}
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className={styles.columns}>
            {columns.map((column, i) => (
              <section className={styles.column} key={i}>
                <div>
                  {column.map((item) => (
                    <Link key={item.id} href={item.href} onClick={onClose}>
                      {item.name}
                      <ArrowRight size={12} />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className={styles.side}>
            <span>{msg("nav.collection")}</span>
            <Link href="/shop" onClick={onClose}>
              {msg("nav.shop")}
            </Link>
            <Link href="/deals" onClick={onClose}>
              <BadgePercent size={18} />
              {msg("nav.deals")}
            </Link>
            <Link href="/#value-sets" onClick={onClose}>
              <ShoppingBag size={18} />
              {msg("nav.bundles")}
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
