"use client";

import {
  Home,
  Search,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import {
  usePathname,
} from "next/navigation";

import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

import styles from "./MobileBottomNav.module.css";

type Props = {
  onOpenSearch: () => void;
};

export default function MobileBottomNav({
  onOpenSearch,
}: Props) {
  const pathname =
    usePathname();

  const {
    itemCount,
    openCart,
  } = useCart();

  const { isArabic } = useLanguage();

  if (
    pathname.startsWith(
      "/products/",
    ) ||
    pathname.startsWith(
      "/checkout",
    ) ||
    pathname.startsWith(
      "/order/",
    )
  ) {
    return null;
  }

  const labels = isArabic
    ? {
        home: "الرئيسية",
        shop: "المتجر",
        search: "بحث",
        account: "حسابي",
        cart: "السلة",
      }
    : {
        home: "HOME",
        shop: "SHOP",
        search: "SEARCH",
        account: "ACCOUNT",
        cart: "CART",
      };

  /**
   * CartDrawer lives inside the shared Providers tree.
   *
   * A normal Next.js client-side route change keeps that tree mounted,
   * which also keeps an open cart drawer visible on top of the new page.
   *
   * Mobile bottom navigation therefore performs a document navigation
   * when leaving the cart. This resets the temporary cart-open UI state
   * while preserving cart ITEMS because those are already persisted by
   * CartContext/localStorage.
   */
  function goTo(
    href: string,
  ) {
    document.body.style.overflow =
      "";

    window.location.assign(
      href,
    );
  }

  /**
   * Search needs the same reset after Cart, but should still open the
   * existing GlobalSearch UI after the reload.
   */
  function openSearchSafely() {
    try {
      window.sessionStorage.setItem(
        "vi2-open-global-search",
        "1",
      );
    } catch {
      // Search can still fall back to the shop page.
    }

    document.body.style.overflow =
      "";

    window.location.assign(
      pathname || "/",
    );
  }

  return (
    <nav
      className={styles.nav}
      aria-label="Mobile navigation"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <button
        type="button"
        className={
          pathname === "/"
            ? styles.active
            : ""
        }
        onClick={() =>
          goTo("/")
        }
      >
        <Home
          size={18}
          strokeWidth={1.45}
        />

        <span>
          {labels.home}
        </span>
      </button>

      <button
        type="button"
        className={
          pathname.startsWith(
            "/shop",
          )
            ? styles.active
            : ""
        }
        onClick={() =>
          goTo("/shop")
        }
      >
        <Store
          size={18}
          strokeWidth={1.45}
        />

        <span>
          {labels.shop}
        </span>
      </button>

      <button
        type="button"
        onClick={
          openSearchSafely
        }
      >
        <Search
          size={19}
          strokeWidth={1.45}
        />

        <span>
          {labels.search}
        </span>
      </button>

      <button
        type="button"
        className={
          pathname.startsWith(
            "/account",
          )
            ? styles.active
            : ""
        }
        onClick={() =>
          goTo("/account/sign-in")
        }
      >
        <UserRound
          size={18}
          strokeWidth={1.45}
        />

        <span>
          {labels.account}
        </span>
      </button>

      <button
        type="button"
        className={styles.cart}
        onClick={openCart}
      >
        <ShoppingBag
          size={18}
          strokeWidth={1.45}
        />

        {itemCount > 0 && (
          <strong>
            {itemCount}
          </strong>
        )}

        <span>
          {labels.cart}
        </span>
      </button>
    </nav>
  );
}
