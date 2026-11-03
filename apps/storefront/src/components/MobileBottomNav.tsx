"use client";

import {
  Home,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import {
  usePathname,
} from "next/navigation";

import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

import { localizedHref } from "@/lib/i18n";
import styles from "./MobileBottomNav.module.css";

type Props = {
  hidden?: boolean;
};

export default function MobileBottomNav({
  hidden = false,
}: Props) {
  const pathname =
    usePathname().replace(/^\/(en|ar)(?=\/|$)/, "") || "/";

  const { isArabic, language, msg } = useLanguage();
  const { isAuthenticated } = useAuth();

  if (
    hidden ||
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

  const labels = { home: msg("nav.home"), shop: msg("nav.shopShort"), search: msg("nav.searchShort"), account: msg("nav.account") };

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

    window.location.assign(
      localizedHref(href, language),
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


    window.location.assign(
      localizedHref(pathname,language) + window.location.search + window.location.hash,
    );
  }

  return (
    <nav
      className={styles.nav}
      data-no-translate
      aria-label={msg("nav.mobile")}
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
          goTo(
            isAuthenticated
              ? "/account"
              : "/account/sign-in",
          )
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

    </nav>
  );
}
