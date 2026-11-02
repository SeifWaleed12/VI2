"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/LocaleLink";
import CategoryStatus from "@/components/CategoryStatus";
import DesktopMegaMenu, { type MegaMenuKey } from "@/components/DesktopMegaMenu";
import { useLanguage } from "@/context/LanguageContext";
import type { CategoryDirectory } from "@/lib/category-tree";
import styles from "./Navbar.module.css";

type Props = {
  directory: CategoryDirectory;
  loadingCategories: boolean;
  retryCategories: () => void;
  megaOpen: MegaMenuKey | null;
  setMegaOpen: (key: MegaMenuKey | null) => void;
};

const firstMenuLink = () => document.getElementById("desktop-category-menu")?.querySelector<HTMLAnchorElement>("a");

// The desktop category row and its mega menu.
export default function NavbarCategoryRow({ directory, loadingCategories, retryCategories, megaOpen, setMegaOpen }: Props) {
  const { msg } = useLanguage();
  const focusMenuOnOpen = useRef(false);

  useEffect(() => {
    if (megaOpen && focusMenuOnOpen.current) {
      firstMenuLink()?.focus();
      focusMenuOnOpen.current = false;
    }
  }, [megaOpen]);

  const hoverMenu = (key: MegaMenuKey) => ({
    onMouseEnter: () => setMegaOpen(key),
    onFocus: () => setMegaOpen(key),
    onClick: () => setMegaOpen(null),
  });

  return (
    <>
      <nav className={styles.desktopCategories} aria-label={msg("nav.mainCategories")} data-header-row>
        <div className={styles.categoryInner}>
          <div className={styles.categoryMain}>
            {directory.roots.map(category => (
              <button key={category.id} type="button"
                className={megaOpen === category.id ? styles.categoryTriggerActive : styles.categoryTrigger}
                aria-expanded={megaOpen === category.id} aria-controls="desktop-category-menu"
                onMouseEnter={() => setMegaOpen(category.id)}
                onKeyDown={(event) => {
                  if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
                  event.preventDefault();
                  if (megaOpen === category.id) {
                    firstMenuLink()?.focus();
                  } else {
                    focusMenuOnOpen.current = true;
                    setMegaOpen(category.id);
                  }
                }}
                onClick={() => setMegaOpen(category.id)}>{category.name}</button>
            ))}
            {!directory.roots.length && <CategoryStatus error={directory.error} loading={loadingCategories} retry={retryCategories} />}
          </div>

          <div className={styles.categoryUtilities}>
            <span className={styles.categoryDivider} />
            <Link href="/brands" {...hoverMenu("brands")}>{msg("nav.brands")}</Link>
            <Link href="/#health-goals" {...hoverMenu("goals")}>{msg("nav.health")}</Link>
            <Link href="/deals" className={styles.dealLink}>{msg("nav.deals")}</Link>
          </div>
        </div>
      </nav>

      <DesktopMegaMenu categories={directory.roots} active={megaOpen} onClose={() => setMegaOpen(null)} />
    </>
  );
}
