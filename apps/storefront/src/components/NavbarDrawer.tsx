"use client";

import { BadgePercent, ChevronLeft, ChevronRight, Globe2, LogOut, Package, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "@/components/LocaleLink";
import CategoryStatus from "@/components/CategoryStatus";
import LocaleToggle from "@/components/LocaleToggle";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useDrawerFocus } from "@/hooks/use-drawer-focus";
import { type CategoryDirectory, categoryHref, flattenCategories } from "@/lib/category-tree";
import { HEALTH_GOALS, goalLabelKey } from "@/lib/health-goals";
import { localizedHref } from "@/lib/i18n";
import { getBrands } from "@/lib/medusa/services/brands";
import type { Brand } from "@/types/brand";
import styles from "./Navbar.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  directory: CategoryDirectory;
  loadingCategories: boolean;
  retryCategories: () => void;
};

// The mobile two-level catalog drawer: categories, shop-by panels, account links.
export default function NavbarDrawer({ open, onClose, directory, loadingCategories, retryCategories }: Props) {
  const { msg, language, isArabic } = useLanguage();
  const { customer, isAuthenticated, signOut } = useAuth();
  const drawerRef = useRef<HTMLElement>(null);
  const panelBackRef = useRef<HTMLButtonElement>(null);
  const panelOpenerRef = useRef<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  // Loaded when the Brands panel is first opened.
  const [brands, setBrands] = useState<Brand[] | "loading" | "error" | null>(null);
  const displayName = customer ? customer.firstName?.trim() || customer.email?.split("@")[0] || "" : "";

  // A closed drawer always reopens at its first level (checked during render).
  if (!open && panel !== null) setPanel(null);

  const close = onClose;
  useDrawerFocus(drawerRef, open, close);

  useEffect(() => {
    if (!open) {
      panelOpenerRef.current = null;
    } else if (panel) {
      panelBackRef.current?.focus({ preventScroll: true });
    } else if (panelOpenerRef.current) {
      panelOpenerRef.current.focus({ preventScroll: true });
      panelOpenerRef.current = null;
    }
  }, [open, panel]);

  const loadBrands = () => {
    setBrands("loading");
    getBrands().then(setBrands, () => setBrands("error"));
  };
  const openPanel = (key: string) => (event: MouseEvent<HTMLButtonElement>) => {
    panelOpenerRef.current = event.currentTarget;
    setPanel(key);
  };

  const selectedCategory = directory.roots.find(c => c.id === panel);
  const activePanel = selectedCategory ? {
    title: selectedCategory.name,
    shopAllHref: categoryHref(selectedCategory.id, selectedCategory.handle),
    items: flattenCategories(selectedCategory.children).map(c => [c.name, categoryHref(c.id, c.handle)]),
  } : panel === "health" ? {
    title: msg("nav.health"),
    shopAllHref: "/shop",
    items: HEALTH_GOALS.map(goal => [msg(goalLabelKey(goal)), `/shop?goal=${goal}`]),
  } : panel === "brands" ? {
    title: msg("nav.brands"),
    shopAllHref: "/brands",
    items: Array.isArray(brands) ? brands.map(brand => [brand.name, `/shop?brand_id=${brand.id}`]) : [],
  } : null;

  const accountLink = (path: string) => (isAuthenticated ? path : `/account/sign-in?next=${path}`);

  return (
    <div
      className={open ? `${styles.drawerBackdrop} ${styles.drawerBackdropOpen}` : styles.drawerBackdrop}
      onMouseDown={close}
      aria-hidden={!open}
      inert={!open}
    >
      <aside data-no-translate
        ref={drawerRef}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={msg("nav.menu")}
        tabIndex={-1}
        className={open ? `${styles.drawer} ${styles.drawerOpen}` : styles.drawer}
        dir={isArabic ? "rtl" : "ltr"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader} inert={!!activePanel} aria-hidden={!!activePanel}>
          <Link href={isAuthenticated ? "/account" : "/account/sign-in"} className={styles.welcome} onClick={close}>
            <UserRound size={25} strokeWidth={1.45} />
            <strong>
              {isAuthenticated && displayName ? msg("navbar.welcomeName").replace("{name}", displayName) : msg("navbar.welcome")}
            </strong>
          </Link>
          <button type="button" className={styles.closeButton} onClick={close} aria-label={msg("nav.close")}>
            <X size={25} strokeWidth={1.4} />
          </button>
        </div>

        <div className={styles.drawerScroll} inert={!!activePanel} aria-hidden={!!activePanel}>
          <section className={styles.menuSection}>
            <span className={styles.sectionLabel}>{msg("nav.categories")}</span>
            <nav className={styles.primaryMenuList} aria-label={msg("nav.mainCategories")}>
              {!directory.roots.length && <CategoryStatus error={directory.error} loading={loadingCategories} retry={retryCategories} />}
              {directory.roots.map((category) => (
                <button key={category.id} type="button" className={styles.primaryMenuButton} onClick={openPanel(category.id)}>
                  <span>{category.name}</span>
                  <ChevronRight size={20} strokeWidth={1.45} />
                </button>
              ))}
            </nav>
          </section>

          <section className={styles.menuSection}>
            <span className={styles.sectionLabel}>{msg("navbar.shopBy")}</span>
            <nav className={styles.simpleLinks} aria-label={msg("nav.shopBy")}>
              <button
                type="button"
                className={styles.simpleMenuButton}
                onClick={event => {
                  if (brands === null || brands === "error") loadBrands();
                  openPanel("brands")(event);
                }}
              >
                <span className={styles.linkWithIcon}><Package size={18} strokeWidth={1.4} />{msg("nav.brands")}</span>
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
              <button type="button" className={styles.simpleMenuButton} onClick={openPanel("health")}><span className={styles.linkWithIcon}><Sparkles size={18} strokeWidth={1.4} />{msg("nav.health")}</span><ChevronRight size={20} strokeWidth={1.5} /></button>
              <Link href="/deals" onClick={close} className={styles.accentLink}>
                <span className={styles.linkWithIcon}><BadgePercent size={18} strokeWidth={1.4} />{msg("nav.deals")}</span>
              </Link>
            </nav>
          </section>

          <section className={styles.accountSection}>
            <Link href={accountLink("/account/information")} onClick={close}><UserRound size={19} strokeWidth={1.4} />{msg("navbar.account")}</Link>
            <Link href={accountLink("/account/orders")} onClick={close}><Package size={19} strokeWidth={1.4} />{msg("navbar.orders")}</Link>
            <Link href={accountLink("/account/points")} onClick={close}><Sparkles size={19} strokeWidth={1.4} />{msg("navbar.rewards")}</Link>
          </section>

          <div className={styles.marketRow}>
            <Globe2 size={20} strokeWidth={1.4} />
            <span>{msg("nav.country")}</span>
            <span className={styles.marketDivider} />
            <LocaleToggle />
            <span className={styles.marketDivider} />
            <strong>{msg("nav.egp")}</strong>
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              className={styles.drawerCta}
              onClick={() => {
                signOut();
                close();
                window.location.href = localizedHref("/", language);
              }}
              style={{ width: "calc(100% - 36px)", border: 0, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <LogOut size={16} strokeWidth={1.35} />
              {msg("navbar.logOut")}
            </button>
          ) : (
            <Link href="/account/sign-in" className={styles.drawerCta} onClick={close}>{msg("navbar.create")}</Link>
          )}
        </div>

        <div
          key={panel ?? "root"}
          className={activePanel ? `${styles.subMenuPanel} ${styles.subMenuPanelOpen}` : styles.subMenuPanel}
          aria-hidden={!activePanel}
        >
          {activePanel && (
            <>
              <div className={styles.subMenuHeader}>
                <button type="button" className={styles.backButton} ref={panelBackRef} onClick={() => setPanel(null)}>
                  <ChevronLeft size={22} strokeWidth={1.45} />
                  <span>{msg("nav.back")}</span>
                </button>
                <button type="button" className={styles.closeButton} onClick={close} aria-label={msg("nav.close")}>
                  <X size={25} strokeWidth={1.4} />
                </button>
              </div>

              <div className={styles.subMenuScroll}>
                <div className={styles.subMenuTitleRow}>
                  <h2>{activePanel.title}</h2>
                  <Link href={activePanel.shopAllHref} onClick={close}>{msg("nav.shopAll")}</Link>
                </div>

                {panel === "brands" && !Array.isArray(brands) && (
                  <div className={styles.subMenuStatus} role="status">
                    <p>{msg(brands === "error" ? "nav.brandsError" : "nav.brandsLoading")}</p>
                    {brands === "error" && <button type="button" onClick={loadBrands}>{msg("catalog.retry")}</button>}
                  </div>
                )}
                {panel === "brands" && Array.isArray(brands) && !brands.length && (
                  <p className={styles.subMenuStatus} role="status">{msg("shop.noBrands")}</p>
                )}
                <nav className={styles.subMenuList} aria-label={activePanel.title}>
                  {activePanel.items.map(([label, href]) => (
                    <Link key={`${label}-${href}`} href={href} onClick={close}>{label}</Link>
                  ))}
                </nav>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
