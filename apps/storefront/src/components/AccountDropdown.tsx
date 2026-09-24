"use client";

import Link from "next/link";
import {
  ArrowRight,
  Heart,
  LogOut,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import styles from "./AccountDropdown.module.css";

type Props = {
  open: boolean;
  isArabic: boolean;
  onClose: () => void;
};

export default function AccountDropdown({
  open,
  isArabic,
  onClose,
}: Props) {
  const { customer, isAuthenticated, signOut: authSignOut } = useAuth();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!open) return;

    try {
      const raw = window.localStorage.getItem("vi2-last-order");
      if (!raw) {
        setPoints(0);
      } else {
        const order = JSON.parse(raw) as { total?: number };
        setPoints(Math.floor(Number(order.total ?? 0) / 10));
      }
    } catch {
      setPoints(0);
    }
  }, [open]);

  if (!open) return null;

  const user = customer
    ? {
        fullName:
          `${customer.firstName} ${customer.lastName}`.trim() || customer.email,
        email: customer.email,
      }
    : null;

  const copy = isArabic
    ? {
        rewards: "مكافآت Vi2",
        points: "نقطة",
        rewardBody:
          "اجمع النقاط مع المشتريات المؤهلة واحصل على مزايا للأعضاء.",
        learn: "عرض حسابك",
        welcome: user ? "مرحباً بعودتك" : "مرحباً بك في Vi2",
        account: "حسابي",
        orders: "طلباتي",
        rewardsMenu: "مكافآتي",
        buyAgain: "اشترِ مرة أخرى",
        favourites: "المفضلة",
        signIn: "تسجيل الدخول / إنشاء حساب",
        signOut: "تسجيل الخروج",
      }
    : {
        rewards: "VI2 REWARDS",
        points: "POINTS",
        rewardBody:
          "Earn points on eligible purchases and unlock member benefits over time.",
        learn: "VIEW ACCOUNT",
        welcome: user ? "WELCOME BACK" : "WELCOME TO VI2",
        account: "My Account",
        orders: "My Orders",
        rewardsMenu: "My Rewards",
        buyAgain: "Buy It Again",
        favourites: "My Favourites",
        signIn: "SIGN IN / CREATE ACCOUNT",
        signOut: "SIGN OUT",
      };

  function handleSignOut() {
    authSignOut();
    onClose();
    window.location.href = "/";
  }

  return (
    <div
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

        <strong>{new Intl.NumberFormat("en-EG").format(points)}</strong>

        <small>{copy.points}</small>

        <p>{copy.rewardBody}</p>

        <Link href="/account" onClick={onClose}>
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
          <Link href="/account" onClick={onClose}>
            <UserRound size={17} strokeWidth={1.35} />
            {copy.account}
          </Link>

          <Link href="/account#orders" onClick={onClose}>
            <PackageCheck size={17} strokeWidth={1.35} />
            {copy.orders}
          </Link>

          <Link href="/account#rewards" onClick={onClose}>
            <Star size={17} strokeWidth={1.35} />
            {copy.rewardsMenu}
          </Link>

          <Link href="/account#reorder" onClick={onClose}>
            <RotateCcw size={17} strokeWidth={1.35} />
            {copy.buyAgain}
          </Link>

          <Link href="/account#saved" onClick={onClose}>
            <Heart size={17} strokeWidth={1.35} />
            {copy.favourites}
          </Link>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleSignOut}
          >
            <LogOut size={16} strokeWidth={1.35} />
            {copy.signOut}
          </button>
        ) : (
          <Link
            href="/account/sign-in"
            className={styles.actionButton}
            onClick={onClose}
          >
            {copy.signIn}
          </Link>
        )}
      </section>
    </div>
  );
}
