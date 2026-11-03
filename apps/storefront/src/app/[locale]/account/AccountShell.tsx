"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Home,
  LogOut,
  PackageCheck,
  Star,
  UserRound,
  ChevronDown,
} from "lucide-react";
import Link from "@/components/LocaleLink";
import { useAuth } from "@/context/AuthContext";
import { ACCOUNT_ROUTES, type AccountSection } from "@/lib/account-navigation";
import { accountMessage } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import styles from "./Account.module.css";

export const ACCOUNT_ITEMS = [
  { section: "dashboard", Icon: Home },
  { section: "orders", Icon: PackageCheck },
  { section: "information", Icon: UserRound },
  { section: "points", Icon: Star },
] as const;

export default function AccountShell({
  section,
  locale,
  children,
}: {
  section: AccountSection;
  locale: Locale;
  children: ReactNode;
}) {
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    setError(false);
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setError(true);
    } finally {
      setSigningOut(false);
    }
  }
  const links = ACCOUNT_ITEMS.map(({ section: destination, Icon }) => (
    <Link
      key={destination}
      href={ACCOUNT_ROUTES[destination]}
      aria-current={destination === section ? "page" : undefined}
    >
      <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
      <span>{msg(destination)}</span>
    </Link>
  ));
  const signOutButton = isAuthenticated && (
    <button
      type="button"
      className={styles.signOut}
      onClick={logout}
      disabled={signingOut}
    >
      <LogOut size={21} strokeWidth={1.5} aria-hidden="true" />
      {msg(signingOut ? "signingOut" : "signOut")}
    </button>
  );
  return (
    <main
      className={styles.page}
      data-no-translate
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>{msg("account")}</p>
          <nav
            className={styles.accountLinks}
            aria-label={msg("accountNavigation")}
          >
            {links}
          </nav>
          {signOutButton}
        </aside>
        <div className={styles.content}>
          <nav
            className={styles.breadcrumb}
            aria-label={msg("accountNavigation")}
          >
            <Link href={ACCOUNT_ROUTES.dashboard}>{msg("account")}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{msg(section)}</span>
          </nav>
          <h1>{msg(section === "dashboard" ? "account" : section)}</h1>
          {section !== "dashboard" && (
            <details
              className={styles.mobileMenu}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary>
                {msg(section)}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <nav
                className={styles.accountLinks}
                aria-label={msg("accountNavigation")}
              >
                {links}
              </nav>
            </details>
          )}
          {error && (
            <p className={styles.notice} role="alert">
              {msg("signOutError")}
            </p>
          )}
          {isLoading ? (
            <p className={styles.notice} role="status">
              {msg("loading")}
            </p>
          ) : (
            <>
              {!isAuthenticated && (
                <section
                  className={styles.guestNotice}
                  aria-label={msg("signInTitle")}
                >
                  <div>
                    <h2>{msg("signInTitle")}</h2>
                    <p>{msg("signInDescription")}</p>
                  </div>
                  <Link
                    className={styles.darkButton}
                    href={
                      "/account/sign-in?next=" +
                      encodeURIComponent(ACCOUNT_ROUTES[section])
                    }
                  >
                    {msg("signIn")}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </section>
              )}
              {children}
            </>
          )}
          <div className={styles.mobileSignOut}>{signOutButton}</div>
        </div>
      </div>
    </main>
  );
}
