"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountMessage } from "@/lib/account-copy";
import { accountDate } from "@/lib/account-format";
import type { Locale } from "@/lib/i18n";
import { getPoints, type Points } from "@/lib/medusa";
import styles from "./Account.module.css";

type Key = Parameters<typeof accountMessage>[1];
const KIND: Record<Points["history"][number]["kind"], Key> = { earn: "pointsEarn", refund: "pointsRefund", expire: "pointsExpired" };
const number = (value: number, locale: Locale) => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG").format(value);

// The signed-in customer's Vi2 Points: null while loading, false on failure,
// "signed-out" once sign-in has settled without a customer.
export function usePoints(attempt = 0) {
  const { customer, isAuthenticated, isLoading } = useAuth();
  const customerId = isAuthenticated ? customer?.id : undefined;
  const [loaded, setLoaded] = useState<{ owner: string; attempt: number; points: Points | false } | null>(null);
  useEffect(() => {
    if (!customerId) return;
    let active = true;
    getPoints().then((result) => {
      if (active) setLoaded({ owner: customerId, attempt, points: result.ok ? result.points : false });
    });
    return () => {
      active = false;
    };
  }, [customerId, attempt]);
  if (!customerId) return isLoading ? null : "signed-out";
  return loaded && loaded.owner === customerId && loaded.attempt === attempt ? loaded.points : null;
}

export const formatPoints = (value: number, locale: Locale) => `${number(value, locale)} ${accountMessage(locale, "pointsUnit")}`;

export default function AccountPoints({ locale }: { locale: Locale }) {
  const [attempt, setAttempt] = useState(0);
  const points = usePoints(attempt);
  const msg = (key: Key) => accountMessage(locale, key);
  // The account shell shows the sign-in notice.
  if (points === "signed-out") return null;
  if (points === null) return <p className={styles.notice} role="status">{msg("pointsLoading")}</p>;
  if (points === false)
    return (
      <section className={styles.emptyState}>
        <Star size={36} strokeWidth={1.5} aria-hidden="true" />
        <h2 role="alert">{msg("pointsError")}</h2>
        <button type="button" className={styles.outlineButton} onClick={() => setAttempt((value) => value + 1)}>{msg("retry")}</button>
      </section>
    );
  return (
    <div className={styles.information}>
      <section className={styles.pointsSummary} aria-labelledby="points-balance">
        <Star size={38} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h2 id="points-balance">{msg("pointsBalance")}: <bdi>{formatPoints(points.balance, locale)}</bdi></h2>
          {points.expires_at && <p>{msg("pointsExpire")} {accountDate(points.expires_at, locale)}</p>}
          {points.pending > 0 && <p>{msg("pointsPending")}: <bdi>{formatPoints(points.pending, locale)}</bdi>. {msg("pointsPendingHelp")}</p>}
          <p>{msg("pointsSpendSoon")}</p>
        </div>
      </section>
      <section className={styles.informationRow} aria-labelledby="points-history">
        <h2 id="points-history">{msg("pointsHistory")}</h2>
        {points.history.length === 0 ? (
          <p className={styles.notice}>{msg("pointsEmpty")}</p>
        ) : (
          <ul className={styles.items}>
            {points.history.map((entry) => (
              <li key={entry.id}>
                <span>{msg(KIND[entry.kind])}</span>{" "}
                <strong><bdi dir="ltr">{entry.points > 0 ? "+" : ""}{number(entry.points, locale)}</bdi></strong>{" "}
                <span>{accountDate(entry.created_at, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
