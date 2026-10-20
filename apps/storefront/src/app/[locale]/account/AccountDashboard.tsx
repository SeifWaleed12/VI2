"use client";

import { ArrowRight, PackageCheck, Star, UserRound } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useAuth } from "@/context/AuthContext";
import { ACCOUNT_ROUTES } from "@/lib/account-navigation";
import { accountMessage } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import styles from "./Account.module.css";

const tasks = [
  { section: "orders", description: "ordersDescription", Icon: PackageCheck },
  {
    section: "information",
    description: "informationDescription",
    Icon: UserRound,
  },
  { section: "points", description: "pointsDescription", Icon: Star },
] as const;

export default function AccountDashboard({ locale }: { locale: Locale }) {
  const { customer, isAuthenticated } = useAuth();
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  const name =
    isAuthenticated && customer
      ? customer.firstName?.trim() || customer.email.split("@")[0]
      : "";
  return (
    <>
      <div className={styles.overviewTop}>
        <section className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {name ? (
              Array.from(name)[0].toLocaleUpperCase(locale)
            ) : (
              <UserRound size={36} strokeWidth={1.4} />
            )}
          </span>
          <div className={styles.identityCopy}>
            <h2>
              {name ? (
                <>
                  {msg("welcome")} <bdi>{name}</bdi>
                </>
              ) : (
                msg("guestWelcome")
              )}
            </h2>
            <Link className={styles.textLink} href={ACCOUNT_ROUTES.information}>
              {msg("editInformation")}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section
          className={styles.pointsSummary}
          aria-labelledby="account-points-summary"
        >
          <Star size={38} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <h2 id="account-points-summary">{msg("points")}</h2>
            <p>{msg("pointsUnavailable")}</p>
          </div>
        </section>
      </div>
      <nav className={styles.taskGrid} aria-label={msg("accountNavigation")}>
        {tasks.map(({ section, description, Icon }) => (
          <Link
            className={styles.task}
            href={ACCOUNT_ROUTES[section]}
            key={section}
          >
            <Icon
              className={styles.taskIcon}
              size={32}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div>
              <h2>{msg(section)}</h2>
              <p>{msg(description)}</p>
            </div>
            <ArrowRight
              className={styles.taskArrow}
              size={22}
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>
    </>
  );
}
