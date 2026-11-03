"use client";

import { useEffect } from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { ACCOUNT_ROUTES, type AccountSection } from "@/lib/account-navigation";
import type { Locale } from "@/lib/i18n";
import AccountShell from "./AccountShell";
import AccountDashboard from "./AccountDashboard";
import AccountInformation from "./AccountInformation";
import AccountOrders from "./AccountOrders";
import AccountPoints from "./AccountPoints";

export default function AccountClient({
  locale = "en",
  section = "dashboard",
  selectedOrder = "",
}: {
  locale?: Locale;
  section?: AccountSection;
  selectedOrder?: string;
}) {
  const router = useLocaleRouter();
  useEffect(() => {
    if (section !== "dashboard") return;
    const destination =
      window.location.hash === "#orders"
        ? ACCOUNT_ROUTES.orders
        : window.location.hash === "#rewards"
          ? ACCOUNT_ROUTES.points
          : null;
    if (destination)
      router.replace(destination + window.location.search, { scroll: true });
  }, [router, section]);
  return (
    <AccountShell locale={locale} section={section}>
      {section === "dashboard" && <AccountDashboard locale={locale} />}
      {section === "information" && <AccountInformation locale={locale} />}
      {section === "orders" && (
        <AccountOrders locale={locale} selectedOrder={selectedOrder} />
      )}
      {section === "points" && <AccountPoints locale={locale} />}
    </AccountShell>
  );
}
