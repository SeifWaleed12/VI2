"use client";

import Link from "@/components/LocaleLink";
import { ACCOUNT_ROUTES } from "@/lib/account-navigation";
import { accountMessage } from "@/lib/account-copy";
import { localizedHref } from "@/lib/i18n";
import {
  ArrowRight,
  LogOut,
  PackageCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import styles from "./AccountDropdown.module.css";

type Props = {
  open: boolean;
  isArabic: boolean;
  onClose: () => void;
};

export default function AccountDropdown({ open, isArabic, onClose }: Props) {
  const { customer, isAuthenticated, signOut: authSignOut } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  // Loyalty is not implemented; show a placeholder rather than an invented balance.
  const points = "—";

  useEffect(() => {
    if (!open) return;

    try {
      window.localStorage.removeItem("vi2-last-order");
    } catch {
      /* Storage may be disabled. */
    }
  }, [open]);

  if (!open) return null;

  const displayName = customer
    ? customer.firstName?.trim() || customer.email?.split("@")[0] || ""
    : "";

  const user = customer
    ? {
        fullName:
          [customer.firstName, customer.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          customer.firstName ||
          customer.email.split("@")[0],
        email: customer.email,
        firstName: displayName,
      }
    : null;

  const copy = isArabic
    ? {
        rewards: "مكافآت Vi2",
        points: "نقطة",
        rewardBody: accountMessage(isArabic ? "ar" : "en", "pointsUnavailable"),
        learn: "عرض حسابك",
        welcome: user ? `مرحباً، ${user.firstName}` : "مرحباً بك في Vi2",
        account: "حسابي",
        orders: "طلباتي",
        rewardsMenu: "مكافآتي",
        signIn: "تسجيل الدخول / إنشاء حساب",
        signOut: "تسجيل الخروج",
      }
    : {
        rewards: "VI2 REWARDS",
        points: "POINTS",
        rewardBody: accountMessage(isArabic ? "ar" : "en", "pointsUnavailable"),
        learn: "VIEW ACCOUNT",
        welcome: user
          ? `WELCOME, ${user.firstName.toUpperCase()}`
          : "WELCOME TO VI2",
        account: "My Account",
        orders: "My Orders",
        rewardsMenu: "My Rewards",
        signIn: "SIGN IN / CREATE ACCOUNT",
        signOut: "SIGN OUT",
      };

  async function handleSignOut() {
    setLogoutError("");
    try {
      await authSignOut();
      onClose();
      window.location.href = localizedHref("/", isArabic ? "ar" : "en");
    } catch {
      setLogoutError(accountMessage(isArabic ? "ar" : "en", "signOutError"));
    }
  }

  return (
    <div
      data-no-translate
      className={styles.dropdown}
      role="dialog"
      aria-label={copy.welcome}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <section className={styles.rewardsPanel}>
        <div className={styles.rewardIcon}>
          <Sparkles size={21} strokeWidth={1.35} />
        </div>

        <span>{copy.rewards}</span>

        <strong>{points}</strong>

        <small>{copy.points}</small>

        <p>{copy.rewardBody}</p>

        <Link href={ACCOUNT_ROUTES.information} onClick={onClose}>
          {copy.learn}
          <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </section>

      <section className={styles.menuPanel}>
        <span className={styles.welcomeText}>{copy.welcome}</span>

        {user && (
          <div className={styles.signedInIdentity}>
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
        )}

        <div className={styles.menuLinks}>
          <Link href={ACCOUNT_ROUTES.information} onClick={onClose}>
            <UserRound size={17} strokeWidth={1.35} />
            {copy.account}
          </Link>

          <Link href={ACCOUNT_ROUTES.orders} onClick={onClose}>
            <PackageCheck size={17} strokeWidth={1.35} />
            {copy.orders}
          </Link>

          <Link href={ACCOUNT_ROUTES.points} onClick={onClose}>
            <Star size={17} strokeWidth={1.35} />
            {copy.rewardsMenu}
          </Link>
        </div>

        <div className={styles.actionWrap}>
          {logoutError && <p role="alert">{logoutError}</p>}
          {isAuthenticated ? (
            <Button
              variant="dark"
              size="md"
              fullWidth
              onClick={handleSignOut}
              icon={<LogOut size={16} strokeWidth={1.4} />}
            >
              {copy.signOut}
            </Button>
          ) : (
            <Button
              href="/account/sign-in"
              variant="olive"
              size="md"
              fullWidth
              onClick={onClose}
              icon={<ArrowRight size={15} strokeWidth={1.5} />}
              iconPosition="right"
            >
              {copy.signIn}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
