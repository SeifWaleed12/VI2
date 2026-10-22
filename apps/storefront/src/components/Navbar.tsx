"use client";
import { useLanguage } from "@/context/LanguageContext";


import Image from "next/image";
import Link from "@/components/LocaleLink";
import { localizedHref } from "@/lib/i18n";
import {
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe2,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useCallback,
  useState,
  useRef,
  type MouseEvent,
} from "react";

import GlobalSearch from "@/components/GlobalSearch";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import MobileBottomNav from "@/components/MobileBottomNav";
import DesktopMegaMenu, { type MegaMenuKey } from "@/components/DesktopMegaMenu";
import AccountDropdown from "@/components/AccountDropdown";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useDrawerFocus } from "@/hooks/use-drawer-focus";

import { type CategoryDirectory, categoryHref, flattenCategories } from "@/lib/category-tree";
import { getCategoryTree } from "@/lib/medusa/services/categories";
import CategoryStatus from "@/components/CategoryStatus";
import { getBrands } from "@/lib/medusa/services/brands";
import { HEALTH_GOALS, goalLabelKey } from "@/lib/health-goals";
import type { Brand } from "@/types/brand";

import styles from "./Navbar.module.css";


type MobileCatalogKey = string;

export default function Navbar({ initialDirectory = { roots: [], error: false } }: { initialDirectory?: CategoryDirectory }) {
  const { t, msg } = useLanguage();
  const [directory, setDirectory] = useState(initialDirectory);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const focusMenuOnOpen = useRef(false);
  const accountWrapRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountOpenedByHover = useRef(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelBackRef = useRef<HTMLButtonElement>(null);
  const mobilePanelOpenerRef = useRef<HTMLButtonElement | null>(null);
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

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const { language, setLanguage } = useLanguage();

  const [megaOpen, setMegaOpen] =
    useState<MegaMenuKey | null>(null);

  useEffect(() => {
    if (!megaOpen) return;
    const dismiss = () => {
      if (document.hasFocus() && document.getElementById("desktop-category-menu")?.contains(document.activeElement)) {
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

  const [accountOpen, setAccountOpen] =
    useState(false);

  useEffect(() => {
    if (!accountOpen) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !accountWrapRef.current?.contains(event.target)) {
        accountOpenedByHover.current = false;
        setAccountOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [accountOpen]);

  const { customer, isAuthenticated, isLoading, signOut } = useAuth();
  const displayName = customer
    ? customer.firstName?.trim() || customer.email?.split("@")[0] || ""
    : "";

  const [mobilePanel, setMobilePanel] =
    useState<MobileCatalogKey | null>(null);
  // Loaded when the Brands panel is first opened.
  const [brands, setBrands] = useState<Brand[] | "loading" | "error" | null>(null);
  const loadBrands = () => {
    setBrands("loading");
    getBrands().then(setBrands, () => setBrands("error"));
  };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMobilePanel(null);
  }, [setMenuOpen, setMobilePanel]);
  useDrawerFocus(drawerRef, menuOpen, closeMenu);

  useEffect(() => {
    if (!menuOpen) {
      mobilePanelOpenerRef.current = null;
    } else if (mobilePanel) {
      mobilePanelBackRef.current?.focus({ preventScroll: true });
    } else if (mobilePanelOpenerRef.current) {
      mobilePanelOpenerRef.current.focus({ preventScroll: true });
      mobilePanelOpenerRef.current = null;
    }
  }, [menuOpen, mobilePanel]);

  const {
    itemCount,
    openCart,
    isCartOpen,
  } = useCart();

  const isArabic =
    language === "ar";

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
      setMobilePanel(null);
      setSearchOpen(false);
      setMegaOpen(null);
      setAccountOpen(false);
    }
  }


  useEffect(() => {
    try {
      const shouldOpenSearch =
        window.sessionStorage.getItem(
          "vi2-open-global-search",
        );

      if (
        shouldOpenSearch ===
        "1"
      ) {
        window.sessionStorage.removeItem(
          "vi2-open-global-search",
        );

        window.setTimeout(
          () => {
            setSearchOpen(true);
          },
          40,
        );
      }
    } catch {
      // Search remains available from the header.
    }
  }, []);



  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      if (document.getElementById("desktop-category-menu")?.contains(document.activeElement)) {
        headerRef.current?.querySelector<HTMLButtonElement>('[aria-controls="desktop-category-menu"][aria-expanded="true"]')?.focus();
      }
      if (accountWrapRef.current?.contains(document.activeElement)) {
        accountTriggerRef.current?.focus({ preventScroll: true });
      }
      accountOpenedByHover.current = false;
      setMenuOpen(false);
      setSearchOpen(false);
      setMegaOpen(null);
      setAccountOpen(false);
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () =>
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
  }, []);

  useEffect(() => {
    if (megaOpen && focusMenuOnOpen.current) {
      document.getElementById("desktop-category-menu")?.querySelector<HTMLAnchorElement>("a")?.focus();
      focusMenuOnOpen.current = false;
    }
  }, [megaOpen]);

  function openSearch() {
    setMenuOpen(false);
    setMegaOpen(null);
    setAccountOpen(false);
    setSearchOpen(true);
  }

  const copy = isArabic
    ? {
        flash:
          "العروض اليومية",
        search:
          "ابحث في Vi2",
        account:
          "الحساب",
        signIn:
          "تسجيل الدخول",
        categories:
          "التسوق",
        supplements:
          "المكملات",
        sports:
          "التغذية الرياضية",
        vitamins:
          "الفيتامينات والمعادن",
        wellness:
          "العافية",
        beauty:
          "الجمال والعافية",
        kids:
          "الأطفال",
        brands:
          "العلامات التجارية",
        health:
          "الأهداف الصحية",
        deals:
          "العروض",
        best:
          "تسوق المنتجات",
        new:
          "جديد",
        bundles:
          "الباقات",
        welcome:
          "مرحباً!",
        shopBy:
          "تسوق حسب",
        orders:
          "طلباتي",
        rewards:
          "مكافآتي",
        create:
          "تسجيل الدخول / إنشاء حساب",
        menu:
          "القائمة",
        cart:
          "السلة",
      }
    : {
        flash:
          "DAILY FLASH DEALS",
        search:
          "Search all of Vi2",
        account:
          "ACCOUNT",
        signIn:
          "SIGN IN",
        categories:
          "SHOP",
        supplements:
          "Supplements",
        sports:
          "Sports Nutrition",
        vitamins:
          "Vitamins & Minerals",
        wellness:
          "Wellness",
        beauty:
          "Beauty & Wellness",
        kids:
          "Baby & Kids",
        brands:
          "Brands",
        health:
          "Health Goals",
        deals:
          "Deals",
        best:
          "Shop Products",
        new:
          "New",
        bundles:
          "Bundles",
        welcome:
          "Welcome!",
        shopBy:
          "SHOP BY",
        orders:
          "My Orders",
        rewards:
          "My Rewards",
        create:
          "SIGN IN / CREATE ACCOUNT",
        menu:
          "Menu",
        cart:
          "Cart",
      };

  const primaryMobileCategories = directory.roots.map(c => ({ key: c.id, label: c.name }));
  const selectedCategory = directory.roots.find(c => c.id === mobilePanel);
  const activeMobilePanel = selectedCategory ? {
    title: selectedCategory.name,
    shopAllHref: categoryHref(selectedCategory.id, selectedCategory.handle),
    items: flattenCategories(selectedCategory.children).map(c => [c.name, categoryHref(c.id, c.handle)]),
  } : mobilePanel === "health" ? {
    title: msg("nav.health"),
    shopAllHref: "/shop",
    items: HEALTH_GOALS.map(goal => [msg(goalLabelKey(goal)), `/shop?goal=${goal}`]),
  } : mobilePanel === "brands" ? {
    title: msg("nav.brands"),
    shopAllHref: "/brands",
    items: Array.isArray(brands) ? brands.map(brand => [brand.name, `/shop?brand_id=${brand.id}`]) : [],
  } : null;
  const openPanel = (key: MobileCatalogKey) => (event: MouseEvent<HTMLButtonElement>) => {
    mobilePanelOpenerRef.current = event.currentTarget;
    setMobilePanel(key);
  };

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
          const menu = document.getElementById("desktop-category-menu");
          if (!(next instanceof Node) || (!nav?.contains(next) && !menu?.contains(next))) {
            setMegaOpen(null);
          }
        }}
        onMouseLeave={() =>
          setMegaOpen(null)
        }
      >
        {/* ======================================================
            DESKTOP UTILITY STRIP
            ====================================================== */}
        <div className={styles.utilityStrip}>
          <div className={styles.utilityInner}>
            <div className={styles.utilityLeft}>
              <AnnouncementTicker />
            </div>

            <div className={styles.utilityRight} role="region" aria-label={msg("nav.preferences")}>
              <Globe2
                size={15}
                strokeWidth={1.4}
              />

              <span>{t("EG")}</span>

              <span
                className={
                  styles.utilityDivider
                }
              />

              <button
                type="button"
                translate="no"
                data-no-translate
                aria-label={msg(isArabic ? "nav.switchEnglish" : "nav.switchArabic")}
                onClick={() =>
                  setLanguage(
                    isArabic
                      ? "en"
                      : "ar",
                  )
                }
              >
                {isArabic ? "ENG" : "AR"}
              </button>

              <span
                className={
                  styles.utilityDivider
                }
              />

              <strong>{t("EGP")}</strong>
            </div>
          </div>
        </div>

        {/* MOBILE PROMO BAR */}
        <div className={styles.mobileAnnouncement}>
          <AnnouncementTicker />
        </div>

        {/* ======================================================
            MAIN DESKTOP / MOBILE HEADER
            ====================================================== */}
        <header className={styles.mainBar} data-header-row>
          <div className={styles.mainInner}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label={t(copy.menu)}
              onClick={() => {
                setMobilePanel(null);
                setMenuOpen(true);
              }}
            >
              <Menu
                size={23}
                strokeWidth={1.45}
              />
            </button>

            <Link
              href="/"
              className={styles.logo}
              aria-label={t("Vi2 home")}
            >
              <Image
                src="/brand/vi2-logo-mark-black.png"
                alt={t("Vi2")}
                width={58}
                height={70}
                priority
              />
            </Link>

            <button
              type="button"
              className={styles.searchBar}
              ref={searchTriggerRef}
              onClick={openSearch}
              aria-label={msg("nav.search")}
            >
              <span>
                {t(copy.search)}
              </span>

              <Search
                size={22}
                strokeWidth={1.45}
              />
            </button>

            <div
              className={styles.accountWrap}
              ref={accountWrapRef}
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse" || accountOpen) return;
                setMegaOpen(null);
                accountOpenedByHover.current = true;
                setAccountOpen(true);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "mouse") return;
                accountOpenedByHover.current = false;
                setAccountOpen(false);
              }}
            >
              <button
                type="button"
                className={styles.account}
                ref={accountTriggerRef}
                aria-expanded={accountOpen}
                aria-haspopup="dialog"
                onClick={(event) => {
                  setMegaOpen(null);
                  const pinHover = event.detail > 0 && accountOpenedByHover.current;
                  accountOpenedByHover.current = false;
                  setAccountOpen((current) => pinHover || !current);
                }}
              >
                <UserRound
                  size={21}
                  strokeWidth={1.4}
                />

                <div>
                  {isAuthenticated ? (
                    <strong className={styles.customerName} title={displayName || msg("nav.account")}>
                      <bdi>{displayName || msg("nav.account")}</bdi>
                    </strong>
                  ) : (
                    <>
                      <span>{t(copy.account)}</span>
                      {!isLoading && <strong>{t(copy.signIn)}</strong>}
                    </>
                  )}
                </div>

                <ChevronDown
                  className={styles.accountChevron}
                  size={14}
                  strokeWidth={1.5}
                />
              </button>

              <AccountDropdown
                open={accountOpen}
                isArabic={isArabic}
                onClose={() =>
                  setAccountOpen(false)
                }
              />
            </div>

            <button
              type="button"
              className={styles.cart}
              data-cart-trigger
              aria-label={t(copy.cart)}
              onClick={() => {
                closeMenu();
                setMegaOpen(null);
                setAccountOpen(false);
                setSearchOpen(false);
                openCart();
              }}
            >
              <ShoppingBag
                size={24}
                strokeWidth={1.4}
              />

              {t(itemCount > 0 && (
                <span
                  className={
                    styles.cartCount
                  }
                >
                  {t(itemCount)}
                </span>
              ))}
            </button>
          </div>
        </header>

        {/* ======================================================
            DESKTOP CATEGORY ROW
            ====================================================== */}
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
                      document.getElementById("desktop-category-menu")?.querySelector<HTMLAnchorElement>("a")?.focus();
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
              <span
                className={
                  styles.categoryDivider
                }
              />

              <Link
                href="/brands"
                onMouseEnter={() =>
                  setMegaOpen("brands")
                }
                onFocus={() =>
                  setMegaOpen("brands")
                }
                onClick={() =>
                  setMegaOpen(null)
                }
              >
                {msg("nav.brands")}
              </Link>

              <Link href="/#health-goals">
                {msg("nav.health")}
              </Link>
              <Link
                href="/deals"
                className={styles.dealLink}
              >
                {msg("nav.deals")}
              </Link>
            </div>
          </div>
        </nav>

        <DesktopMegaMenu
          categories={directory.roots}
          active={megaOpen}
          onClose={() =>
            setMegaOpen(null)
          }
        />
      </div>

      {/* ======================================================
          MOBILE TWO-LEVEL CATALOG DRAWER
          Concept inspired by large catalog commerce navigation,
          styled completely in Vi2 cream / olive / black.
          ====================================================== */}
      <div
        className={
          menuOpen
            ? `${styles.drawerBackdrop} ${styles.drawerBackdropOpen}`
            : styles.drawerBackdrop
        }
        onMouseDown={closeMenu}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <aside data-no-translate
          ref={drawerRef}
          role="dialog"
          aria-modal={menuOpen ? true : undefined}
          aria-label={msg("nav.menu")}
          tabIndex={-1}
          className={
            menuOpen
              ? `${styles.drawer} ${styles.drawerOpen}`
              : styles.drawer
          }
          dir={
            isArabic
              ? "rtl"
              : "ltr"
          }
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* ROOT MENU HEADER */}
          <div className={styles.drawerHeader} inert={!!activeMobilePanel} aria-hidden={!!activeMobilePanel}>
            <Link
              href={
                isAuthenticated
                  ? "/account"
                  : "/account/sign-in"
              }
              className={styles.welcome}
              onClick={closeMenu}
            >
              <UserRound
                size={25}
                strokeWidth={1.45}
              />

              <strong>
                {isAuthenticated && displayName
                  ? isArabic
                    ? `مرحباً، ${displayName}`
                    : `Welcome, ${displayName}`
                  : t(copy.welcome)}
              </strong>
            </Link>

            <button
              type="button"
              className={styles.closeButton}
              onClick={closeMenu}
              aria-label={msg("nav.close")}
            >
              <X
                size={25}
                strokeWidth={1.4}
              />
            </button>
          </div>

          {/* ROOT MENU */}
          <div className={styles.drawerScroll} inert={!!activeMobilePanel} aria-hidden={!!activeMobilePanel}>
            <section className={styles.menuSection}>
              <span className={styles.sectionLabel}>
                {msg("nav.categories")}
              </span>

              <nav className={styles.primaryMenuList} aria-label={msg("nav.mainCategories")}>
                {!directory.roots.length && <CategoryStatus error={directory.error} loading={loadingCategories} retry={retryCategories} />}
                {t(primaryMobileCategories.map(
                  (item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={styles.primaryMenuButton}
                      onClick={event => {
                        mobilePanelOpenerRef.current = event.currentTarget;
                        setMobilePanel(item.key);
                      }}
                    >
                      <span>
                        {item.label}
                      </span>

                      <ChevronRight
                        size={20}
                        strokeWidth={1.45}
                      />
                    </button>
                  ),
                ))}
              </nav>
            </section>

            <section className={styles.menuSection}>
              <span className={styles.sectionLabel}>
                {t(copy.shopBy)}
              </span>

              <nav className={styles.simpleLinks} aria-label={msg("nav.shopBy")}>

                <button
                  type="button"
                  className={styles.simpleMenuButton}
                  onClick={event => {
                    if (brands === null || brands === "error") loadBrands();
                    openPanel("brands")(event);
                  }}
                >
                  <span className={styles.linkWithIcon}>
                    <Package
                      size={18}
                      strokeWidth={1.4}
                    />
                    {msg("nav.brands")}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </button>
                <button type="button" className={styles.simpleMenuButton} onClick={openPanel("health")}><span className={styles.linkWithIcon}><Sparkles size={18} strokeWidth={1.4} />{msg("nav.health")}</span><ChevronRight size={20} strokeWidth={1.5} /></button>

                <Link
                  href="/deals"
                  onClick={closeMenu}
                  className={styles.accentLink}
                >
                  <span className={styles.linkWithIcon}>
                    <BadgePercent
                      size={18}
                      strokeWidth={1.4}
                    />
                    {msg("nav.deals")}
                  </span>
                </Link>
              </nav>
            </section>

            <section className={styles.accountSection}>
              <Link
                href={
                  isAuthenticated
                    ? "/account/information"
                    : "/account/sign-in?next=/account/information"
                }
                onClick={closeMenu}
              >
                <UserRound
                  size={19}
                  strokeWidth={1.4}
                />
                {t(copy.account)}
              </Link>

              <Link
                href={
                  isAuthenticated
                    ? "/account/orders"
                    : "/account/sign-in?next=/account/orders"
                }
                onClick={closeMenu}
              >
                <Package
                  size={19}
                  strokeWidth={1.4}
                />
                {t(copy.orders)}
              </Link>

              <Link
                href={
                  isAuthenticated
                    ? "/account/points"
                    : "/account/sign-in?next=/account/points"
                }
                onClick={closeMenu}
              >
                <Sparkles
                  size={19}
                  strokeWidth={1.4}
                />
                {t(copy.rewards)}
              </Link>
            </section>

            <div className={styles.marketRow}>
              <Globe2
                size={20}
                strokeWidth={1.4}
              />

              <span>{t("EG")}</span>

              <span
                className={
                  styles.marketDivider
                }
              />

              <button
                type="button"
                translate="no"
                data-no-translate
                aria-label={msg(isArabic ? "nav.switchEnglish" : "nav.switchArabic")}
                onClick={() =>
                  setLanguage(
                    isArabic
                      ? "en"
                      : "ar",
                  )
                }
              >
                {isArabic ? "ENG" : "AR"}
              </button>

              <span
                className={
                  styles.marketDivider
                }
              />

              <strong>{t("EGP")}</strong>
            </div>

            {isAuthenticated ? (
              <button
                type="button"
                className={styles.drawerCta}
                onClick={() => {
                  signOut();
                  closeMenu();

                  window.location.href = localizedHref("/", language);
                }}
                style={{
                  width: "calc(100% - 36px)",
                  border: 0,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <LogOut size={16} strokeWidth={1.35} />
                {isArabic ? "تسجيل الخروج" : "LOG OUT"}
              </button>
            ) : (
              <Link
                href="/account/sign-in"
                className={styles.drawerCta}
                onClick={closeMenu}
              >
                {t(copy.create)}
              </Link>
            )}
          </div>

          {/* SECOND LEVEL PANEL */}
          <div
            key={mobilePanel ?? "root"}
            className={
              activeMobilePanel
                ? `${styles.subMenuPanel} ${styles.subMenuPanelOpen}`
                : styles.subMenuPanel
            }
            aria-hidden={!activeMobilePanel}
          >
            {t(activeMobilePanel && (
              <>
                <div className={styles.subMenuHeader}>
                  <button
                    type="button"
                    className={styles.backButton}
                    ref={mobilePanelBackRef}
                    onClick={() =>
                      setMobilePanel(null)
                    }
                  >
                    <ChevronLeft
                      size={22}
                      strokeWidth={1.45}
                    />

                    <span>
                      {msg("nav.back")}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={closeMenu}
                    aria-label={msg("nav.close")}
                  >
                    <X
                      size={25}
                      strokeWidth={1.4}
                    />
                  </button>
                </div>

                <div className={styles.subMenuScroll}>
                  <div className={styles.subMenuTitleRow}>
                    <h2>
                      {activeMobilePanel.title}
                    </h2>

                    <Link
                      href={
                        activeMobilePanel.shopAllHref
                      }
                      onClick={closeMenu}
                    >
                      {msg("nav.shopAll")}
                    </Link>
                  </div>

                  {mobilePanel === "brands" && !Array.isArray(brands) && (
                    <div className={styles.subMenuStatus} role="status">
                      <p>{msg(brands === "error" ? "nav.brandsError" : "nav.brandsLoading")}</p>
                      {brands === "error" && <button type="button" onClick={loadBrands}>{msg("catalog.retry")}</button>}
                    </div>
                  )}
                  {mobilePanel === "brands" && Array.isArray(brands) && !brands.length && (
                    <p className={styles.subMenuStatus} role="status">{msg("shop.noBrands")}</p>
                  )}
                  <nav className={styles.subMenuList} aria-label={activeMobilePanel.title}>
                    {t(activeMobilePanel.items.map(
                      ([label, href]) => (
                        <Link
                          key={`${label}-${href}`}
                          href={href}
                          onClick={closeMenu}
                        >
                          {label}
                        </Link>
                      ),
                    ))}
                  </nav>
                </div>
              </>
            ))}
          </div>
        </aside>
      </div>

      <GlobalSearch
        open={searchOpen}
        onClose={() =>
          setSearchOpen(false)
        }
        isArabic={isArabic}
      />

      <MobileBottomNav
        hidden={menuOpen}
      />
    </>
  );
}
