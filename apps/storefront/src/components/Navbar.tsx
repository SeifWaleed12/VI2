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

import styles from "./Navbar.module.css";


type MobileCatalogKey =
  | "vitamins"
  | "sports"
  | "botanicals"
  | "beauty"
  | "kids"
  | "health";

export default function Navbar() {
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

  const { customer, signOut } = useAuth();
  const accountFirstName = customer?.firstName?.trim() ?? "";

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
          "شحن مجاني للطلبات فوق ٢٬٥٠٠ جنيه",
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
          "الأكثر مبيعًا",
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
          "FREE SHIPPING ON ORDERS OVER 2,500 EGP",
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
          "Best Sellers",
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

  const mobileCatalog = {
    vitamins: {
      title: isArabic
        ? "الفيتامينات والمعادن"
        : "Vitamins & Minerals",
      shopAllHref:
        "/shop?category=Vitamins",
      items: isArabic
        ? [
            ["الفيتامينات المتعددة", "/shop?q=Multivitamin"],
            ["فيتامين C", "/shop?q=Vitamin%20C"],
            ["فيتامين D3 و K2", "/shop?q=Vitamin%20D3"],
            ["فيتامينات B المركبة", "/shop?q=B-Complex"],
            ["المغنيسيوم", "/shop?q=Magnesium"],
            ["الزنك", "/shop?q=Zinc"],
            ["الحديد", "/shop?q=Iron"],
            ["الكالسيوم", "/shop?q=Calcium"],
          ]
        : [
            ["Multivitamins", "/shop?q=Multivitamin"],
            ["Vitamin C", "/shop?q=Vitamin%20C"],
            ["Vitamin D3 & K2", "/shop?q=Vitamin%20D3"],
            ["B-Complex", "/shop?q=B-Complex"],
            ["Magnesium (Glycinate, Citrate)", "/shop?q=Magnesium"],
            ["Zinc", "/shop?q=Zinc"],
            ["Iron", "/shop?q=Iron"],
            ["Calcium", "/shop?q=Calcium"],
          ],
    },

    sports: {
      title: isArabic
        ? "التغذية الرياضية"
        : "Sports Nutrition",
      shopAllHref:
        "/shop?goal=Muscle%20%26%20Recovery",
      items: isArabic
        ? [
            ["بروتين مصل اللبن", "/shop?category=Protein"],
            ["البروتين النباتي", "/shop?q=Plant%20Protein"],
            ["كرياتين مونوهيدرات", "/shop?category=Creatine"],
            ["مكملات ما قبل التمرين", "/shop?category=Pre-Workout"],
            ["BCAA / EAA", "/shop?q=BCAA"],
            ["جلوتامين", "/shop?q=Glutamine"],
            ["ماس جينر", "/shop?category=Mass%20Gainer"],
            ["الإلكتروليتات", "/shop?q=Electrolytes"],
          ]
        : [
            ["Whey Protein (Isolate, Concentrate)", "/shop?category=Protein"],
            ["Plant Protein", "/shop?q=Plant%20Protein"],
            ["Creatine Monohydrate", "/shop?category=Creatine"],
            ["Pre-Workouts", "/shop?category=Pre-Workout"],
            ["BCAAs / EAAs", "/shop?q=BCAA"],
            ["Glutamine", "/shop?q=Glutamine"],
            ["Mass Gainers", "/shop?category=Mass%20Gainer"],
            ["Electrolytes", "/shop?q=Electrolytes"],
          ],
    },

    botanicals: {
      title: isArabic
        ? "المكملات والمستخلصات النباتية"
        : "Supplements & Botanicals",
      shopAllHref: "/shop",
      items: isArabic
        ? [
            ["أوميجا 3 وزيوت السمك", "/shop?q=Omega"],
            ["البروبيوتك والبريبيوتك", "/shop?q=Probiotic"],
            ["ببتيدات الكولاجين", "/shop?q=Collagen"],
            ["أشواجاندا", "/shop?q=Ashwagandha"],
            ["حليب الشوك", "/shop?q=Milk%20Thistle"],
            ["مستخلصات الفطر", "/shop?q=Mushroom"],
            ["CoQ10", "/shop?q=CoQ10"],
            ["الكركمين", "/shop?q=Curcumin"],
          ]
        : [
            ["Omega-3 & Fish Oils", "/shop?q=Omega"],
            ["Probiotics & Prebiotics", "/shop?q=Probiotic"],
            ["Collagen Peptides", "/shop?q=Collagen"],
            ["Ashwagandha", "/shop?q=Ashwagandha"],
            ["Milk Thistle", "/shop?q=Milk%20Thistle"],
            ["Mushroom Extracts", "/shop?q=Mushroom"],
            ["CoQ10", "/shop?q=CoQ10"],
            ["Curcumin", "/shop?q=Curcumin"],
          ],
    },

    beauty: {
      title: isArabic
        ? "الجمال وصحة البشرة"
        : "Beauty & Skin Wellness",
      shopAllHref:
        "/shop?q=Collagen",
      items: isArabic
        ? [
            ["بيوتين", "/shop?q=Biotin"],
            ["حمض الهيالورونيك", "/shop?q=Hyaluronic"],
            ["كولاجين بحري", "/shop?q=Marine%20Collagen"],
            ["تركيبات مقاومة الشيخوخة", "/shop?q=Anti-Aging"],
            ["تركيبات الشعر والبشرة والأظافر", "/shop?q=Hair%20Skin%20Nails"],
          ]
        : [
            ["Biotin", "/shop?q=Biotin"],
            ["Hyaluronic Acid", "/shop?q=Hyaluronic"],
            ["Marine Collagen", "/shop?q=Marine%20Collagen"],
            ["Anti-Aging Formulas", "/shop?q=Anti-Aging"],
            ["Hair, Skin & Nails Blends", "/shop?q=Hair%20Skin%20Nails"],
          ],
    },

    kids: {
      title: isArabic
        ? "صحة الأطفال والرضع"
        : "Baby & Kids Health",
      shopAllHref:
        "/shop?q=Kids",
      items: isArabic
        ? [
            ["قطرات D3 / بروبيوتك للرضع", "/shop?q=D3"],
            ["فيتامينات متعددة للأطفال", "/shop?q=Multivitamin"],
            ["دعم التسنين", "/shop?q=Teething"],
            ["DHA للأطفال", "/shop?q=DHA"],
          ]
        : [
            ["Infant Drops (D3 / Probiotics)", "/shop?q=D3"],
            ["Children's Multivitamin Gummies", "/shop?q=Multivitamin"],
            ["Teething Support", "/shop?q=Teething"],
            ["DHA for Kids", "/shop?q=DHA"],
          ],
    },

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
  } satisfies Record<
    MobileCatalogKey,
    {
      title: string;
      shopAllHref: string;
      items: string[][];
    }
  >;

  const primaryMobileCategories: {
    key: MobileCatalogKey;
    label: string;
  }[] = [
    {
      key: "vitamins",
      label: isArabic
        ? "الفيتامينات والمعادن"
        : "Vitamins & Minerals",
    },
    {
      key: "sports",
      label: copy.sports,
    },
    {
      key: "botanicals",
      label: isArabic
        ? "المكملات والمستخلصات النباتية"
        : "Supplements & Botanicals",
    },
    {
      key: "beauty",
      label: isArabic
        ? "الجمال وصحة البشرة"
        : "Beauty & Skin Wellness",
    },
    {
      key: "kids",
      label: isArabic
        ? "صحة الأطفال والرضع"
        : "Baby & Kids Health",
    },
  ];

  const activeMobilePanel =
    mobilePanel
      ? mobileCatalog[mobilePanel]
      : null;

  const topMessages = isArabic
    ? [
        copy.freeShipping,
        "جودة عالية",
        "نتائج حقيقية",
        "علامات موثوقة",
        "غد أكثر صحة",
      ]
    : [
        copy.freeShipping,
        "HIGH QUALITY",
        "REAL RESULTS",
        "TRUSTED BRANDS",
        "A HEALTHIER TOMORROW",
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
                        {t(topMessages.map(
                          (
                            message,
                            index,
                          ) => (
                            <span
                              key={`${group}-${message}`}
                              className={
                                styles.topMarqueeItem
                              }
                            >
                              {t(message)}

                              {t(index <
                                topMessages.length -
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
                    {t(topMessages.map(
                      (
                        message,
                        index,
                      ) => (
                        <span
                          key={`${group}-${message}`}
                          className={
                            styles.topMarqueeItem
                          }
                        >
                          {t(message)}

                          {t(index <
                            topMessages.length -
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
                    {t(accountFirstName ||
                      copy.signIn)}
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
              <button
                type="button"
                className={
                  megaOpen === "supplements"
                    ? styles.categoryTriggerActive
                    : styles.categoryTrigger
                }
                onMouseEnter={() =>
                  setMegaOpen("supplements")
                }
                onFocus={() =>
                  setMegaOpen("supplements")
                }
                onClick={() =>
                  setMegaOpen(
                    megaOpen === "supplements"
                      ? null
                      : "supplements",
                  )
                }
              >
                {t(copy.supplements)}
              </button>

              <button
                type="button"
                className={
                  megaOpen === "sports"
                    ? styles.categoryTriggerActive
                    : styles.categoryTrigger
                }
                onMouseEnter={() =>
                  setMegaOpen("sports")
                }
                onFocus={() =>
                  setMegaOpen("sports")
                }
                onClick={() =>
                  setMegaOpen(
                    megaOpen === "sports"
                      ? null
                      : "sports",
                  )
                }
              >
                {t(copy.sports)}
              </button>

              <button
                type="button"
                className={
                  megaOpen === "vitamins"
                    ? styles.categoryTriggerActive
                    : styles.categoryTrigger
                }
                onMouseEnter={() =>
                  setMegaOpen("vitamins")
                }
                onFocus={() =>
                  setMegaOpen("vitamins")
                }
                onClick={() =>
                  setMegaOpen(
                    megaOpen === "vitamins"
                      ? null
                      : "vitamins",
                  )
                }
              >
                {t(copy.vitamins)}
              </button>

              <button
                type="button"
                className={
                  megaOpen === "wellness"
                    ? styles.categoryTriggerActive
                    : styles.categoryTrigger
                }
                onMouseEnter={() =>
                  setMegaOpen("wellness")
                }
                onFocus={() =>
                  setMegaOpen("wellness")
                }
                onClick={() =>
                  setMegaOpen(
                    megaOpen === "wellness"
                      ? null
                      : "wellness",
                  )
                }
              >
                {t(copy.wellness)}
              </button>

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
                accountFirstName
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
                {t(accountFirstName
                  ? isArabic
                    ? `مرحباً، ${accountFirstName}`
                    : `Welcome, ${accountFirstName}`
                  : copy.welcome)}
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
                    {t(copy.health)}
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
                  accountFirstName
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
                  accountFirstName
                    ? "/account"
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
                  accountFirstName
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

            {t(accountFirstName ? (
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
                }}
              >
                {t(isArabic
                  ? "تسجيل الخروج"
                  : "LOG OUT")}
              </button>
            ) : (
              <Link
                href="/account/sign-in"
                className={styles.drawerCta}
                onClick={closeMenu}
              >
                {t(copy.create)}
              </Link>
            ))}
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
