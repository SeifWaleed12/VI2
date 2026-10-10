"use client";
import { useLanguage } from "@/context/LanguageContext";


import Image from "next/image";
import Link from "next/link";
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
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import GlobalSearch from "@/components/GlobalSearch";
import MobileBottomNav from "@/components/MobileBottomNav";
import DesktopMegaMenu, { type MegaMenuKey } from "@/components/DesktopMegaMenu";
import AccountDropdown from "@/components/AccountDropdown";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

import { useCategories } from "@/providers/category-provider"
import { categoryLinks } from "@/lib/category-navigation"
import CategoryStatus from "./category-status"

import styles from "./Navbar.module.css";


type MobileCatalogKey = string

export default function Navbar() {
  const { categories } = useCategories()
  const { t } = useLanguage();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const { language, setLanguage } = useLanguage();

  const [megaOpen, setMegaOpen] =
    useState<MegaMenuKey | null>(null);

  const [accountOpen, setAccountOpen] =
    useState(false);

  const { customer, isAuthenticated, signOut } = useAuth();
  const displayName = customer
    ? customer.firstName?.trim() || customer.email?.split("@")[0] || ""
    : "";

  const [mobilePanel, setMobilePanel] =
    useState<MobileCatalogKey | null>(null);

  const {
    itemCount,
    openCart,
  } = useCart();

  const isArabic =
    language === "ar";

  useEffect(() => {
    document.body.style.overflow =
      menuOpen
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [menuOpen]);


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

  function closeMenu() {
    setMenuOpen(false);
    setMobilePanel(null);
  }

  function openSearch() {
    setMenuOpen(false);
    setMegaOpen(null);
    setAccountOpen(false);
    setSearchOpen(true);
  }

  const copy = isArabic
    ? {
        freeShipping:
          "تسوق المكملات بالجنيه المصري",
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
        freeShipping:
          "SHOP SUPPLEMENTS IN EGP",
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

  const primaryMobileCategories = categories.map((category) => ({
    key: category.id,
    label: category.name,
  }))
  const activeCategory = categories.find((category) => category.id === mobilePanel)
  const activeMobilePanel = activeCategory ? {
    title: activeCategory.name,
    shopAllHref: activeCategory.href,
    items: categoryLinks(activeCategory).map((item) => [item.label, item.href]),
  } : null

  const topMessages = isArabic
    ? [
        copy.freeShipping,
        "فيتامينات ومعادن",
        "اكتشف المنتجات",
        "تغذية رياضية",
        "العربية والإنجليزية",
      ]
    : [
        copy.freeShipping,
        "VITAMINS & MINERALS",
        "EXPLORE THE COLLECTION",
        "SPORTS NUTRITION",
        "ENGLISH & ARABIC",
      ];

  const topTickerMessages = [
    ...topMessages,
    ...topMessages,
  ];

  return (
    <>
      <header
        className={styles.header}
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
              <Link href="/deals">
                <BadgePercent
                  size={14}
                  strokeWidth={1.45}
                />

                <span>
                  {t(copy.flash)}
                </span>

                <strong>{t("24H PICKS")}</strong>

                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                />
              </Link>

              <span
                className={
                  styles.utilityDivider
                }
              />

              <div
                className={
                  styles.topMarquee
                }
                aria-label={
                  t(copy.freeShipping)
                }
              >
                <div
                  className={
                    styles.topMarqueeTrack
                  }
                >
                  {t([0, 1].map(
                    (group) => (
                      <div
                        key={
                          group
                        }
                        className={
                          styles.topMarqueeGroup
                        }
                        aria-hidden={
                          group === 1
                        }
                      >
                        {t(topTickerMessages.map(
                          (
                            message,
                            index,
                          ) => (
                            <span
                              key={`${group}-${index}-${message}`}
                              className={
                                styles.topMarqueeItem
                              }
                            >
                              {t(message)}

                              {t(index <
                                topTickerMessages.length -
                                  1 && (
                                <i
                                  aria-hidden="true"
                                />
                              ))}
                            </span>
                          ),
                        ))}
                      </div>
                    ),
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.utilityRight}>
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
                onClick={() =>
                  setLanguage(
                    isArabic
                      ? "en"
                      : "ar",
                  )
                }
              >
                {t(isArabic
                  ? "EN"
                  : "AR")}
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
          <div
            className={
              styles.topMarquee
            }
            aria-label={
              t(copy.freeShipping)
            }
          >
            <div
              className={
                styles.topMarqueeTrack
              }
            >
              {t([0, 1].map(
                (group) => (
                  <div
                    key={
                      group
                    }
                    className={
                      styles.topMarqueeGroup
                    }
                    aria-hidden={
                      group === 1
                    }
                  >
                    {t(topTickerMessages.map(
                      (
                        message,
                        index,
                      ) => (
                        <span
                          key={`${group}-${index}-${message}`}
                          className={
                            styles.topMarqueeItem
                          }
                        >
                          {t(message)}

                          {t(index <
                            topTickerMessages.length -
                              1 && (
                            <i
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                      ),
                    ))}
                  </div>
                ),
              ))}
            </div>
          </div>
        </div>

        {/* ======================================================
            MAIN DESKTOP / MOBILE HEADER
            ====================================================== */}
        <div className={styles.mainBar}>
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
              onClick={openSearch}
              aria-label={t("Search Vi2")}
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
              onMouseEnter={() => {
                setMegaOpen(null);
                setAccountOpen(true);
              }}
              onMouseLeave={() =>
                setAccountOpen(false)
              }
            >
              <button
                type="button"
                className={styles.account}
                aria-expanded={accountOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setMegaOpen(null);
                  setAccountOpen(
                    (current) => !current,
                  );
                }}
              >
                <UserRound
                  size={21}
                  strokeWidth={1.4}
                />

                <div>
                  <span>
                    {t(copy.account)}
                  </span>

                  <strong>
                    {isAuthenticated && displayName
                      ? displayName
                      : t(copy.signIn)}
                  </strong>
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
              aria-label={t(copy.cart)}
              onClick={openCart}
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
        </div>

        {/* ======================================================
            DESKTOP CATEGORY ROW
            ====================================================== */}
        <nav className={styles.desktopCategories}>
          <div className={styles.categoryInner}>
            <div className={styles.categoryMain}>
              <CategoryStatus />
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={megaOpen === category.id ? styles.categoryTriggerActive : styles.categoryTrigger}
                  aria-expanded={megaOpen === category.id}
                  aria-haspopup="true"
                  onMouseEnter={() => setMegaOpen(category.id)}
                  onFocus={() => setMegaOpen(category.id)}
                  onClick={() => setMegaOpen(megaOpen === category.id ? null : category.id)}
                >
                  {t(category.name)}
                </button>
              ))}
              <Link href="/categories" onMouseEnter={() => setMegaOpen(null)} onFocus={() => setMegaOpen(null)} onClick={() => setMegaOpen(null)}>
                {isArabic ? "كل الفئات" : "All categories"}
              </Link>

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
                {t(copy.brands)}
              </Link>

              <Link href="/#health-goals">
                {t(copy.health)}
              </Link>
            </div>

            <div className={styles.categoryPromos}>
              <Link
                href="/deals"
                className={styles.dealLink}
              >
                {t(copy.deals)}
              </Link>

              <Link href="/#best-sellers">
                {t(copy.best)}
              </Link>

              <Link href="/shop">
                {t(copy.new)}
              </Link>

              <Link
                href="/#value-sets"
                className={styles.bundleLink}
              >
                {t(copy.bundles)}
              </Link>
            </div>
          </div>
        </nav>

        <DesktopMegaMenu
          active={megaOpen}
          onClose={() =>
            setMegaOpen(null)
          }
        />
      </header>

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
      >
        <aside
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
          <div className={styles.drawerHeader}>
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
              aria-label={t("Close menu")}
            >
              <X
                size={25}
                strokeWidth={1.4}
              />
            </button>
          </div>

          {/* ROOT MENU */}
          <div className={styles.drawerScroll}>
            <section className={styles.menuSection}>
              <span className={styles.sectionLabel}>
                {t(copy.categories)}
              </span>

              <nav className={styles.primaryMenuList}>
                <CategoryStatus />
                <Link href="/categories" className={styles.primaryMenuButton} onClick={closeMenu}>
                  <span>{isArabic ? "كل الفئات" : "All categories"}</span>
                  <ChevronRight size={20} strokeWidth={1.45} />
                </Link>
                {t(primaryMobileCategories.map(
                  (item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={styles.primaryMenuButton}
                      onClick={() =>
                        setMobilePanel(item.key)
                      }
                    >
                      <span>
                        {t(item.label)}
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

              <nav className={styles.simpleLinks}>
                <Link
                  href="/#health-goals"
                  className={styles.simpleMenuButton}
                  onClick={closeMenu}
                >
                  <span className={styles.linkWithIcon}>
                    <Sparkles
                      size={18}
                      strokeWidth={1.4}
                    />
                    {t(copy.health)}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </Link>

                <Link
                  href="/brands"
                  onClick={closeMenu}
                >
                  <span className={styles.linkWithIcon}>
                    <Package
                      size={18}
                      strokeWidth={1.4}
                    />
                    {t(copy.brands)}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </Link>

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
                    {t(copy.deals)}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </Link>

                <Link
                  href="/#best-sellers"
                  onClick={closeMenu}
                >
                  <span className={styles.linkWithIcon}>
                    <Trophy
                      size={18}
                      strokeWidth={1.4}
                    />
                    {t(copy.best)}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </Link>

                <Link
                  href="/#value-sets"
                  onClick={closeMenu}
                >
                  <span className={styles.linkWithIcon}>
                    <ShoppingBag
                      size={18}
                      strokeWidth={1.4}
                    />
                    {t(copy.bundles)}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </Link>
              </nav>
            </section>

            <section className={styles.accountSection}>
              <Link
                href={
                  isAuthenticated
                    ? "/account"
                    : "/account/sign-in?next=/account"
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
                    ? "/account#orders"
                    : "/account/sign-in?next=/account"
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
                    ? "/account#rewards"
                    : "/account/sign-in?next=/account%23rewards"
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
                onClick={() =>
                  setLanguage(
                    isArabic
                      ? "en"
                      : "ar",
                  )
                }
              >
                {t(isArabic
                  ? "EN"
                  : "AR")}
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

                  window.location.href = "/";
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
                    onClick={() =>
                      setMobilePanel(null)
                    }
                  >
                    <ChevronLeft
                      size={22}
                      strokeWidth={1.45}
                    />

                    <span>
                      {t(isArabic
                        ? "رجوع"
                        : "Back")}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={closeMenu}
                    aria-label={t("Close menu")}
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
                      {t(activeMobilePanel.title)}
                    </h2>

                    <Link
                      href={
                        activeMobilePanel.shopAllHref
                      }
                      onClick={closeMenu}
                    >
                      {t(isArabic
                        ? "عرض الكل"
                        : "Shop all")}
                    </Link>
                  </div>

                  <nav className={styles.subMenuList}>
                    {t(activeMobilePanel.items.map(
                      ([label, href]) => (
                        <Link
                          key={`${label}-${href}`}
                          href={href}
                          onClick={closeMenu}
                        >
                          {t(label)}
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
        onOpenSearch={openSearch}
      />
    </>
  );
}
