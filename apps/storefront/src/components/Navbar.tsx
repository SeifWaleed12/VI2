"use client";

import Image from "next/image";
import { Globe2, Menu, Search, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import { type MegaMenuKey } from "@/components/DesktopMegaMenu";
import GlobalSearch from "@/components/GlobalSearch";
import LocaleToggle from "@/components/LocaleToggle";
import MobileBottomNav from "@/components/MobileBottomNav";
import NavbarAccount from "@/components/NavbarAccount";
import NavbarCategoryRow from "@/components/NavbarCategoryRow";
import NavbarDrawer from "@/components/NavbarDrawer";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import type { CategoryDirectory } from "@/lib/category-tree";
import { getCategoryTree } from "@/lib/medusa/services/categories";
import styles from "./Navbar.module.css";

const MENU_ID = "desktop-category-menu";

// The site header: utility strip, main bar and category row, plus the panels it opens.
export default function Navbar({ initialDirectory = { roots: [], error: false } }: { initialDirectory?: CategoryDirectory }) {
  const { msg, language, isArabic } = useLanguage();
  const { itemCount, openCart, isCartOpen } = useCart();
  const headerRef = useRef<HTMLDivElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const [directory, setDirectory] = useState(initialDirectory);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<MegaMenuKey | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  async function retryCategories() {
    setLoadingCategories(true);
    try { setDirectory({ roots: await getCategoryTree(language), error: false }); }
    catch { setDirectory({ roots: [], error: true }); }
    finally { setLoadingCategories(false); }
  }
  const [shownDirectory, setShownDirectory] = useState(initialDirectory);
  if (shownDirectory !== initialDirectory) {
    setShownDirectory(initialDirectory);
    setDirectory(initialDirectory);
  }

  // Publishes where the header ends, for panels positioned below it.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const rows = header.querySelectorAll<HTMLElement>("[data-header-row]");
    const update = () => {
      const bottom = Math.max(0, ...Array.from(rows, row => row.getBoundingClientRect().bottom));
      document.documentElement.style.setProperty("--vi2-header-bottom", `${bottom}px`);
    };
    const observer = new ResizeObserver(update);
    rows.forEach(row => observer.observe(row));
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", update); };
  }, []);

  useEffect(() => {
    if (!megaOpen) return;
    const dismiss = () => {
      if (document.hasFocus() && document.getElementById(MENU_ID)?.contains(document.activeElement)) {
        searchTriggerRef.current?.focus({ preventScroll: true });
      }
      setMegaOpen(null);
    };
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
    };
  }, [megaOpen]);

  const overlayOpen = menuOpen || searchOpen || isCartOpen;
  useEffect(() => {
    if (!overlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [overlayOpen]);

  // Opening the cart closes every other panel (checked during render, not in an effect).
  const [cartWasOpen, setCartWasOpen] = useState(isCartOpen);
  if (isCartOpen !== cartWasOpen) {
    setCartWasOpen(isCartOpen);
    if (isCartOpen) {
      setMenuOpen(false);
      setSearchOpen(false);
      setMegaOpen(null);
      setAccountOpen(false);
    }
  }

  // Another page can ask for search to open on arrival.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("vi2-open-global-search") === "1") {
        window.sessionStorage.removeItem("vi2-open-global-search");
        window.setTimeout(() => setSearchOpen(true), 40);
      }
    } catch {
      // Search remains available from the header.
    }
  }, []);

  // The account menu handles its own Escape.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.getElementById(MENU_ID)?.contains(document.activeElement)) {
        headerRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="${MENU_ID}"][aria-expanded="true"]`)?.focus();
      }
      setMenuOpen(false);
      setSearchOpen(false);
      setMegaOpen(null);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  function openSearch() {
    setMenuOpen(false);
    setMegaOpen(null);
    setAccountOpen(false);
    setSearchOpen(true);
  }

  return (
    <>
      <div
        ref={headerRef}
        data-no-translate
        className={styles.header}
        onBlur={event => {
          const next = event.relatedTarget;
          // Empty panel space can blur a link without moving keyboard focus outside.
          if (next === null) return;
          const nav = event.currentTarget.querySelector("nav[data-header-row]");
          const menu = document.getElementById(MENU_ID);
          if (!(next instanceof Node) || (!nav?.contains(next) && !menu?.contains(next))) setMegaOpen(null);
        }}
        onMouseLeave={() => setMegaOpen(null)}
      >
        <div className={styles.utilityStrip}>
          <div className={styles.utilityInner}>
            <div className={styles.utilityLeft}>
              <AnnouncementTicker />
            </div>
            <div className={styles.utilityRight} role="region" aria-label={msg("nav.preferences")}>
              <Globe2 size={15} strokeWidth={1.4} />
              <span>{msg("nav.country")}</span>
              <span className={styles.utilityDivider} />
              <LocaleToggle />
              <span className={styles.utilityDivider} />
              <strong>{msg("nav.egp")}</strong>
            </div>
          </div>
        </div>

        <div className={styles.mobileAnnouncement}>
          <AnnouncementTicker />
        </div>

        <header className={styles.mainBar} data-header-row>
          <div className={styles.mainInner}>
            <button type="button" className={styles.mobileMenuButton} aria-label={msg("navbar.menu")} onClick={() => setMenuOpen(true)}>
              <Menu size={23} strokeWidth={1.45} />
            </button>

            <Link href="/" className={styles.logo} aria-label={msg("footer.home")}>
              <Image src="/brand/vi2-logo-mark-black.png" alt="Vi2" width={58} height={70} priority />
            </Link>

            <button type="button" className={styles.searchBar} ref={searchTriggerRef} onClick={openSearch} aria-label={msg("nav.search")}>
              <span>{msg("navbar.search")}</span>
              <Search size={22} strokeWidth={1.45} />
            </button>

            <NavbarAccount open={accountOpen} setOpen={setAccountOpen} onOpening={() => setMegaOpen(null)} />

            <button
              type="button"
              className={styles.cart}
              data-cart-trigger
              aria-label={msg("navbar.cart")}
              onClick={() => {
                setMenuOpen(false);
                setMegaOpen(null);
                setAccountOpen(false);
                setSearchOpen(false);
                openCart();
              }}
            >
              <ShoppingBag size={24} strokeWidth={1.4} />
              {itemCount > 0 && <span className={styles.cartCount}>{itemCount}</span>}
            </button>
          </div>
        </header>

        <NavbarCategoryRow
          directory={directory}
          loadingCategories={loadingCategories}
          retryCategories={retryCategories}
          megaOpen={megaOpen}
          setMegaOpen={setMegaOpen}
        />
      </div>

      <NavbarDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        directory={directory}
        loadingCategories={loadingCategories}
        retryCategories={retryCategories}
      />

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} isArabic={isArabic} />

      <MobileBottomNav hidden={menuOpen} />
    </>
  );
}
