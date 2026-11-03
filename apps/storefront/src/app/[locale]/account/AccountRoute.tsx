import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { accountMessage } from "@/lib/account-copy";
import type { AccountSection } from "@/lib/account-navigation";
import AccountClient from "./AccountClient";

export type AccountPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
export async function accountMetadata(
  props: AccountPageProps,
  section: AccountSection,
): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  return {
    title:
      accountMessage(locale, section === "dashboard" ? "account" : section) +
      " | Vi2",
    robots: { index: false, follow: false },
  };
}
export async function accountPage(
  props: AccountPageProps,
  section: AccountSection,
) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const query = await props.searchParams;
  return (
    <AccountClient
      locale={locale}
      section={section}
      selectedOrder={typeof query?.order === "string" ? query.order : ""}
    />
  );
}
