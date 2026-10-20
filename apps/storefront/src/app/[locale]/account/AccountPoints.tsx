import { Star } from "lucide-react";
import Link from "@/components/LocaleLink";
import { ACCOUNT_ROUTES } from "@/lib/account-navigation";
import { accountMessage } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import styles from "./Account.module.css";

export default function AccountPoints({ locale }: { locale: Locale }) {
  return (
    <section className={styles.emptyState}>
      <Star size={36} strokeWidth={1.5} aria-hidden="true" />
      <h2>{accountMessage(locale, "pointsUnavailable")}</h2>
      <p>{accountMessage(locale, "rewardsBody")}</p>
      <Link className={styles.outlineButton} href={ACCOUNT_ROUTES.dashboard}>
        {accountMessage(locale, "backToAccount")}
      </Link>
    </section>
  );
}
