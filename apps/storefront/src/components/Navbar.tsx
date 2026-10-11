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
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  useRef,
} from "react";

import GlobalSearch from "@/components/GlobalSearch";
import MobileBottomNav from "@/components/MobileBottomNav";
import DesktopMegaMenu, { type MegaMenuKey } from "@/components/DesktopMegaMenu";
import AccountDropdown from "@/components/AccountDropdown";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

import { type CategoryDirectory, categoryHref, flattenCategories } from "@/lib/category-tree";
import { getCategoryTree } from "@/lib/medusa/services/categories";
import CategoryStatus from "@/components/CategoryStatus";

import styles from "./Navbar.module.css";


type MobileCatalogKey = string;

export default function Navbar({ initialDirectory = { roots: [], error: false } }: { initialDirectory?: CategoryDirectory }) {
  const { t, msg } = useLanguage();
  const [directory, setDirectory] = useState(initialDirectory);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const focusMenuOnOpen = useRef(false);
  async function retryCategories() {
    setLoadingCategories(true);
    try { setDirectory({ roots: await getCategoryTree(language), error: false }); }
    catch { setDirectory({ roots: [], error: true }); }
    finally { setLoadingCategories(false); }
  }
  useEffect(() => { setDirectory(initialDirectory); }, [initialDirectory]);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--vi2-header-bottom", `${header.getBoundingClientRect().bottom}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header);
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

      if (document.getElementById("desktop-category-menu")?.contains(document.activeElement)) {
        headerRef.current?.querySelector<HTMLButtonElement>('[aria-controls="desktop-category-menu"][aria-expanded="true"]')?.focus();
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

  useEffect(() => {
    if (megaOpen && focusMenuOnOpen.current) {
      document.getElementById("desktop-category-menu")?.querySelector<HTMLAnchorElement>("a")?.focus();
      focusMenuOnOpen.current = false;
    }
  }, [megaOpen]);

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

  const healthCatalog = {
    health: {
      title: isArabic
        ? "الأهداف الصحية"
        : "Health Goals",
      shopAllHref:
        "/#health-goals",
      items: isArabic
        ? [
            ["العافية العامة وطول العمر", "/shop?goal=Daily%20Wellness"],
            ["المناعة والدعم الموسمي", "/shop?goal=Immune%20Support"],
            ["الهضم والتمثيل الغذائي", "/shop?goal=Gut%20Health"],
            ["القلب والدماغ والدورة الدموية", "/shop?goal=Heart%20Health"],
            ["العظام والمفاصل والعضلات", "/shop?goal=Muscle%20%26%20Recovery"],
            ["النوم والمزاج", "/shop?goal=Stress%20%26%20Sleep"],
            ["مراحل الحياة", "/shop?goal=Daily%20Wellness"],
            ["أنظمة الجسم والجمال", "/shop?goal=Daily%20Wellness"],
          ]
        : [
            ["General Wellness & Longevity", "/shop?goal=Daily%20Wellness"],
            ["Immune & Seasonal Support", "/shop?goal=Immune%20Support"],
            ["Digestion & Metabolism", "/shop?goal=Gut%20Health"],
            ["Heart, Brain & Circulation", "/shop?goal=Heart%20Health"],
            ["Bone, Joint & Pain", "/shop?goal=Muscle%20%26%20Recovery"],
            ["Mind, Sleep & Mood", "/shop?goal=Stress%20%26%20Sleep"],
            ["Demographics & Stage of Life", "/shop?goal=Daily%20Wellness"],
            ["Specific Body Systems & Aesthetics", "/shop?goal=Daily%20Wellness"],
          ],
    },
  };
  const primaryMobileCategories = directory.roots.map(c => ({ key: c.id, label: c.name }));
  const selectedCategory = directory.roots.find(c => c.id === mobilePanel);
  const activeMobilePanel = mobilePanel === "health" ? healthCatalog.health : selectedCategory ? {
    title: selectedCategory.name,
    shopAllHref: categoryHref(selectedCategory.id),
    items: flattenCategories(selectedCategory.children).map(c => [c.name, categoryHref(c.id)]),
  } : null;

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
        ref={headerRef}
        data-no-translate
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
            </div>

            <div className={styles.categoryPromos}>
              <Link
                href="/deals"
                className={styles.dealLink}
              >
                {msg("nav.deals")}
              </Link>

              <Link href="/#best-sellers">
                {msg("nav.shop")}
              </Link>

              <Link href="/shop">
                {msg("nav.new")}
              </Link>

              <Link
                href="/#value-sets"
                className={styles.bundleLink}
              >
                {msg("nav.bundles")}
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
        <aside data-no-translate
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
              aria-label={msg("nav.close")}
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
                {msg("nav.categories")}
              </span>

              <nav className={styles.primaryMenuList}>
                {!directory.roots.length && <CategoryStatus error={directory.error} loading={loadingCategories} retry={retryCategories} />}
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

              <nav className={styles.simpleLinks}>
                <button
                  type="button"
                  className={styles.simpleMenuButton}
                  onClick={() =>
                    setMobilePanel("health")
                  }
                >
                  <span className={styles.linkWithIcon}>
                    <Sparkles
                      size={18}
                      strokeWidth={1.4}
                    />
                    {msg("nav.health")}
                  </span>

                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                  />
                </button>

                <Link
                  href="/brands"
                  onClick={closeMenu}
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
                    {msg("nav.deals")}
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
                    {msg("nav.shop")}
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
                    {msg("nav.bundles")}
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

                  <nav className={styles.subMenuList}>
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
        onOpenSearch={openSearch}
      />
    </>
  );
}
